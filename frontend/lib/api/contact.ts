import { authFetch } from './client';
import { API_BASE } from './base';
import type { Paginated } from '@/types/pagination';


export const CONTACT_CATEGORIES: { value: string; label: string }[] = [
  { value: 'PAYMENT_ISSUE', label: 'Payment issue' },
  { value: 'ID_CARD_UPLOAD_ISSUE', label: 'ID card upload issue' },
  { value: 'ACCOUNT_ISSUE', label: 'Account / login issue' },
  { value: 'SUBSCRIPTION_ISSUE', label: 'Subscription / plan issue' },
  { value: 'LEAD_ISSUE', label: 'Lead / requirement issue' },
  { value: 'VERIFICATION_ISSUE', label: 'Lawyer verification issue' },
  { value: 'TECHNICAL_ISSUE', label: 'Technical problem' },
  { value: 'OTHER', label: 'Something else' },
];

export const categoryLabel = (value: string) =>
  CONTACT_CATEGORIES.find((c) => c.value === value)?.label ?? value;

export interface ContactInput {
  name: string;
  email: string;
  mobile?: string;
  category: string;
  subject?: string;
  message: string;
}

/** Public — no login required. */
export async function submitContactQuery(input: ContactInput) {
  const res = await fetch(`${API_BASE}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
  if (!res.ok) {
    const msg = Array.isArray(body.message) ? body.message[0] : body.message;
    throw new Error(msg ?? 'Could not send your query');
  }
  return body as { id: string; received: boolean };
}

// ---- Admin ----
export interface AdminContactQuery {
  id: string;
  name: string;
  email: string;
  mobile: string | null;
  category: string;
  subject: string | null;
  message: string;
  status: 'OPEN' | 'RESOLVED';
  adminNote: string | null;
  createdAt: string;
}

export function fetchContactQueries(
  status?: 'OPEN' | 'RESOLVED',
  q?: string,
  page = 1,
  pageSize = 20,
) {
  const qs = new URLSearchParams();
  if (status) qs.set('status', status);
  if (q) qs.set('q', q);
  qs.set('page', String(page));
  qs.set('pageSize', String(pageSize));
  return authFetch<Paginated<AdminContactQuery>>(`/contact/admin?${qs}`);
}

export function updateContactQuery(
  id: string,
  data: { status?: 'OPEN' | 'RESOLVED'; adminNote?: string },
) {
  return authFetch<AdminContactQuery>(`/contact/admin/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
