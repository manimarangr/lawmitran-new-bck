import type { LawyerListItem, LawyerMarker, LawyerSearchResult, MapBounds, SearchFilters } from '@/types/lawyer';
import { authFetch, getToken } from './client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export interface CreateProfileInput {
  fullName: string;
  barCouncilNumber: string;
  barCouncilState: string;
  experienceYears: number;
  city: string;
  practiceAreas: string[];
  certificate: File;
}

/** Lawyer's own profile (404 if not created yet). */
export function getMyProfile(): Promise<LawyerListItem | null> {
  return authFetch<LawyerListItem>('/lawyers/me/profile').catch((e: Error) => {
    if (e.message.toLowerCase().includes('not')) return null;
    throw e;
  });
}

/** Create the lawyer profile (multipart — certificate file + fields). */
export async function createLawyerProfile(input: CreateProfileInput) {
  const fd = new FormData();
  fd.append('fullName', input.fullName);
  fd.append('barCouncilNumber', input.barCouncilNumber);
  fd.append('barCouncilState', input.barCouncilState);
  fd.append('experienceYears', String(input.experienceYears));
  fd.append('city', input.city);
  fd.append('practiceAreas', input.practiceAreas.join(',')); // DTO splits comma-separated
  fd.append('certificate', input.certificate);

  const token = getToken();
  const res = await fetch(`${API_BASE}/lawyers/me/profile`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body?.message ?? 'Failed to submit profile');
  }
  return res.json();
}

function toParams(obj: Record<string, unknown>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  }
  return p.toString();
}

export async function fetchLawyers(
  filters: SearchFilters,
  page = 1,
  limit = 20,
): Promise<LawyerSearchResult> {
  const qs = toParams({ ...filters, page, limit });
  const res = await fetch(`${API_BASE}/lawyers?${qs}`);
  if (!res.ok) throw new Error('Failed to fetch lawyers');
  return res.json() as Promise<LawyerSearchResult>;
}

export async function fetchLawyerMarkers(
  filters: SearchFilters,
  bounds: MapBounds | null,
): Promise<LawyerMarker[]> {
  const qs = toParams({ ...filters, ...(bounds ?? {}) });
  const res = await fetch(`${API_BASE}/lawyers/markers?${qs}`);
  if (!res.ok) throw new Error('Failed to fetch markers');
  return res.json() as Promise<LawyerMarker[]>;
}

export async function fetchLawyerProfile(id: string): Promise<LawyerListItem> {
  const res = await fetch(`${API_BASE}/lawyers/${id}`);
  if (!res.ok) throw new Error('Lawyer not found');
  return res.json() as Promise<LawyerListItem>;
}
