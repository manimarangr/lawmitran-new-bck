# 15 — Search & Matching

Public discovery is LawMitran's top of funnel and primary SEO surface. This document specifies the
homepage, search, ranking, and filtering — including the **homepage layout** modeled on the reference
design (city + practice-area search bar over a "Top-rated lawyers" showcase).

## Homepage

The homepage has two hero elements, mirroring the reference (LawRato) layout:

### 1. Search bar — "Search for top-rated lawyers"

A single prominent row:

```
[ Select City ▾ ]   [ Select Practice Area ▾ ]   [ Search ]
```

- **Select City** — dropdown of supported cities (target: `City` reference data; today a string).
- **Select Practice Area** — dropdown of canonical practice areas (target: `PracticeArea`).
- **Search** — submits to the results page `/lawyers?city=&practiceArea=`.
- Both fields optional; empty search shows all verified lawyers, ranked.
- No login required (public, SEO-indexed).

> **Quick search is intentionally limited to City + Practice Area.** Language (and the other
> secondary attributes — court, experience, gender, rating) are **not** in the primary search bar;
> they live in the results-page **Advanced filters** sidebar. This keeps the top-of-funnel decision
> minimal (the two things every client knows) and avoids a cluttered hero. Language specifically is a
> **multi-select** there, since clients are often comfortable in more than one language.

### 2. "Top-rated lawyers in India" showcase

Below the search bar, a set of **practice-area columns**, each showing one or two top lawyer cards and
a "View more" link — exactly like the reference:

```
Family                        Armed Forces Tribunal        Lawyers in India
┌───────────────────┐        ┌───────────────────┐        ┌───────────────────┐
│ [photo] Adv. Name │        │ [photo] Adv. Name │        │ Find the right    │
│ ★ 4.7 | 100+ rev. │        │ ★ 4.8 | 25+ rev.  │        │ lawyer for your   │
│ 📍 City           │        │ 📍 City           │        │ legal matter      │
│ 💼 20 yrs exp.    │        │ 💼 26 yrs exp.    │        │ [ Find a Lawyer ] │
│ Areas: Family +3  │        │ Areas: AFT +3     │        │                   │
└───────────────────┘        └───────────────────┘        └───────────────────┘
[View more Family Lawyers]   [View more AFT Lawyers]       (generic CTA card)
```

**Lawyer card fields:** photo, name (links to profile), star rating + review count, location, years of
experience, "Practice areas: X +N more", verification badge.

- Featured practice areas are configurable (admin) or derived from demand.
- Cards show only `APPROVED` lawyers; ordering uses the ranking algorithm below (premium-boosted).
- "View more <Area> lawyers" links to `/lawyers?practiceArea=<Area>`.
- A generic "Find a Lawyer" CTA card (e.g. "Search from 15,000+ lawyers across 1000+ cities") links to full search.

> **Data source:** `GET /api/lawyers?practiceArea=<area>&sort=rating&limit=2` per featured area for the
> showcase; the homepage may cache these (Redis/ISR) and revalidate periodically.

## Search Types

- **Homepage search:** city + practice area → results.
- **Location search:** by city/state (target: district drill-down).
- **Practice-area search:** by one or more areas.
- **Combined + filters** on the results page.

## Results Page (Search) — UI + Backend Spec

The results page (e.g. `/lawyers/family-lawyers` or `/lawyers?practiceArea=Family`) is modeled on the
reference design: a **left filter sidebar** beside a **main column** of lawyer cards.

### Layout

