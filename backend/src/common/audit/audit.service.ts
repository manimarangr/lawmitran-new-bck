import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { requestContext } from './request-context';

export interface AuditEntry {
  entityType?: string;
  entityId?: string;
  summary: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  /** Append-only; actor/ip/user-agent come from the request context. Never throws. */
  async log(action: string, entry: AuditEntry) {
    try {
      const ctx = requestContext.getStore();
      await this.prisma.auditLog.create({
        data: {
          actorId: ctx?.userId ?? null,
          action,
          entityType: entry.entityType ?? null,
          entityId: entry.entityId ?? null,
          summary: entry.summary,
          oldValue: (entry.oldValue ?? undefined) as
            Prisma.InputJsonValue | undefined,
          newValue: (entry.newValue ?? undefined) as
            Prisma.InputJsonValue | undefined,
          ip: ctx?.ip ?? null,
          userAgent: ctx?.userAgent?.slice(0, 300) ?? null,
        },
      });
    } catch (err) {
      this.logger.warn(
        `audit log failed [${action}]: ${(err as Error).message}`,
      );
    }
  }
}
