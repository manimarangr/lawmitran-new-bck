/**
 * Data source for the public Legal Guides pages.
 *
 * DB-FIRST: reads content from the CMS API (type=GUIDE). If the API is
 * unreachable or has no data yet (e.g. before `npm run seed:content`), it
 * transparently falls back to the legacy static guides so the site never
 * breaks during migration. Once the DB is seeded, the DB is the source of
 * truth and the static file is only a fallback/seed input.
 *
 * Reviewer: we NEVER surface a fabricated advocate. When no reviewer is
 * assigned, the view reports { name: 'To Be Assigned' } with reviewState
 * 'PENDING_LEGAL_REVIEW'.
 */
import {
  fetchContentCategories,
  fetchPublicContent,
  fetchPublicContentBySlug,
  type ContentCategory,
  type PublicContent,
} from '@/lib/api/content';
import { CATEGORIES as STATIC_CATEGORIES } from './categories';
import {
  GUIDES as STATIC_GUIDES,
  GUIDE_DISCLAIMER,
  getGuide as staticGetGuide,
  type LegalGuide,
} from './guides';

export { GUIDE_DISCLAIMER };
export const GUIDE_AUTHOR = { name: 'LawMitran Legal Content Team', url: '/about' };

export interface GuideCard {
  slug: string;
  title: string;
  metaDescription: string;
  category: string;
}

export interface GuideReviewer {
  name: string;
  designation: string | null;
}

export interface GuideView extends LegalGuide {
  reviewer: GuideReviewer;
  reviewState: 'PENDING_LEGAL_REVIEW' | 'IN_LEGAL_REVIEW' | 'LEGALLY_REVIEWED';
}

export interface GuideCategoryView {
  slug: string;
  name: string;
  icon: string;
  description: string;
}

const PLACEHOLDER_REVIEWER: GuideReviewer = {
  name: 'To Be Assigned',
  designation: 'Pending Legal Review',
};

function dateOnly(iso: string | null | undefined, fallback: string): string {
  if (!iso) return fallback;
  return iso.slice(0, 10);
}

// PublicContent (DB) -> the LegalGuide shape the pages already render.
function toGuideView(c: PublicContent): GuideView {
  const s = (c.sections ?? {}) as Record<string, unknown>;
  const arr = (k: string): string[] => (Array.isArray(s[k]) ? (s[k] as string[]) : []);
  return {
    slug: c.slug,
    category: c.categorySlug ?? '',
    title: c.title,
    seoTitle: c.seoTitle,
    metaDescription: c.metaDescription ?? c.excerpt ?? '',
    published: dateOnly(c.publishedAt, c.updatedAt.slice(0, 10)),
    updated: dateOnly(c.updatedAt, c.updatedAt.slice(0, 10)),
    readMins: c.readMinutes ?? 6,
    intro: typeof s.intro === 'string' ? s.intro : (c.excerpt ?? ''),
    whoShouldRead: arr('whoShouldRead'),
    whatLawSays: arr('whatLawSays'),
    steps: (Array.isArray(s.steps) ? s.steps : []) as LegalGuide['steps'],
    documents: arr('documents'),
    fees: arr('fees'),
    timeline: typeof s.timeline === 'string' ? s.timeline : '',
    mistakes: arr('mistakes'),
    faqs: (c.faqs ?? []) as LegalGuide['faqs'],
    whenConsult: arr('whenConsult'),
    related: (Array.isArray(s.related) ? s.related : []) as LegalGuide['related'],
    reviewer: c.reviewer
      ? { name: c.reviewer.name, designation: c.reviewer.designation }
      : PLACEHOLDER_REVIEWER,
    reviewState: c.reviewState,
  };
}

function staticView(g: LegalGuide): GuideView {
  return { ...g, reviewer: PLACEHOLDER_REVIEWER, reviewState: 'PENDING_LEGAL_REVIEW' };
}

function cardOf(g: { slug: string; title: string; metaDescription: string; category: string }): GuideCard {
  return { slug: g.slug, title: g.title, metaDescription: g.metaDescription, category: g.category };
}

// ─────────────────────────── reads ───────────────────────────

export async function getGuideView(slug: string): Promise<GuideView | null> {
  try {
    const c = await fetchPublicContentBySlug(slug);
    if (c && c.type === 'GUIDE') return toGuideView(c);
    if (c) return toGuideView(c);
  } catch {
    /* fall through to static */
  }
  const g = staticGetGuide(slug);
  return g ? staticView(g) : null;
}

export async function allGuideCards(): Promise<GuideCard[]> {
  try {
    const res = await fetchPublicContent({ type: 'GUIDE', pageSize: 50 });
    if (res.items.length) return res.items.map((c) => cardOf(toGuideView(c)));
  } catch {
    /* fall through */
  }
  return STATIC_GUIDES.map(cardOf);
}

export async function guideCardsByCategory(category: string): Promise<GuideCard[]> {
  try {
    const res = await fetchPublicContent({ type: 'GUIDE', category, pageSize: 50 });
    if (res.items.length) return res.items.map((c) => cardOf(toGuideView(c)));
    // Category may legitimately be empty in the DB; only fall back when the
    // DB has no guides at all (checked by caller via allGuideCards()).
    return [];
  } catch {
    return STATIC_GUIDES.filter((g) => g.category === category).map(cardOf);
  }
}

export async function latestGuideCards(n = 6): Promise<GuideCard[]> {
  const all = await allGuideCards();
  return all.slice(0, n);
}

export async function allGuideSlugs(): Promise<string[]> {
  try {
    const res = await fetchPublicContent({ type: 'GUIDE', pageSize: 50 });
    if (res.items.length) return res.items.map((c) => c.slug);
  } catch {
    /* fall through */
  }
  return STATIC_GUIDES.map((g) => g.slug);
}

// Categories: DB categories (type=GUIDE) with static fallback.
export async function guideCategories(): Promise<GuideCategoryView[]> {
  try {
    const cats: ContentCategory[] = await fetchContentCategories('GUIDE');
    if (cats.length) {
      return cats.map((c) => ({
        slug: c.slug,
        name: c.name,
        icon: c.icon ?? 'scale-balanced',
        description: c.description ?? '',
      }));
    }
  } catch {
    /* fall through */
  }
  return STATIC_CATEGORIES.map((c) => ({
    slug: c.slug,
    name: c.name,
    icon: c.icon,
    description: c.description,
  }));
}

export async function getGuideCategory(slug: string): Promise<GuideCategoryView | null> {
  const cats = await guideCategories();
  return cats.find((c) => c.slug === slug) ?? null;
}
