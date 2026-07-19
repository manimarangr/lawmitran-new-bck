import { authFetch } from './client';
import { API_BASE } from './base';
import type { Paginated } from '@/types/pagination';


/**
 * Build-time safety: server-side fetches get a hard timeout so a slow or
 * unreachable API fails fast (and the caller's fallback kicks in) instead of
 * hanging Next.js static generation until its 60s export budget expires.
 */
const SERVER_FETCH_TIMEOUT_MS = 6000;
function withTimeout(init?: RequestInit): RequestInit {
  return { ...init, signal: AbortSignal.timeout(SERVER_FETCH_TIMEOUT_MS) };
}

// ---- types ----

export interface TemplateField {
  name: string;
  label: string;
  type?: 'text' | 'textarea' | 'date' | 'number' | 'select' | 'toggle' | 'checkbox' | 'state';
  /** This numeric answer is the declared value used for stamp-duty calculation. */
  stampValue?: boolean;
  options?: string[];
  required?: boolean;
  placeholder?: string;
  help?: string;
  /** Optional step grouping (e.g. "Landlord", "Tenant") — fields sharing a
   *  section render together as one wizard step. */
  section?: string;
}

export interface DocCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  templateCount: number;
}

export interface DocTemplateListItem {
  id: string;
  title: string;
  slug: string;
  keywords: string[];
  price: string;
  language: string;
  requiresStamp: boolean;
  stampBasis: string | null;
  category: { name: string; slug: string };
}

export interface DocTemplate extends DocTemplateListItem {
  version: number;
  videoUrl?: string | null;
  schemaJson: { fields?: TemplateField[] } | null;
}

export type DocStatus = 'DRAFT' | 'GENERATED' | 'PAID' | 'DELIVERED';

export interface MyDocument {
  id: string;
  status: DocStatus;
  amount: string | null;
  createdAt: string;
  contentHtml?: string | null;
  template: { title: string; slug: string; requiresStamp: boolean; stampBasis: string | null };
}

// ---- public ----

export async function fetchDocCategories(): Promise<DocCategory[]> {
  const res = await fetch(`${API_BASE}/documents/categories`, withTimeout({ next: { revalidate: 300 } }));
  if (!res.ok) throw new Error('Failed to load categories');
  return res.json() as Promise<DocCategory[]>;
}

export async function fetchDocTemplates(category?: string): Promise<DocTemplateListItem[]> {
  const qs = category ? `?category=${encodeURIComponent(category)}` : '';
  const res = await fetch(`${API_BASE}/documents/templates${qs}`, withTimeout({ next: { revalidate: 300 } }));
  if (!res.ok) throw new Error('Failed to load templates');
  return res.json() as Promise<DocTemplateListItem[]>;
}

export async function fetchDocTemplate(idOrSlug: string): Promise<DocTemplate | null> {
  const res = await fetch(`${API_BASE}/documents/templates/${idOrSlug}`, withTimeout({ next: { revalidate: 300 } }));
  if (!res.ok) return null;
  return res.json() as Promise<DocTemplate>;
}

export async function previewDocument(idOrSlug: string, input: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}/documents/templates/${idOrSlug}/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body?.message ?? 'Preview failed');
  }
  return res.json() as Promise<{ title: string; previewText: string; previewHtml?: string; truncated: boolean }>;
}

/** AI prefill from the user's own description (returns {} when AI is off). */
export async function prefillDocument(idOrSlug: string, context: string) {
  const res = await fetch(`${API_BASE}/documents/templates/${idOrSlug}/prefill`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context }),
  });
  if (!res.ok) return { values: {} as Record<string, string> };
  return res.json() as Promise<{ values: Record<string, string> }>;
}

// ---- buyer (authenticated) ----

export interface DocCheckoutResponse {
  customerDocumentId: string;
  orderId: string;
  amount: number;
  currency: string;
  stampDuty?: number;
  razorpayKeyId: string | null;
  title: string;
}

export interface DocQuote {
  base: number;
  stampDuty: number;
  total: number;
  currency: string;
  requiresStamp: boolean;
  stampNote: string | null;
  breakdown: { label: string; amount: number }[];
}