```
┌──────────────┬────────────────────────────────────────────────┐
│  SEARCH      │  Home / Family Lawyers                          │
│ ┌──────────┐ │  Consult Best Family Lawyers / Advocates in India│
│ │Select City│ │  <intro paragraph for the practice area>        │
│ └──────────┘ │  👥 655+ Lawyers are online ●                    │
│ ┌──────────┐ │  [Divorce] [Criminal] [Property] [Civil]  ← chips│
│ │Family    ▾│ │                          📍 Lawyers near me >>   │
│ └──────────┘ │                                  ⌄ By Activity   │
│ Select courts│  ┌───────────────────────────────────────────┐  │
│ Select Exp.  │  │ [photo] Advocate Rajesh K.S   ★4.7 |200+   │  │
│ Languages ▣▣ │  │ 📍 SC Road, Bangalore    Practice area&skills│ │
│ Select Gender│  │ 💼 20 years Experience   Family +3 more     │  │
│ Select Rating│  │                          [ CONTACT LAWYER ] │  │
│ By Activity  │  └───────────────────────────────────────────┘  │
│ [ FILTER ]   │  ┌───────────────────────────────────────────┐  │
│ [ RESET ]    │  │ ... next lawyer card ...                  │  │
└──────────────┴────────────────────────────────────────────────┘
```

### Filter Sidebar (UI)

| Control | Type | Maps to query param | Source |
|---|---|---|---|
| Select City | dropdown | `city` | `City` reference data |
| Practice Area | dropdown | `practiceArea` | `PracticeArea` |
| Select Courts | dropdown | `court` | `Court` enum/reference |
| Select Experience | dropdown (ranges) | `experienceMin` (+`experienceMax`) | preset bands (0–5, 5–10, 10–20, 20+) |
| Languages | **multi-select chips** ("select any") | `language` (array → `IN`) | `Language` |
| Select Gender | dropdown | `gender` | `Gender` enum |
| Select Ratings | dropdown | `ratingMin` | 1–5 |
| By Activity | dropdown | `sort` | sort options |
| **FILTER** | button | submits all selected filters | — |
| **RESET** | button | clears filters → base results | — |

- Filters are **AND-combined**; multi-select fields (e.g. practice area, language) become arrays.
- Selecting a filter does not auto-submit; **FILTER** applies them (or apply-on-change is acceptable — pick one and keep it consistent). State is reflected in the URL query string for shareable/SEO links.
- **RESET** clears to the unfiltered practice-area/city context.

### Main Column (UI)

- **Breadcrumb:** `Home / <Practice Area> Lawyers`.
- **Heading + intro:** SEO copy per practice area (admin-editable).
- **"N+ Lawyers are online"** live count indicator.
- **Quick-filter chips:** popular related practice areas → one-click filter (`?practiceArea=`).
- **"Lawyers near me"** → geolocation-based `city`/proximity filter.
- **Sort control ("By Activity"):** see sort options below.
- **Lawyer cards** (vertical list), then **pagination**.

### Lawyer Card (UI)

Each card shows: photo, name (→ profile), star rating + review count, location, years of experience,
"Practice area & skills: X +N more", and a primary CTA button.

> **LawMitran semantics:** the card CTA is labelled **"Contact Lawyer"** (not "Book Now" — there is
> no in-app scheduling or consultation booking). It maps to **"Submit requirement"**: it opens the
> lead form (login required) and creates a `Lead` routed to that lawyer. LawMitran does **not** reveal
> a phone number or start an in-app call; the lawyer contacts the client after the lead. Any fee shown
> on a card/profile is an **indicative "Typical fee"**, confirmed by the lawyer on contact — not a
> charged booking amount. For **expired** lawyers the CTA becomes **"Request callback"** (held lead +
> alternatives) — see [20-winback-expired-contact.md](./20-winback-expired-contact.md).
> See [14-lead-management.md](./14-lead-management.md).

### Backend — Endpoint

`GET /api/lawyers` (public) powers the whole page. Query params:

```
GET /api/lawyers
  ?city=<id|slug>
  &practiceArea=<slug>[,<slug>]
  &court=<code>
  &experienceMin=<int>&experienceMax=<int>
  &language=<code>[,<code>]
  &gender=MALE|FEMALE|OTHER
  &ratingMin=<1-5>
  &sort=activity|rating|experience|relevance
  &page=1&limit=20
```

Response:

```json
{
  "data": [
    {
      "id": "uuid",
      "fullName": "Advocate Rajesh K.S",
      "profileImageUrl": "https://.../signed-or-public.jpg",
      "city": "Bangalore",
      "experienceYears": 20,
      "ratingAvg": 4.7,
      "ratingCount": 213,
      "practiceAreas": ["Family", "Divorce", "Civil", "Property"],
      "premium": true,
      "verified": true
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 655, "totalPages": 33 }
}
```

