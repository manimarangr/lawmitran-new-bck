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
  // onboarding v2
  photo: File;
  bio: string;
  languages: string[];
  courts: string[];
  addressLine: string;
  pincode: string;
  landmark?: string;
  localityId?: string;
  officeLabel?: string;
  latitude: number;
  longitude: number;
}

export interface CourtRef {
  id: string;
  name: string;
  code: string;
  type: string;
}

export interface LanguageRef {
  id: string;
  name: string;
  code: string;
}

export interface PracticeAreaRef {
  id: string;
  name: string;
  slug: string;
}

export interface StateRef {
  id: string;
  name: string;
  code: string;
}

export async function fetchPracticeAreas(): Promise<PracticeAreaRef[]> {
  const res = await fetch(`${API_BASE}/lawyers/practice-areas`);
  if (!res.ok) return [];
  return res.json() as Promise<PracticeAreaRef[]>;
}

export async function fetchStates(): Promise<StateRef[]> {
  const res = await fetch(`${API_BASE}/lawyers/states`);
  if (!res.ok) return [];
  return res.json() as Promise<StateRef[]>;
}

export interface LocalityRef {
  id: string;
  name: string;
  slug: string;
  lat: number;
  lng: number;
}

/** Metro localities for a city — [] for non-metros (hide the locality UI). */
export async function fetchLocalities(city: string): Promise<LocalityRef[]> {
  if (!city?.trim()) return [];
  const res = await fetch(`${API_BASE}/lawyers/localities?city=${encodeURIComponent(city)}`);
  if (!res.ok) return [];
  return res.json() as Promise<LocalityRef[]>;
}

export async function fetchCourts(): Promise<CourtRef[]> {
  const res = await fetch(`${API_BASE}/lawyers/courts`);
  if (!res.ok) throw new Error('Failed to load courts');
  return res.json() as Promise<CourtRef[]>;
}

export async function fetchLanguages(): Promise<LanguageRef[]> {
  const res = await fetch(`${API_BASE}/lawyers/languages`);
  if (!res.ok) throw new Error('Failed to load languages');
  return res.json() as Promise<LanguageRef[]>;
}

export interface OfficeItem {
  id: string;
  label: string | null;
  addressLine: string | null;
  pincode?: string | null;
  landmark?: string | null;
  photoUrls?: string[];
  latitude?: number | null;
  longitude?: number | null;
  isPrimary: boolean;
  city: { id: string; name: string };
}

export interface MyLocations {
  offices: OfficeItem[];
  serviceAreas: { id: string; name: string }[];
  maxServiceAreas: number | null; // null = unlimited
}

export function getMyLocations() {
  return authFetch<MyLocations>('/lawyers/me/locations');
}

export function addOffice(data: {
  city: string;
  label?: string;
  addressLine?: string;
  pincode?: string;
  landmark?: string;
  localityId?: string;
  latitude?: number;
  longitude?: number;
}) {
  return authFetch<OfficeItem>('/lawyers/me/offices', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateOffice(
  id: string,
  data: {
    city?: string;
    label?: string;
    addressLine?: string;
    pincode?: string;
    landmark?: string;
    localityId?: string;
    latitude?: number;
    longitude?: number;
    isPrimary?: boolean;
  },
) {
  return authFetch<OfficeItem>(`/lawyers/me/offices/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/** Upload up to 3 office photos (replaces the existing set). */
export async function uploadOfficePhotos(id: string, photos: File[]) {
  const fd = new FormData();
  photos.slice(0, 3).forEach((p) => fd.append('photos', p));
  const token = getToken();
  const res = await fetch(`${API_BASE}/lawyers/me/offices/${id}/photos`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body?.message ?? 'Failed to upload photos');
  }
  return res.json() as Promise<OfficeItem>;
}

export function deleteOffice(id: string) {
  return authFetch(`/lawyers/me/offices/${id}`, { method: 'DELETE' });
}

export function setServiceAreas(cities: string[]) {
  return authFetch<{ serviceAreas: { id: string; name: string }[] }>(
    '/lawyers/me/service-areas',
    { method: 'PUT', body: JSON.stringify({ cities }) },
  );
}

/** Replace the profile headshot. */
export async function updateProfilePhoto(photo: File) {
  const fd = new FormData();
  fd.append('photo', photo);
  const token = getToken();
  const res = await fetch(`${API_BASE}/lawyers/me/photo`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body?.message ?? 'Failed to update photo');
  }
  return res.json() as Promise<{ id: string; profileImageUrl: string }>;
}

/** Edit the existing profile (scalars + practice areas/languages/courts as replace-lists). */
export function updateMyProfile(data: {
  fullName?: string;
  barCouncilNumber?: string;
  barCouncilState?: string;
  experienceYears?: number;
  bio?: string;
  practiceAreas?: string[];
  languages?: string[];
  courts?: string[];
}) {
  return authFetch('/lawyers/me/profile', { method: 'PATCH', body: JSON.stringify(data) });
}

/** Rejected lawyer re-uploads documents and goes back to the pending queue. */
export async function resubmitVerification(input: { certificate?: File; photo?: File }) {
  const fd = new FormData();
  if (input.certificate) fd.append('certificate', input.certificate);
  if (input.photo) fd.append('photo', input.photo);
  const token = getToken();
  const res = await fetch(`${API_BASE}/lawyers/me/reverify`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body?.message ?? 'Failed to resubmit for verification');
  }
  return res.json();
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
  fd.append('photo', input.photo);
  fd.append('bio', input.bio);
  fd.append('languages', input.languages.join(','));
  fd.append('courts', input.courts.join(','));
  fd.append('addressLine', input.addressLine);
  fd.append('pincode', input.pincode);
  if (input.landmark) fd.append('landmark', input.landmark);
  if (input.localityId) fd.append('localityId', input.localityId);
  if (input.officeLabel) fd.append('officeLabel', input.officeLabel);
  fd.append('latitude', String(input.latitude));
  fd.append('longitude', String(input.longitude));

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