/** Price quote incl. stamp duty for a state (Phase 3). */
export function fetchDocQuote(
  templateId: string,
  opts: { state?: string; declaredValue?: number } = {},
) {
  return authFetch<DocQuote>('/documents/quote', {
    method: 'POST',
    body: JSON.stringify({ templateId, ...opts }),
  });
}

export function checkoutDocument(
  templateId: string,
  input: Record<string, unknown>,
  opts: { state?: string; declaredValue?: number } = {},
) {
  return authFetch<DocCheckoutResponse>('/documents/checkout', {
    method: 'POST',
    body: JSON.stringify({ templateId, input, ...opts }),
  });
}

export function verifyDocumentPayment(data: {
  customerDocumentId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  return authFetch<{ id: string; status: DocStatus }>('/documents/verify-payment', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function fetchMyDocuments() {
  return authFetch<MyDocument[]>('/documents/me');
}

export function fetchMyDocument(id: string) {
  return authFetch<MyDocument>(`/documents/me/${id}`);
}

// ---- admin ----

export interface AdminDocTemplate {
  id: string;
  title: string;
  slug: string;
  price: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  version: number;
  language: string;
  requiresStamp: boolean;
  updatedAt: string;
  category: { id: string; name: string };
  _count: { documents: number };
}

export interface AdminDocTemplateFull {
  id: string;
  categoryId: string;
  title: string;
  slug: string;
  keywords: string[];
  price: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  version: number;
  language: string;
  requiresStamp: boolean;
  stampBasis: string | null;
  schemaJson: { fields?: TemplateField[] } | null;
  videoUrl?: string | null;
  bodyTemplate: string;
  category: { id: string; name: string };
}

export interface AdminDocOrder {
  id: string;
  status: DocStatus;
  amount: string | null;
  createdAt: string;
  paymentId: string | null;
  user: { email: string; fullName: string | null };
  template: { title: string };
}

export interface TemplateInput {
  categoryId: string;
  title: string;
  price: number;
  keywords?: string[];
  language?: string;
  requiresStamp?: boolean;
  stampBasis?: string;
  videoUrl?: string;
  schemaJson: { fields: TemplateField[] };
  bodyTemplate: string;
}

export const fetchAdminDocCategories = () => authFetch<DocCategory[]>('/documents/admin/categories');
export const createDocCategory = (data: { name: string; description?: string }) =>
  authFetch<DocCategory>('/documents/admin/categories', { method: 'POST', body: JSON.stringify(data) });
export const updateDocCategory = (id: string, data: { name?: string; description?: string }) =>
  authFetch<DocCategory>(`/documents/admin/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const fetchAdminDocTemplates = () => authFetch<AdminDocTemplate[]>('/documents/admin/templates');
export const fetchAdminDocTemplate = (id: string) =>
  authFetch<AdminDocTemplateFull>(`/documents/admin/templates/${id}`);
export const createDocTemplate = (data: TemplateInput) =>
  authFetch<AdminDocTemplateFull>('/documents/admin/templates', { method: 'POST', body: JSON.stringify(data) });
export const updateDocTemplate = (id: string, data: Partial<TemplateInput>) =>
  authFetch<AdminDocTemplateFull>(`/documents/admin/templates/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const setDocTemplateStatus = (id: string, status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED') =>
  authFetch<AdminDocTemplateFull>(`/documents/admin/templates/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

export const fetchAdminDocOrders = (page = 1, pageSize = 20) =>
  authFetch<Paginated<AdminDocOrder>>(`/documents/admin/orders?page=${page}&pageSize=${pageSize}`);

// ---- backwards-compatible aliases (public browse page) ----
export type DocumentCategory = DocCategory;
export type DocumentTemplateItem = DocTemplateListItem;
export const getDocumentCategories = fetchDocCategories;
export const getDocumentTemplates = fetchDocTemplates;

// ---- PDF (Phase 2) ----
export async function downloadMyDocumentPdf(id: string, filename = 'document.pdf'): Promise<void> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const res = await fetch(`${API_BASE}/documents/me/${id}/pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new Error(res.status === 403 ? 'PDF downloads are currently disabled' : 'Could not download the PDF');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export interface DocVerifyResult {
  valid: boolean;
  title?: string;
  generatedAt?: string;
  contentHash?: string;
}
export async function verifyDocument(id: string): Promise<DocVerifyResult> {
  const res = await fetch(`${API_BASE}/documents/verify/${id}`);
  if (!res.ok) return { valid: false };
  return res.json();
}

// ---- Lawyer review (Phase 4) ----
export interface ReviewOrder {
  customerDocumentId: string;
  orderId: string;
  amount: number;
  currency: string;
  reviewFee: number;
  razorpayKeyId: string | null;
  title: string;
}
export function requestDocumentReview(id: string) {
  return authFetch<ReviewOrder>(`/documents/me/${id}/request-review`, { method: 'POST' });
}
export function verifyReviewPayment(
  id: string,
  data: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string },
) {
  return authFetch<{ id: string; reviewStatus: string }>(`/documents/me/${id}/review-payment`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface ReviewQueueItem {
  id: string;
  reviewStatus: string;
  reviewFee: string | null;
  createdAt: string;
  lawyerId: string | null;
  template: { title: string; category: { name: string } };
}
export function fetchReviewQueue() {
  return authFetch<ReviewQueueItem[]>('/documents/reviews/queue');
}
export function claimReview(id: string) {
  return authFetch<{ id: string; reviewStatus: string }>(`/documents/reviews/${id}/claim`, {
    method: 'POST',
  });
}
export function decideReview(
  id: string,
  decision: 'APPROVED' | 'REJECTED' | 'REVISION',
  comment?: string,
) {
  return authFetch<{ id: string; reviewStatus: string; lawyerPayout?: number }>(
    `/documents/reviews/${id}/decision`,
    { method: 'POST', body: JSON.stringify({ decision, comment }) },
  );
}

export interface ReviewEvent {
  action: string;
  comment: string | null;
  createdAt: string;
}
export function fetchReviewTimeline(id: string) {
  return authFetch<ReviewEvent[]>(`/documents/me/${id}/review`);
}

// ---- e-Sign / e-Stamp (Phase 5, vendor-agnostic) ----
export interface ESignStart { id: string; provider: string; status: string; signingUrl: string | null }
export interface ESignStatus { id: string; provider: string; status: string; signedDocumentUrl: string | null; updatedAt: string }
export function startEsign(documentId: string) {
  return authFetch<ESignStart>(`/documents/${documentId}/esign`, { method: 'POST' });
}
export function fetchEsignStatus(id: string) {
  return authFetch<ESignStatus>(`/esign/${id}/status`);
}
/** Testing only (mock provider): simulate a signing outcome. */
export function simulateEsign(id: string, outcome: 'signed' | 'rejected' | 'timeout' | 'failed') {
  return authFetch<{ ok: boolean; status?: string }>(`/esign/${id}/simulate`, {
    method: 'POST',
    body: JSON.stringify({ outcome }),
  });
}

export interface EStampStart { id: string; provider: string; status: string; amount: number }
export interface EStampStatus {
  id: string;
  provider: string;
  status: string;
  stateCode: string;
  amount: string;
  certificateNumber: string | null;
  certificateUrl: string | null;
  updatedAt: string;
}
export function startEstamp(documentId: string, stateCode: string, amount?: number) {
  return authFetch<EStampStart>(`/documents/${documentId}/estamp`, {
    method: 'POST',
    body: JSON.stringify({ stateCode, amount }),
  });
}
export function fetchEstampStatus(id: string) {
  return authFetch<EStampStatus>(`/estamp/${id}/status`);
}
/** Testing only (mock provider): simulate a stamping outcome. */
export function simulateEstamp(id: string, outcome: 'stamped' | 'rejected' | 'timeout' | 'failed') {
  return authFetch<{ ok: boolean; status?: string }>(`/estamp/${id}/simulate`, {
    method: 'POST',
    body: JSON.stringify({ outcome }),
  });
}
