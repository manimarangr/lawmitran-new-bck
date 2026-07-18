/**
 * CMS seed: migrates the legacy static Legal Guides + their category taxonomy
 * into the database (ContentCategory + ContentItem). Idempotent — upserts by
 * (type, slug) / slug, safe to re-run.
 *
 *   npm run seed:content --workspace backend
 *
 * Source data is the committed snapshot prisma/data/legal-guides.seed.json,
 * generated from frontend/lib/legal-guides/*. Regenerate that file if the
 * static guides change, then re-run this seed. Reviewer is intentionally left
 * unassigned (reviewState = PENDING_LEGAL_REVIEW) — no fictitious advocate.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ContentReviewState,
  ContentStatus,
  ContentType,
  Prisma,
  PrismaClient,
} from '@prisma/client';

const prisma = new PrismaClient();

interface GuideFAQ { q: string; a: string }
interface GuideStep { title: string; detail: string }
interface GuideLink { href: string; label: string }
interface Guide {
  slug: string;
  category: string;
  title: string;
  seoTitle: string;
  metaDescription: string;
  published: string;
  updated: string;
  readMins: number;
  intro: string;
  whoShouldRead: string[];
  whatLawSays: string[];
  steps: GuideStep[];
  documents: string[];
  fees: string[];
  timeline: string;
  mistakes: string[];
  faqs: GuideFAQ[];
  whenConsult: string[];
  related: GuideLink[];
}
interface Category { slug: string; name: string; icon: string; description: string }
interface SeedFile {
  disclaimer: string;
  author: { name: string; url: string };
  categories: Category[];
  guides: Guide[];
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function ul(items: string[]): string {
  return `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
}

// Generic HTML render of the 12-section guide, so any content type can be shown
// by the same frontend renderer via `bodyHtml`. The structured `sections` JSON
// is stored alongside for richer, guide-specific rendering.
function toHtml(g: Guide): string {
  const parts: string[] = [];
  parts.push(`<h2>Introduction</h2><p>${esc(g.intro)}</p>`);
  parts.push(`<h2>Who should read this?</h2>${ul(g.whoShouldRead)}`);
  parts.push(`<h2>What the law says</h2>${ul(g.whatLawSays)}`);
  parts.push(
    `<h2>Step-by-step process</h2><ol>${g.steps
      .map((s) => `<li><strong>${esc(s.title)}</strong> — ${esc(s.detail)}</li>`)
      .join('')}</ol>`,
  );
  parts.push(`<h2>Documents required</h2>${ul(g.documents)}`);
  parts.push(`<h2>Fees and government charges</h2>${ul(g.fees)}`);
  parts.push(`<h2>Expected timeline</h2><p>${esc(g.timeline)}</p>`);
  parts.push(`<h2>Common mistakes to avoid</h2>${ul(g.mistakes)}`);
  parts.push(
    `<h2>Frequently asked questions</h2>${g.faqs
      .map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`)
      .join('')}`,
  );
  parts.push(`<h2>When you should consult a lawyer</h2>${ul(g.whenConsult)}`);
  return parts.join('\n');
}

async function main() {
  const file = join(__dirname, 'data', 'legal-guides.seed.json');
  const data = JSON.parse(readFileSync(file, 'utf8')) as SeedFile;

  // Categories (scoped to GUIDE).
  let order = 0;
  for (const c of data.categories) {
    await prisma.contentCategory.upsert({
      where: { type_slug: { type: ContentType.GUIDE, slug: c.slug } },
      update: { name: c.name, description: c.description, icon: c.icon, sortOrder: order },
      create: {
        type: ContentType.GUIDE,
        slug: c.slug,
        name: c.name,
        description: c.description,
        icon: c.icon,
        sortOrder: order,
      },
    });
    order += 1;
    console.log(`category: ${c.slug}`);
  }

  // Guides -> ContentItem (published).
  for (const g of data.guides) {
    const sections = {
      intro: g.intro,
      whoShouldRead: g.whoShouldRead,
      whatLawSays: g.whatLawSays,
      steps: g.steps,
      documents: g.documents,
      fees: g.fees,
      timeline: g.timeline,
      mistakes: g.mistakes,
      whenConsult: g.whenConsult,
      related: g.related,
      disclaimer: data.disclaimer,
    } as unknown as Prisma.InputJsonValue;

    const payload = {
      type: ContentType.GUIDE,
      status: ContentStatus.PUBLISHED,
      title: g.title,
      excerpt: g.metaDescription,
      bodyHtml: toHtml(g),
      sections,
      faqs: g.faqs as unknown as Prisma.InputJsonValue,
      seoTitle: g.seoTitle,
      metaDescription: g.metaDescription,
      categorySlug: g.category,
      tags: [] as string[],
      practiceAreas: [g.category],
      states: [] as string[],
      authorName: data.author?.name ?? 'LawMitran Legal Content Team',
      reviewState: ContentReviewState.PENDING_LEGAL_REVIEW,
      readMinutes: g.readMins,
      publishedAt: new Date(g.published),
    };

    await prisma.contentItem.upsert({
      where: { slug: g.slug },
      update: payload,
      create: { slug: g.slug, ...payload },
    });
    console.log(`guide: ${g.slug}`);
  }

  console.log(`CMS seed complete — ${data.categories.length} categories, ${data.guides.length} guides.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
