import { authFetch, getToken } from './client';
import { API_BASE } from './base';


export interface ChecklistItem {
  key: string;
  label: string;
  why: string;
  required: boolean;
}

export type PropertyCaseStatus = 'OPEN' | 'ANALYZED' | 'LAWYER_REVIEW' | 'CLOSED';

export interface PropertyCaseListItem {
  id: string;
  state: string;
  city: string;
  transactionType: string;
  status: PropertyCaseStatus;
  createdAt: string;
  _count: { documents: number };
}

export interface CaseDocument {
  id: string;
  docType: string;
  provided: boolean;
  fileUrl: string | null;
}

export interface ReportItem extends ChecklistItem {
  status: 'PROVIDED' | 'MISSING';
}

export interface CaseReport {
  generatedAt: string;
  items: ReportItem[];
  summary: { total: number; provided: number; missingRequired: number; completeness: number };
  disclaimer: string;
}

export interface PropertyCase extends PropertyCaseListItem {
  reportJson: CaseReport | null;
  leadId: string | null;
  documents: CaseDocument[];
  checklist: ChecklistItem[];
}

export interface SuggestedLawyer {
  id: string;
  fullName: string;
  slug: string | null;
  experienceYears: number;
  ratingAvg: string | null;
  ratingCount: number;
  profileImageUrl: string | null;
  city: { name: string } | null;
}

export const fetchTransactionTypes = () =>
  authFetch<{ key: string; label: string }[]>('/property/transaction-types');

export const createPropertyCase = (data: { state: string; city: string; transactionType: string }) =>
  authFetch<{ id: string }>('/property/cases', { method: 'POST', body: JSON.stringify(data) });

export const fetchMyPropertyCases = () => authFetch<PropertyCaseListItem[]>('/property/cases/me');

export const fetchPropertyCase = (id: string) => authFetch<PropertyCase>(`/property/cases/${id}`);

/** Tick/untick an item; optionally attach a scan. */
export async function setCaseDocument(caseId: string, docType: string, provided: boolean, file?: File) {
  const fd = new FormData();
  fd.append('docType', docType);
  fd.append('provided', String(provided));
  if (file) fd.append('file', file);
  const token = getToken();
  const res = await fetch(`${API_BASE}/property/cases/${caseId}/documents`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body?.message ?? 'Failed to update document');
  }
  return res.json();
}

export const analyzeCase = (id: string) =>
  authFetch<CaseReport>(`/property/cases/${id}/analyze`, { method: 'POST' });

export const fetchCaseLawyers = (id: string) =>
  authFetch<SuggestedLawyer[]>(`/property/cases/${id}/lawyers`);

export const requestOpinion = (id: string, lawyerId: string) =>
  authFetch<{ leadId: string }>(`/property/cases/${id}/request-opinion`, {
    method: 'POST',
    body: JSON.stringify({ lawyerId }),
  });
