import type { LawyerListItem, LawyerMarker, LawyerSearchResult, MapBounds, SearchFilters } from '@/types/lawyer';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

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
