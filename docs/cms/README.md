# Content Management System (CMS)

LawMitran's CMS is a generic, admin-managed content store that replaces the
static `frontend/lib/legal-guides/guides.ts` file. A single polymorphic model
serves every content type, so adding a new type (Legal News, Judgment Summaries,
Government Notifications, standalone FAQs, and future types) is an enum value and
a bit of rendering — never a new table or a new API.

This document describes the data model, the editorial workflow, the API surface,
role-based permissions, the reviewer (E-E-A-T) policy, and the local runbook to
apply the migration and seed the existing guides.

## Why a database-backed CMS

The original Legal Guides shipped as a hand-maintained TypeScript array. That is
fine for a handful of articles but does not scale: every edit is a code change
and redeploy, there is no draft/review workflow, no scheduling, no revision
history, and no way to attribute a real legal reviewer. The CMS moves content
into PostgreSQL behind an admin interface while keeping the public pages fast and
SEO-friendly, and it keeps the static file only as a migration source and a
runtime fallback so nothing breaks before the database is seeded.

## Data model

The schema lives at the end of `backend/prisma/schema.prisma`. Four models and
three enums make up the CMS.

`ContentItem` is the single polymorphic record. It carries a `type`
(`GUIDE | NEWS | JUDGMENT | NOTIFICATION | FAQ`), an editorial `status`
(`DRAFT | IN_REVIEW | PUBLISHED | ARCHIVED`), a unique `slug`, the human title
and excerpt, a generic `bodyHtml` render target, and a structured `sections`
JSON payload for type-specific content (for guides this holds the twelve-part
structure — intro, steps, documents, fees, timeline, mistakes, FAQs, and so on).
It also stores the full SEO set (`seoTitle`, `metaDescription`, `canonicalUrl`,
`ogImageUrl`, `featuredImageUrl`, and an optional hand-authored `jsonLd`
override), the taxonomy and relations (`categorySlug`, `tags[]`,
`practiceAreas[]`, `states[]` for state applicability, `relatedDocumentIds[]`,
`relatedLawyerIds[]`), the editorial attribution (`authorName`, `reviewerId`,
`reviewState`), and publishing fields (`publishedAt`, timestamps, `readMinutes`).

`Reviewer` is a first-class entity — never a hardcoded string. It holds `name`,
`designation`, `barCouncilNumber`, `practiceAreas[]`, `biography`, and
`photoUrl`. A soft `lawyerId` reference (deliberately not a hard foreign key)
lets a verified lawyer on the platform be promoted to a reviewer later without a
schema change; `reviewerFromLawyer()` performs that promotion for any lawyer with
`verificationStatus = APPROVED`.

`ContentCategory` is the admin-managed taxonomy, scoped per content type via a
`(type, slug)` unique constraint, so the same slug can exist independently for a
guide and a judgment.

`ContentRevision` is an append-only history: the service writes a full JSON
snapshot of the previous state before every update, so any earlier version can be
inspected or restored.

The third enum, `ContentReviewState`
(`PENDING_LEGAL_REVIEW | IN_LEGAL_REVIEW | LEGALLY_REVIEWED`), is intentionally
independent of the editorial workflow. It tracks the *legal* review signal shown
to readers and defaults to `PENDING_LEGAL_REVIEW` so the platform never implies a
review that has not happened.

## Editorial workflow

Content moves through Draft, In Review, Published, and Archived. The permitted
transitions are enforced in `ContentService.setStatus()` and mirrored in the
admin editor so illegal moves are impossible from either side:

- Draft can go to In Review, Published, or Archived.
- In Review can return to Draft, or go to Published or Archived.
- Published can be Archived or pulled back to Draft.
- Archived can be restored to Draft or Published.

Scheduling is handled without a cron. When an item is published with a future
`publishedAt`, it stays hidden because every public query filters on
`status = PUBLISHED AND (publishedAt IS NULL OR publishedAt <= now())`. Setting a
future time in the editor's "Schedule publish" control is therefore all that is
needed; the item appears automatically once the time passes and the page
revalidates.

## API surface

All routes are under the global `/api` prefix and documented in Swagger at
`/api/docs` (tag `content`).

Public, unauthenticated (for SEO):

- `GET /content` — list published content with `type`, `category`, `tag`,
  `state`, `q` (search), and `page` / `pageSize` filters.
- `GET /content/categories?type=GUIDE` — categories for a type.
- `GET /content/slug/:slug` — one published item by slug.

Admin (JWT + `ADMIN` role + `OPS` admin scope):

