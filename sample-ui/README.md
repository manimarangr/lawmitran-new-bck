# LawMitran — Sample UI

Static, brand-accurate HTML prototypes for the LawMitran marketplace. These are **design references**
for developers building the real Next.js app — every page maps to the documented API
([`../docs/`](../docs/)) and the Prisma schema (`../backend/prisma/schema.prisma`).

## How to view

Open any `.html` in a browser. Pages load Tailwind, FontAwesome, Google Fonts, Leaflet, and Chart.js
from CDNs, so **view them online** (offline, styles/maps/charts won't load). No build step.

## Conventions

- **Brand:** navy `#0B192C` / `#1E3E62`, gold `#C9A24B`, Inter font, "Law·mitran" wordmark.
- **Copyright-safe:** all visuals are inline SVG / initials avatars — no stock photos. Logo is also at
  `assets/logo.svg` (+ `logo-light.svg` for dark backgrounds).
- **Sample only:** lawyers, reviews, and stats are placeholders; forms show the target API call via an
  `alert()` and don't post anywhere.

## Public site

| Page | Purpose | Primary API |
|---|---|---|
| `index.html` | Homepage: dark hero, 3-field search, practice areas, featured lawyers, documents | `GET /api/lawyers?...` (showcase) |
| `lawyer-search.html` | List search + filter sidebar + result cards + pagination | `GET /api/lawyers` (filters, sort, page) |
| `lawyer-search-map.html` | Map view (Leaflet/OSM) with synced cards ↔ avatar pins | `GET /api/lawyers` (uses `latitude`/`longitude`) |
| `lawyer-details.html` | Public profile: about, practice areas + proficiency, reviews, contact card | `GET /api/lawyers/:id`, `GET /api/lawyers/:id/reviews` |
| `lawyer-profile.html` | Earlier vanilla-CSS profile (superseded by `lawyer-details.html`) | `GET /api/lawyers/:id` |
| `search-results.html` | Earlier vanilla-CSS list search (superseded by `lawyer-search.html`) | `GET /api/lawyers` |

The "Contact" CTA opens the **lead form** → `POST /api/leads` (lead-gen model; no phone reveal by default).

## Auth & onboarding

| Page | Purpose | Primary API |
|---|---|---|
| `login.html` | Sign in (email/mobile + password), forgot-password, **Admin portal** link | `POST /api/auth/login` |
| `signup.html` | Client/Lawyer role toggle → routes to OTP | `POST /api/auth/register` |
| `client-otp.html` | 4-digit mobile OTP for clients | `POST /api/auth/mobile/verify-otp` · `…/send-otp` |
| `lawyer-signup.html` | LawRato-style lawyer acquisition (hero + form + value props) | `POST /api/auth/register` (role LAWYER) |
| `lawyer-signup-otp.html` | Lawyer OTP step → onboarding | `POST /api/auth/mobile/verify-otp` |
| `lawyer-onboarding.html` | 3-step wizard: bar details → photo/docs → practice & review | `POST /api/lawyers`, `…/me/verification` |
| `lawyer-documents.html` | Standalone photo + Bar certificate + ID upload (live preview, validation) | upload → S3, `POST /api/lawyers/me/verification` |
| `lawyer-practice-review.html` | Practice areas + review summary → submit for verification | `POST /api/lawyers/me/verification` |
| `lawyer-plan.html` | Plan selection (Trial / Basic / Premium) | `POST /api/payments/subscription/order` |

**Flow:** `signup` → (client) `client-otp` / (lawyer) `lawyer-signup-otp` → `lawyer-onboarding`
(→ `lawyer-documents`, `lawyer-practice-review`) → `lawyer-plan`. Mobile OTP is the blocking gate;
lawyers then submit bar details + photo for admin review (`PENDING → UNDER_REVIEW → APPROVED`).

## Admin console (role `ADMIN`)

Shared navy sidebar; reachable via the **Admin portal** link on `login.html`.

| Page | Purpose | Primary API |
|---|---|---|
| `admin-dashboard.html` | KPIs, approval queue preview, recent activity | `GET /api/admin/reports` (summary) |
| `admin-lawyers.html` | Approval queue → automated pre-checks + **document viewer** (photo/cert/ID) → approve/reject/suspend | `GET /api/admin/lawyers?status=`, `PATCH /api/admin/lawyers/:id/verification` |
| `admin-users.html` | Users table (CRUD): view/edit, reset password, suspend, **soft-delete** | `GET/POST/PATCH /api/admin/users`, `…/:id/reset-password` |
| `admin-documents.html` | Category-wise template manager: draft/publish/archive, versions, upload | `GET/POST/PATCH /api/admin/categories`, `…/templates` |
| `admin-plans.html` | Manage `SubscriptionPlanPrice` (Basic/Premium) | `GET/POST/PATCH /api/admin/plans` |
| `admin-reports.html` | Analytics (Chart.js): funnels, revenue mix, leads by city, CSV export | `GET /api/admin/reports?export=csv` |

Admin rules enforced in the UI copy: **soft-delete not hard-delete**, **human review required for
APPROVED** (truthy ≠ verified), **template versioning**, and **every write → `AuditLog`**. See
[`../docs/10-admin-module.md`](../docs/10-admin-module.md) and [`../docs/16-security.md`](../docs/16-security.md).

## Mockups & assets

| Path | What |
|---|---|
| `assets/logo.svg`, `assets/logo-light.svg` | LawMitran logo (light/dark) |
| `styles.css` | Shared design tokens for the vanilla-CSS pages (`index`, `search-results`, `lawyer-profile`) |
| `mockups/home-dark-mockup.svg` | Dark-theme homepage concept (SVG) |

## Wiring to the backend (for developers)

1. Replace each `alert(...)` / `onsubmit` stub with a real `fetch` to the endpoint in the tables above.
2. Render lists from API data instead of the inline `const lawyers = [...]` / `const users = [...]` arrays.
3. In `admin-lawyers.html`, swap `docSVG()` for the real document: `GET /api/admin/lawyers/:id/documents`
   returns **short-lived signed URLs**; render `<img>` / PDF embed in the viewer stage.
4. Gate `admin-*` pages behind `@Roles(ADMIN)`; gate dashboards behind a valid JWT.
5. Public pages (`index`, search, profile, document catalog) stay unauthenticated for SEO — render SSR/ISR.

See [`../docs/05-api-design.md`](../docs/05-api-design.md) for the full endpoint reference.
