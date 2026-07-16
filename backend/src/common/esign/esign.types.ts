/** Normalized statuses shared by every e-sign provider (mirror of Prisma ESignStatus). */
export type ESignStatusValue =
  | 'PENDING'
  | 'SENT'
  | 'AWAITING_SIGNATURE'
  | 'SIGNED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'FAILED'
  | 'CANCELLED';

export const ESIGN_TERMINAL: ESignStatusValue[] = [
  'SIGNED',
  'REJECTED',
  'EXPIRED',
  'FAILED',
  'CANCELLED',
];

export interface ESignCreateInput {
  requestId: string; // our ESignRequest.id (use as provider reference / idempotency key)
  documentId: string;
  documentUrl: string | null; // storage key or URL of the PDF to sign
  signerEmail?: string;
  signerName?: string;
}

export interface ESignCreateResult {
  providerRequestId: string;
  status: ESignStatusValue;
  signingUrl?: string;
}

export interface ESignWebhookEvent {
  providerRequestId: string;
  status: ESignStatusValue;
  signedDocumentUrl?: string;
}