- `GET /content/admin` — list any status, with filters and search.
- `POST /content/admin` — create (starts as Draft).
- `GET /content/admin/:id` — full item, any status.
- `PATCH /content/admin/:id` — update (snapshots a revision first).
- `PATCH /content/admin/:id/status` — workflow transition / schedule.
- `GET /content/admin/:id/revisions` — revision history.
- `GET|POST /content/admin/reviewers`, `PATCH /content/admin/reviewers/:id`,
  `POST /content/admin/reviewers/from-lawyer/:lawyerId` — reviewer management.
- `GET|POST /content/admin/categories` — taxonomy management.

The public projection never leaks an unassigned reviewer: when `reviewerId` is
null the API returns `{ name: "To Be Assigned", designation: "Pending Legal
Review" }` so the frontend has an explicit, honest placeholder.

## Role-based permissions

The CMS reuses the existing global guards. Every admin route is gated with
`@Roles(Role.ADMIN)` and `@AdminScopes(AdminRole.OPS)`, so `SUPER` and `OPS`
admins can author and publish while `FINANCE` admins cannot. The public read
routes are marked `@Public()`. Because the soft `lawyerId` link exists on
`Reviewer`, a future "verified lawyer as reviewer" flow can grant a narrower
capability without touching the content tables.

## Reviewer and E-E-A-T policy

Credibility for this kind of your-money-or-your-life legal content depends on
honest authorship and review signals. The platform therefore does **not** invent
an advocate's name. Until a real advocate has agreed to review a piece, the item
stays at `PENDING_LEGAL_REVIEW`, the byline reads "Review status: Pending Legal
Review", and no `editor` is emitted in the Article JSON-LD. Only when an admin
assigns a real `Reviewer` and sets the state to `LEGALLY_REVIEWED` does the page
show "Reviewed by <name>, <designation>" and include the reviewer in structured
data. This keeps the structured-data claims truthful and avoids attributing work
to a person who has not done it.

## Frontend rendering

Public rendering is DB-first with a static fallback. `frontend/lib/legal-guides/
source.ts` reads from the CMS API and maps each record back to the shape the
existing pages already render; if the API is unreachable or empty (for example
before the seed has run) it transparently falls back to the legacy static guides
so the site never breaks during migration. The four public pages — the hub,
the all-guides index, the category page, and the article page — were re-pointed
to this source layer and are otherwise visually unchanged. New content types can
reuse the same generic `bodyHtml` renderer, so adding one is mostly a matter of
seeding a category and choosing how much type-specific structure to show.

The admin interface — branded **Legal Help Center** in the sidebar (scoped to
`OPS`) — lives at `/admin/content` and `/admin/content/[id]`. The landing screen
opens with a dashboard row of bucket cards (All, Drafts, Pending Review,
Scheduled, Published, Archived) fed by `GET /content/admin/dashboard`; clicking a
card filters the unified list below, alongside the content-type filter and
search. "Scheduled" is a derived bucket — status `PUBLISHED` with a future
`publishedAt` — so no cron or extra enum value is needed; scheduled rows also get
their own chip in the list. The editor page carries SEO fields, taxonomy,
structured JSON, workflow controls, scheduling, reviewer assignment, and
revision history.

## Local runbook

The schema change is additive, so it is safe to apply on top of the existing
database. Run these from `backend/`:

```bash
# 1. Create and apply the migration, and regenerate the Prisma client.
npx prisma migrate dev --name cms_content_reviewer

# 2. Migrate the 14 existing Legal Guides + their categories into the DB.
npm run seed:content --workspace backend
```

The seed reads `backend/prisma/data/legal-guides.seed.json` — a committed
snapshot generated from `frontend/lib/legal-guides/*`. It is idempotent (upserts
by slug / `(type, slug)`), so it is safe to re-run. If the static guides ever
change, regenerate that JSON snapshot and re-run the seed. After the seed, the
public pages serve from the database; the static file remains only as a fallback.

Until a migration is applied and the Prisma client is regenerated, the backend
will not compile against the new models — this is expected, because the generated
client types do not exist yet. Nothing else in the app depends on the CMS at
runtime, so the rest of the platform is unaffected.

## What is intentionally deferred

Rich-text editing is plain HTML / JSON textareas for now rather than a WYSIWYG
editor; image uploads reuse URL fields rather than a new upload pipeline; and
one-click "restore this revision" is not yet wired (snapshots are captured and
viewable, restoration is a follow-up). None of these require schema changes.
