import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ESignProvider } from '../../esign-provider.interface';
import {
  ESignCreateInput,
  ESignCreateResult,
  ESignStatusValue,
  ESignWebhookEvent,
} from '../../esign.types';

/**
 * Mock e-sign provider for end-to-end testing without any external vendor.
 * `create` returns an AWAITING_SIGNATURE state and a local signing URL. Outcomes
 * are driven by a webhook payload `{ providerRequestId, outcome }`, which the
 * ESignService can fire via its /simulate endpoint - no external calls.
 */
@Injectable()
export class MockESignProvider implements ESignProvider {
  readonly name = 'mock';

  async create(input: ESignCreateInput): Promise<ESignCreateResult> {
    const providerRequestId = `mock_esign_${randomUUID()}`;
    return {
      providerRequestId,
      status: 'AWAITING_SIGNATURE',
      signingUrl: `/mock/esign/${providerRequestId}?ref=${input.requestId}`,
    };
  }

  parseWebhook(payload: unknown): ESignWebhookEvent | null {
    const p = payload as { providerRequestId?: string; outcome?: string } | null;
    if (!p?.providerRequestId) return null;
    const map: Record<string, ESignStatusValue> = {
      signed: 'SIGNED',
      rejected: 'REJECTED',
      timeout: 'EXPIRED',
      expired: 'EXPIRED',
      failed: 'FAILED',
      cancelled: 'CANCELLED',
    };
    const status = map[(p.outcome ?? 'signed').toLowerCase()] ?? 'SIGNED';
    return {
      providerRequestId: p.providerRequestId,
      status,
      signedDocumentUrl:
        status === 'SIGNED' ? `/mock/esign/${p.providerRequestId}/signed.pdf` : undefined,
    };
  }
}
