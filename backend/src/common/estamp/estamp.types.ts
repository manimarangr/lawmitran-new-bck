/** Normalized statuses shared by every e-stamp provider (mirror of Prisma EStampStatus). */
export type EStampStatusValue =
  | 'PENDING'
  | 'SENT'
  | 'PAID'
  | 'STAMPED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'FAILED'
  | 'CANCELLED';

export const ESTAMP_TERMINAL: EStampStatusValue[] = [
  'STAMPED',
  'REJECTED',
  'EXPIRED',
  'FAILED',
  'CANCELLED',
];

export interface EStampCreateInput {
  requestId: string;
  documentId: string;
  stateCode: string;
  amount: number;
}

export interface EStampCreateResult {
  providerRequestId: string;
  status: EStampStatusValue;
}

export interface EStampWebhookEvent {
  providerRequestId: string;
  status: EStampStatusValue;
  certificateNumber?: string;
  certificateUrl?: string;
}
