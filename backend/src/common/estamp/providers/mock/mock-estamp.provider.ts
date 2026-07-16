import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { EStampProvider } from '../../estamp-provider.interface';
import {
  EStampCreateInput,
  EStampCreateResult,
  EStampStatusValue,
  EStampWebhookEvent,
} from '../../estamp.types';

/**
 * Mock e-stamp provider for end-to-end testing without any external vendor.
 * `create` returns a SENT state; outcomes are driven by a webhook payload
 * `{ providerRequestId, outcome }` fired via EStampService.simulate.
 */
@Injectable()
export class MockEStampProvider implements EStampProvider {
  readonly name = 'mock';

  async create(input: EStampCreateInput): Promise<EStampCreateResult> {
    return {
      providerRequestId: `mock_estamp_${randomUUID()}`,
      status: 'SENT',
    };
  }

  parseWebhook(payload: unknown): EStampWebhookEvent | null {
    const p = payload as { providerRequestId?: string; outcome?: string } | null;
    if (!p?.providerRequestId) return null;
    const map: Record<string, EStampStatusValue> = {
      stamped: 'STAMPED',
      paid: 'PAID',
      rejected: 'REJECTED',
      timeout: 'EXPIRED',
      expired: 'EXPIRED',
      failed: 'FAILED',
      cancelled: 'CANCELLED',
    };
    const status = map[(p.outcome ?? 'stamped').toLowerCase()] ?? 'STAMPED';
    if (status === 'STAMPED') {
      return {
        providerRequestId: p.providerRequestId,
        status,
        certificateNumber: `MOCK-${p.providerRequestId.slice(-8).toUpperCase()}`,
        certificateUrl: `/mock/estamp/${p.providerRequestId}/certificate.pdf`,
      };
    }
    return { providerRequestId: p.providerRequestId, status };
  }
}
