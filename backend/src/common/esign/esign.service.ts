import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DocumentStatus, ESignStatus, Prisma } from '@prisma/client';
import { NotifyService } from '../notify/notify.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../../modules/settings/settings.service';
import { ESIGN_PROVIDERS, ESignProvider } from './esign-provider.interface';
import { ESIGN_TERMINAL, ESignStatusValue, ESignWebhookEvent } from './esign.types';

/**
 * Vendor-agnostic e-sign orchestrator. Persists provider-independent
 * ESignRequest rows, dispatches to the configured provider adapter, and applies
 * normalized webhook events. The active provider is chosen at runtime from
 * config (DOCS_ESIGN_PROVIDER setting -> ESIGN_PROVIDER env -> 'mock').
 */
@Injectable()
export class ESignService {
  private readonly logger = new Logger(ESignService.name);
  private readonly registry = new Map<string, ESignProvider>();

  constructor(
    @Inject(ESIGN_PROVIDERS) providers: ESignProvider[],
    private prisma: PrismaService,
    private settings: SettingsService,
    private notify: NotifyService,
  ) {
    for (const p of providers) this.registry.set(p.name, p);
  }

  private async activeProviderName(): Promise<string> {
    const configured = await this.settings.get('DOCS_ESIGN_PROVIDER');
    return (configured || process.env.ESIGN_PROVIDER || 'mock').toLowerCase();
  }

  private provider(name: string): ESignProvider {
    const p = this.registry.get(name);
    if (!p) throw new BadRequestException(`e-sign provider "${name}" is not implemented`);
    return p;
  }

  private audit(existing: Prisma.JsonValue | null, event: string, status: string): Prisma.InputJsonValue {
    const prev = Array.isArray(existing) ? (existing as unknown[]) : [];
    return [...prev, { at: new Date().toISOString(), event, status }] as Prisma.InputJsonValue;
  }

  /** Start an e-sign request for a paid document. */
  async createForDocument(userId: string, documentId: string) {
    if (!(await this.settings.getBool('DOCS_ESIGN_ENABLED', false))) {
      throw new ForbiddenException('e-sign is currently disabled');
    }
    const doc = await this.prisma.customerDocument.findFirst({
      where: { id: documentId, userId },
      select: { id: true, status: true, pdfUrl: true, contentHtml: true },
    });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.status === DocumentStatus.DRAFT || !doc.contentHtml) {
      throw new BadRequestException('Pay for the document before requesting e-sign');
    }

    const providerName = await this.activeProviderName();
    const provider = this.provider(providerName);

    const req = await this.prisma.eSignRequest.create({
      data: {
        provider: providerName,
        documentId,
        userId,
        status: ESignStatus.PENDING,
        auditLog: this.audit(null, 'created', 'PENDING'),
      },
    });

    try {
      const res = await provider.create({
        requestId: req.id,
        documentId,
        documentUrl: doc.pdfUrl,
      });
      await this.prisma.eSignRequest.update({
        where: { id: req.id },
        data: {
          providerRequestId: res.providerRequestId,
          status: res.status as unknown as ESignStatus,
          auditLog: this.audit(req.auditLog, 'provider.create', res.status),
        },
      });
      return {
        id: req.id,
        provider: providerName,
        status: res.status,
        signingUrl: res.signingUrl ?? null,
      };
    } catch (err) {
      this.logger.warn(`e-sign create failed for ${req.id}: ${(err as Error).message}`);
      await this.prisma.eSignRequest.update({
        where: { id: req.id },
        data: { status: ESignStatus.FAILED, auditLog: this.audit(req.auditLog, 'provider.error', 'FAILED') },
      });
      throw new BadRequestException('Could not start the e-sign request');
    }
  }

  /** Provider-independent status for the frontend (never exposes the vendor internals). */
  async getStatus(userId: string, id: string) {
    const req = await this.prisma.eSignRequest.findFirst({
      where: { id, userId },
      select: { id: true, provider: true, status: true, signedDocumentUrl: true, updatedAt: true },
    });
    if (!req) throw new NotFoundException('e-sign request not found');
    return req;
  }

  /** Generic webhook entry point - identifies the owning provider, then applies the event. */
  async handleWebhook(payload: unknown) {
    let event: ESignWebhookEvent | null = null;
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

    const req = await this.prisma.eSignRequest.findFirst({
      where: { providerRequestId: event.providerRequestId, provider: providerName ?? undefined },
    });
    if (!req) return { ok: false, reason: 'unknown request' };

    // Idempotency: terminal states are never re-applied.
    if (ESIGN_TERMINAL.includes(req.status as ESignStatusValue)) {
      return { ok: true, status: req.status, idempotent: true };
    }
    await this.applyEvent(req.id, req.documentId, req.userId, req.auditLog, event);
    return { ok: true, status: event.status };
  }

  /** Dev/testing only: fire a mock webhook for a request owned by the caller. */
  async simulate(userId: string, id: string, outcome: string) {
    const req = await this.prisma.eSignRequest.findFirst({ where: { id, userId } });
    if (!req) throw new NotFoundException('e-sign request not found');
    if (req.provider !== 'mock') {
      throw new BadRequestException('Simulation is only available for the mock provider');
    }
    return this.handleWebhook({ providerRequestId: req.providerRequestId, outcome });
  }

  private async applyEvent(
    id: string,
    documentId: string,
    userId: string,
    prevAudit: Prisma.JsonValue | null,
    event: ESignWebhookEvent,
  ) {
    await this.prisma.eSignRequest.update({
      where: { id },
      data: {
        status: event.status as unknown as ESignStatus,
        signedDocumentUrl: event.signedDocumentUrl,
        callbackPayload: event as unknown as Prisma.InputJsonValue,
        auditLog: this.audit(prevAudit, 'webhook', event.status),
      },
    });
    if (event.status === 'SIGNED') {
      await this.prisma.customerDocument
        .update({ where: { id: documentId }, data: { eSigned: true } })
        .catch(() => undefined);
      await this.notify.notifyUser(userId, 'DOCUMENT_ESIGNED', {
        title: 'Your document has been e-signed',
        body: 'The signed copy is available in My Documents.',
      });
    }
  }
}
