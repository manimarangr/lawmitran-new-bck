import type { LawyerListItem, LawyerSearchResult } from '@/types/lawyer';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

/**
 * Build-time safety: server-side fetches get a hard timeout so a slow or
 * unreachable API fails fast (and the caller's fallback kicks in) instead of
 * hanging Next.js static generation until its 60s export budget expires.
 */
const SERVER_FETCH_TIMEOUT_MS = 6000;
function withTimeout(init?: RequestInit): RequestInit {
  return { ...init, signal: AbortSignal.timeout(SERVER_FETCH_TIMEOUT_MS) };
}

export interface SitemapFeed {
  lawyers: { url: string; lastmod: string }[];
  cities: { url: string }[];
  practiceAreas: { url: string; name: string }[];
}

export interface LandingContent {
  citySlug: string;
  practiceSlug: string;
  title: string;
  intro: string;
  faqJson: { q: string; a: string }[] | null;
  generated?: boolean;
}

/** SEO profile by slug — /lawyer/:slug */
export async function getLawyerBySlug(slug: string): Promise<LawyerListItem | null> {
  const res = await fetch(`${API_BASE}/lawyers/slug/${slug}`, withTimeout({
    next: { revalidate: 3600 },
  }));
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to load lawyer');
  return res.json() as Promise<LawyerListItem>;
}

/** Editable landing copy for a city × practice page (backend returns a generated fallback). */
export async function getLanding(city: string, practice: string): Promise<LandingContent> {
  const res = await fetch(`${API_BASE}/seo/landing/${city}/${practice}`, withTimeout({
    next: { revalidate: 3600 },
  }));
  if (!res.ok) throw new Error('Failed to load landing content');
  return res.json() as Promise<LandingContent>;
}

/** URL feed for the XML sitemap. */
export async function getSitemapFeed(): Promise<SitemapFeed> {
  const res = await fetch(`${API_BASE}/seo/sitemap`, withTimeout({
    next: { revalidate: 86400 },
  }));
  if (!res.ok) throw new Error('Failed to load sitemap feed');
  return res.json() as Promise<SitemapFeed>;
}

export interface PracticeAreaRef {
  id: string;
  name: string;
  slug: string;
}

/** Public practice area reference list (homepage grid, hero dropdown). */
export async function getPracticeAreas(): Promise<PracticeAreaRef[]> {
  const res = await fetch(`${API_BASE}/lawyers/practice-areas`, withTimeout({
    next: { revalidate: 86400 },
  }));
  if (!res.ok) throw new Error('Failed to load practice areas');
  return res.json() as Promise<PracticeAreaRef[]>;
}

/** Server-side lawyer list for landing/city pages. */
export async function getLawyers(
  params: Record<string, string | number>,
): Promise<LawyerSearchResult> {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  ).toString();
  const res = await fetch(`${API_BASE}/lawyers?${qs}`, withTimeout({
    next: { revalidate: 1800 },
  }));
  if (!res.ok) throw new Error('Failed to load lawyers');
  return res.json() as Promise<LawyerSearchResult>;
}
