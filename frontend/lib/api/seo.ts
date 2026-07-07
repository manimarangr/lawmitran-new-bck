import type { LawyerListItem, LawyerSearchResult } from '@/types/lawyer';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

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
  const res = await fetch(`${API_BASE}/lawyers/slug/${slug}`, {
    next: { revalidate: 3600 },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to load lawyer');
  return res.json() as Promise<LawyerListItem>;
}

/** Editable landing copy for a city × practice page (backend returns a generated fallback). */
export async function getLanding(city: string, practice: string): Promise<LandingContent> {
  const res = await fetch(`${API_BASE}/seo/landing/${city}/${practice}`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error('Failed to load landing content');
  return res.json() as Promise<LandingContent>;
}

/** URL feed for the XML sitemap. */
export async function getSitemapFeed(): Promise<SitemapFeed> {
  const res = await fetch(`${API_BASE}/seo/sitemap`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error('Failed to load sitemap feed');
  return res.json() as Promise<SitemapFeed>;
}

/** Server-side lawyer list for landing/city pages. */
export async function getLawyers(
  params: Record<string, string | number>,
): Promise<LawyerSearchResult> {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  ).toString();
  const res = await fetch(`${API_BASE}/lawyers?${qs}`, {
    next: { revalidate: 1800 },
  });
  if (!res.ok) throw new Error('Failed to load lawyers');
  return res.json() as Promise<LawyerSearchResult>;
}
