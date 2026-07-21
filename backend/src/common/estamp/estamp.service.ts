import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DeliveryType,
  DocumentStatus,
  EStampStatus,
  Prisma,
} from '@prisma/client';
import { NotifyService } from '../notify/notify.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../../modules/settings/settings.service';
import { ESTAMP_PROVIDERS, EStampProvider } from './estamp-provider.interface';
import {
  ESTAMP_TERMINAL,
  EStampStatusValue,
  EStampWebhookEvent,
} from './estamp.types';

/**
 * Vendor-agnostic e-stamp orchestrator. Mirrors ESignService: persists
 * provider-independent EStampRequest rows, dispatches to the configured
 * provider, and applies normalized webhook events. Provider chosen at runtime
 * from config (DOCS_ESTAMP_PROVIDER setting -> ESTAMP_PROVIDER env -> 'mock').
 */
@Injectable()
export class EStampService {
  private readonly logger = new Logger(EStampService.name);
  private readonly registry = new Map<string, EStampProvider>();

  constructor(
    @Inject(ESTAMP_PROVIDERS) providers: EStampProvider[],
    private prisma: PrismaService,
    private settings: SettingsService,
    private notify: NotifyService,
  ) {
    for (const p of providers) this.registry.set(p.name, p);
  }

  private async activeProviderName(): Promise<string> {
    const configured = await this.settings.get('DOCS_ESTAMP_PROVIDER');
    return (configured || process.env.ESTAMP_PROVIDER || 'mock').toLowerCase();
  }

  private provider(name: string): EStampProvider {
    const p = this.registry.get(name);
    if (!p)
      throw new BadRequestException(
        `e-stamp provider "${name}" is not implemented`,
      );
    return p;
  }

  private audit(
    existing: Prisma.JsonValue | null,
    event: string,
    status: string,
  ): Prisma.InputJsonValue {
    const prev = Array.isArray(existing) ? (existing as unknown[]) : [];
    return [
      ...prev,
      { at: new Date().toISOString(), event, status },
    ] as Prisma.InputJsonValue;
  }

  async createForDocument(
    userId: string,
    documentId: string,
    opts: { stateCode?: string; amount?: number },
  ) {
    if (!(await this.settings.getBool('DOCS_ESTAMP_ENABLED', false))) {
      throw new ForbiddenException('e-stamp is currently disabled');
    }
    const stateCode = opts.stateCode?.trim().toUpperCase();
    if (!stateCode) throw new BadRequestException('stateCode is required');

    const doc = await this.prisma.customerDocument.findFirst({
      where: { id: documentId, userId },
      select: { id: true, status: true, contentHtml: true, stampDuty: true },
    });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.status === DocumentStatus.DRAFT || !doc.contentHtml) {
      throw new BadRequestException('Pay for the document before e-stamping');
    }
    const amount = opts.amount ?? (doc.stampDuty ? Number(doc.stampDuty) : 0);

    const providerName = await this.activeProviderName();
    const provider = this.provider(providerName);

    const req = await this.prisma.eStampRequest.create({
      data: {
        provider: providerName,
        stateCode,
        documentId,
        userId,
        amount,
        status: EStampStatus.PENDING,
        auditLog: this.audit(null, 'created', 'PENDING'),
      },
    });

    try {
      const res = await provider.create({
        requestId: req.id,
        documentId,
        stateCode,
        amount,
      });
      await this.prisma.eStampRequest.update({
        where: { id: req.id },
        data: {
          providerRequestId: res.providerRequestId,
          status: res.status,
          auditLog: this.audit(req.auditLog, 'provider.create', res.status),
        },
      });
      return { id: req.id, provider: providerName, status: res.status, amount };
    } catch (err) {
      this.logger.warn(
        `e-stamp create failed for ${req.id}: ${(err as Error).message}`,
      );
      await this.prisma.eStampRequest.update({
        where: { id: req.id },
        data: {
          status: EStampStatus.FAILED,
          auditLog: this.audit(req.auditLog, 'provider.error', 'FAILED'),
        },
      });
      throw new BadRequestException('Could not start the e-stamp request');
    }
  }

  async getStatus(userId: string, id: string) {
    const req = await this.prisma.eStampRequest.findFirst({
      where: { id, userId },
      select: {
        id: true,
        provider: true,
        status: true,
        stateCode: true,
        amount: true,
        certificateNumber: true,
        certificateUrl: true,
        updatedAt: true,
      },
    });
    if (!req) throw new NotFoundException('e-stamp request not found');
    return req;
  }

  async handleWebhook(payload: unknown) {
    let event: EStampWebhookEvent | null = null;
    let providerName: string | null = null;
    for (const [name, prov] of this.registry) {
      const parsed = prov.parseWebhook(payload);
      if (parsed) {
        event = parsed;
        providerName = name;
        break;
      }
    }
    if (!event) return { ok: false, reason: 'unrecognized payload' };

    const req = await this.prisma.eStampRequest.findFirst({
      where: {
        providerRequestId: event.providerRequestId,
        provider: providerName ?? undefined,
      },
    });
    if (!req) return { ok: false, reason: 'unknown request' };
    if (ESTAMP_TERMINAL.includes(req.status)) {
      return { ok: true, status: req.status, idempotent: true };
    }
    await this.applyEvent(
      req.id,
      req.documentId,
      req.userId,
      req.auditLog,
      event,
    );
    return { ok: true, status: event.status };
  }

  async simulate(userId: string, id: string, outcome: string) {
    const req = await this.prisma.eStampRequest.findFirst({
      where: { id, userId },
    });
    if (!req) throw new NotFoundException('e-stamp request not found');
    if (req.provider !== 'mock') {
      throw new BadRequestException(
        'Simulation is only available for the mock provider',
      );
    }
    return this.handleWebhook({
      providerRequestId: req.providerRequestId,
      outcome,
    });
  }

  private async applyEvent(
    id: string,
    documentId: string,
    userId: string,
    prevAudit: Prisma.JsonValue | null,
    event: EStampWebhookEvent,
  ) {
    await this.prisma.eStampRequest.update({
      where: { id },
      data: {
        status: event.status,
        certificateNumber: event.certificateNumber,
        certificateUrl: event.certificateUrl,
        callbackPayload: event as unknown as Prisma.InputJsonValue,
        auditLog: this.audit(prevAudit, 'webhook', event.status),
      },
    });
    if (event.status === 'STAMPED') {
      await this.prisma.customerDocument
        .update({
          where: { id: documentId },
          data: { eStamped: true, deliveryType: DeliveryType.ESTAMP },
        })
        .catch(() => undefined);
      await this.notify.notifyUser(userId, 'DOCUMENT_ESTAMPED', {
        title: 'Your document has been e-stamped',
        body: 'The stamped copy is available in My Documents.',
      });
    }
  }
}
