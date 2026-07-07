import { authFetch } from './client';

export interface CreateReportInput {
  leadId?: string;
  reportedUserId?: string;
  reason: string;
  details?: string;
}

/** Report a counterparty — pass leadId to auto-resolve the other party. */
export function createReport(input: CreateReportInput) {
  return authFetch('/reports', { method: 'POST', body: JSON.stringify(input) });
}
