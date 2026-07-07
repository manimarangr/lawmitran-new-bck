# 24 — SEO & Programmatic Landing Pages

Organic search is LawMitran's cheapest, highest-intent acquisition channel — people literally search
*"family lawyer in Bengaluru."* This doc specifies **SEO-friendly URLs**, **programmatic city × practice
landing pages**, structured data, sitemaps, and the on-page content strategy. Builds on
[15-search-and-matching.md](./15-search-and-matching.md) (search) and [03-system-architecture.md](./03-system-architecture.md) (Next.js).

## URL structure (clean, slugged, hierarchical)

All public URLs are lowercase, hyphenated, and human-readable. Slugs come from reference data
(`City.slug`, `PracticeArea.slug`) and a per-lawyer `Lawyer.slug`.

| Page | URL pattern | Example |
|---|---|---|
| Home | `/` | `/` |
| All lawyers | `/lawyers` | `/lawyers` |
| **City page** | `/lawyers/:city` | `/lawyers/bengaluru` |
| **Practice page** | `/lawyers/practice/:area` | `/lawyers/practice/family-law` |
| **City × Practice** (money page) | `/lawyers/:city/:area` | `/lawyers/bengaluru/family-law` |
| Lawyer profile | `/lawyer/:slug` | `/lawyer/adv-a-sharma-family-bengaluru` |
| Document category | `/legal-documents/:category` | `/legal-documents/rental-agreement` |
| City hub | `/lawyers/:city` (all areas) | `/lawyers/chennai` |
| Blog / guide | `/guides/:slug` | `/guides/how-to-file-for-divorce-in-india` |

- **Canonical** URL set on every page (`<link rel="canonical">`) to avoid duplicate-content across filter
  permutations. Filter/sort query params (`?sort=`, `?page=`) are **not** the canonical.
- **Pagination:** `/(...)?page=2` with `rel="next"`/`rel="prev"` and a self-canonical per page.
- **Trailing slashes** normalised (pick one and 301 the other). **301** any legacy/renamed slugs.
- **hreflang** when i18n ships (`/hi/lawyers/...` for Hindi) — [21 §6](./21-improvement-backlog.md).

## Programmatic landing pages (the scale play)

Generate a page for every **city × practice-area** combination that has (or is likely to have) supply —
e.g. 20 cities × 15 practice areas = 300 targeted, indexable pages, each ranking for its long-tail query.

Each page must have **unique, useful content** (Google penalises thin/duplicate doorway pages):

- **H1**: "Family Lawyers in Bengaluru" (city + practice).
- **Intro paragraph(s)**: admin-editable, unique per city×practice (what the area covers locally, courts,
  typical matters). Never the same boilerplate across pages.
- **Verified lawyer cards** for that city+area (real supply; the ranking from [15](./15-search-and-matching.md)).
- **FAQ block** (3–5 Q&As) — powers `FAQPage` rich results.
- **Internal linking**: "Family lawyers in other cities" + "Other practice areas in Bengaluru" +
  related guides → spreads link equity and helps discovery/crawl.
- **Local trust signals**: count of verified lawyers, avg rating.

> **Rendering:** Next.js **SSG/ISR** (`generateStaticParams` + `revalidate`) so pages are static-fast and
> crawlable, refreshed periodically as lawyers/ratings change. Hot pages cached at the CDN.

## Structured data (JSON-LD)

Emit JSON-LD in `<script type="application/ld+json">` for rich results:

- **`BreadcrumbList`** on every deep page (Home › Lawyers › Bengaluru › Family Law).
- **`ItemList`** of lawyers on listing pages (or `LegalService` per card).
- **`LegalService` / `Attorney`** on the lawyer profile (name, area served, rating `AggregateRating`,
  address/geo — from `Lawyer.latitude/longitude`).
- **`FAQPage`** for the FAQ block.
- **`Organization` + `WebSite`** (with `SearchAction`) on the home page.

Ratings in `AggregateRating` must be **genuine** (from `Rating`) — never fabricated (policy + Google
guideline).

## Sitemaps & robots

- **Dynamic XML sitemaps**, split by type and chunked at 50k URLs: `sitemap-cities.xml`,
  `sitemap-practice.xml`, `sitemap-lawyers.xml`, `sitemap-guides.xml`, indexed by `sitemap.xml`.
  Generated from the DB (a backend endpoint or a Next.js route) and submitted to Search Console.
- Include `<lastmod>` (profile/updated dates) so crawlers re-fetch changed pages.
- **`robots.txt`**: allow public pages; **disallow** dashboards, admin, auth, and API
  (`/dashboard`, `/admin`, `/api`, `/settings`). Reference the sitemap.
- Only `APPROVED` lawyers appear in sitemaps/pages; `noindex` pending/suspended and all private pages.

## On-page SEO checklist (per page)

- One `<h1>`; logical `<h2>/<h3>`; descriptive `<title>` (≤60 chars) + meta description (≤155).
- **Open Graph / Twitter cards** for shareable previews.
- Fast **Core Web Vitals** (SSG/ISR, image `next/image`, lazy-load, minimal JS).
- Accessible, semantic HTML (also an a11y win — [21 §6](./21-improvement-backlog.md)).
- Descriptive `alt` on images; internal links use keyword-rich anchor text.
- Mobile-first (India is mobile-heavy).

## Backend / data support

- **Slugs:** `City.slug`, `PracticeArea.slug` already exist; add **`Lawyer.slug`** (unique) generated from
  name + area + city at approval, with collision handling.
- **Landing content:** an editable `intro` + `faq` per city×practice (admin) — new `LandingContent`
  model (or reuse a CMS). Keeps copy unique and non-boilerplate.
- **Endpoints (implemented):**
  - `GET /api/lawyers?city=&practiceArea=` powers the listing.
  - `GET /api/lawyers/slug/:slug` — SEO profile by slug (`Lawyer.slug`, generated at approval).
  - `GET /api/seo/sitemap` — URL feed (approved lawyer slugs + `lastmod`, cities, practice areas) for the
    frontend/Next.js to render the XML sitemaps.
  - `GET /api/seo/landing/:city/:practice` — editable intro/FAQ (with a generated fallback so a page
    always renders); `PATCH /api/seo/admin/landing/:city/:practice` (admin) to author it.

```prisma
model LandingContent {
  id           String  @id @default(uuid())
  citySlug     String
  practiceSlug String
  title        String  // H1 override
  intro        String  // unique SEO copy
  faqJson      Json    // [{ q, a }]
  updatedAt    DateTime @updatedAt
  @@unique([citySlug, practiceSlug])
}
```

## Content strategy (beyond listings)

- **Guides/blog** targeting informational queries ("how to file for divorce in India") → capture top-of-
  funnel, link down to the relevant city×practice page and document templates. Ties into the AI/documents
  membership ([23](./23-client-membership.md)).
- **FAQ per practice area** (reusable) + local specifics per city.

## Phasing

1. **Phase 1:** clean slugged URLs for search/profile/city/practice + canonical + `robots.txt` + a basic
   sitemap; SSG/ISR the public pages.
2. **Phase 2:** programmatic city×practice landing pages with editable intro/FAQ + full JSON-LD + split
   sitemaps + Search Console.
3. **Phase 3:** guides/blog content engine + i18n (`hreflang`).

---
**Related:** [03-system-architecture.md](./03-system-architecture.md) · [15-search-and-matching.md](./15-search-and-matching.md) · [04-database-design.md](./04-database-design.md) · [21-improvement-backlog.md](./21-improvement-backlog.md) · [23-client-membership.md](./23-client-membership.md)
