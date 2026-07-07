import type { MetadataRoute } from 'next';
import { getSitemapFeed } from '@/lib/api/seo';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.lawmitran.com';

export const revalidate = 86400; // rebuild daily

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/lawyers`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/legal-documents`, changeFrequency: 'weekly', priority: 0.6 },
  ];

  try {
    const feed = await getSitemapFeed();
    const cities: MetadataRoute.Sitemap = feed.cities.map((c) => ({
      url: `${SITE_URL}${c.url}`,
      changeFrequency: 'weekly',
      priority: 0.7,
    }));
    const practice: MetadataRoute.Sitemap = feed.practiceAreas.map((p) => ({
      url: `${SITE_URL}${p.url}`,
      changeFrequency: 'weekly',
      priority: 0.6,
    }));
    const lawyers: MetadataRoute.Sitemap = feed.lawyers.map((l) => ({
      url: `${SITE_URL}${l.url}`,
      lastModified: l.lastmod,
      changeFrequency: 'weekly',
      priority: 0.5,
    }));
    return [...staticEntries, ...cities, ...practice, ...lawyers];
  } catch {
    // If the API is unreachable at build time, still emit the static entries.
    return staticEntries;
  }
}