### Backend — Query rules

- **Hard filter:** `verificationStatus = APPROVED` always (never returns unverified/suspended).
- Apply each provided filter as an `AND`; multi-value params → `IN` clauses.
- `experienceMin/Max` → range on `Lawyer.experienceYears`.
- `gender` → `Lawyer.gender`; `court` → lawyer's courts; `language` → `LawyerLanguage` join; `practiceArea` → `LawyerPracticeArea` join; `city` → `Lawyer.cityId` (or `City`/`District` join for proximity).
- `ratingAvg`/`ratingCount` derived from `Rating` (aggregate or denormalized columns for performance).
- **Sort options:**
  - `activity` (default in this layout) — recency of lawyer activity/responsiveness (Phase 3: derived from lead responses); until then, falls back to `relevance`.
  - `rating` — `ratingAvg` desc (tie-break `ratingCount`).
  - `experience` — `experienceYears` desc.
  - `relevance` — full ranking score (see Ranking Algorithm), premium-boosted.
- **Premium boost** applies within every sort except explicit `experience`/`rating` ties.
- Paginate with `page`/`limit` (default 20, max 100); return `meta`.
- Cache hot filter combinations (Redis/ISR); the "N+ lawyers online" count can be a cached aggregate.

> **New `Lawyer` fields required** by the Gender/Courts filters (`gender`, `courts`) are specified in
> [04-database-design.md → Implementation Spec](./04-database-design.md#implementation-spec-ai-ready-prisma).

## Ranking Algorithm

Verified candidates are scored and ordered by:

1. **Verification gate (hard):** only `verificationStatus = APPROVED` are eligible — non-negotiable.
2. **Relevance:** practice-area and location match strength to the query.
3. **Premium boost:** premium-plan lawyers ranked above equivalent basic lawyers.
4. **Rating:** average score × confidence (review count).
5. **Experience:** years in practice.
6. **Freshness/activity:** responsiveness signals (Phase 3).

```
score = w1*relevance + w2*premium + w3*rating + w4*experience + w5*activity
```

Weights are tunable; premium never overrides the verification gate.

## Premium Ranking

- Premium lawyers get a boost in both search results and the homepage showcase.
- The boost is bounded so a low-rated premium lawyer can't outrank a far better basic lawyer arbitrarily.
- Expired/cancelled subscriptions lose the premium boost (and lead routing) but stay listed.

## Verification Rules in Search

- **Only `APPROVED`** lawyers are ever returned publicly.
- `PENDING`, `UNDER_REVIEW`, `REJECTED`, `SUSPENDED` are excluded entirely.
- A verification badge is shown on cards and profiles.

## Filtering, Sorting, Pagination

| Param | Values | UI control |
|---|---|---|
| `city` / `state` | reference data | Select City |
| `practiceArea` | one or more area slugs | Practice Area |
| `court` | court code | Select Courts |
| `experienceMin` / `experienceMax` | integer years (bands) | Select Experience |
| `language` | one or more language codes | Languages (multi-select chips) |
| `gender` | MALE \| FEMALE \| OTHER | Select Gender |
| `ratingMin` | 1–5 | Select Ratings |
| `sort` | activity \| rating \| experience \| relevance | By Activity |
| `page` / `limit` | pagination (limit ≤ 100) | (footer) |

All filters combine with `AND`; multi-value params use `IN`. `verificationStatus = APPROVED` is always
enforced server-side regardless of filters.

## SEO

- Public pages SSR/ISR with clean slugs (`/lawyers/<city>/<practice-area>`, `/lawyers/:id`).
- Per-page metadata + JSON-LD (`LegalService` / `Person`), sitemaps, canonical URLs.
- Showcase and profile pages indexable; dashboards `noindex`.
- Future: **ElasticSearch** for full-text, geo, and faceted search at scale.

---
**Related:** [09-client-module.md](./09-client-module.md) · [06-frontend-guidelines.md](./06-frontend-guidelines.md) · [14-lead-management.md](./14-lead-management.md)
