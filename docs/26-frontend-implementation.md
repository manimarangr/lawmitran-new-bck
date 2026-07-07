# 26 — Frontend Implementation (Next.js app)

What's actually **built in the `frontend/` workspace** — the real Next.js App Router app wired to the
NestJS API. This complements the design docs (which describe the target) by recording the concrete
routes, API layer, and auth model as implemented.

## Stack

- **Next.js 16** (App Router, RSC) · **React 19** · **TypeScript**
- **Tailwind CSS 4** (`app/globals.css`, `@import "tailwindcss"`)
- **@tanstack/react-query** (server-state, in `app/providers.tsx`)
- **react-hook-form + zod** (forms/validation) · **zustand** (client state, e.g. lawyer search store)
- **@vis.gl/react-google-maps** (map search)

Config: `NEXT_PUBLIC_API_URL` (default `http://localhost:3001/api`), `NEXT_PUBLIC_SITE_URL`
(canonical/OG base, default `https://www.lawmitran.com`).

## Route map

Route groups: `(auth)` (centered card), `(public)` (indexable), `(dashboard)` (auth-guarded).

| Route | Group | Type | Notes |
|---|---|---|---|
| `/` | – | – | Home |
| `/lawyers` | public | client | Search + map (existing) |
| `/lawyers/[city]/[area]` | public | **SSR/ISR** | **SEO landing** — metadata + Breadcrumb/FAQ JSON-LD + lawyer list + internal links |
| `/lawyer/[slug]` | public | **SSR** | **SEO profile by slug** — metadata + `Attorney` JSON-LD |
| `/login` | auth | client | Password login → stores tokens |
| `/signup` | auth | client | Role toggle → `POST /auth/register` → OTP; field-specific duplicate errors |
| `/verify-otp` | auth | client | 6-digit, WhatsApp-first, 30s resend → `verify-otp` → `/login?verified=1` |
| `/forgot-password`, `/reset-password` | auth | client | Existing, wired to auth API |
| `/dashboard/lawyer` | dashboard | client | Lead inbox; reveal-contact (subscription-gated), status mutations; **onboarding prompt if no profile** |
| `/dashboard/client` | dashboard | client | `/leads/me` + confirm-contact + withdraw |
| `/dashboard/onboarding` | dashboard | client | Lawyer profile creation (Bar details + practice areas + city + certificate upload) |
| `/dashboard/plan` | dashboard | client | Subscription plans + duration tiers + GST → **Razorpay checkout** → verify → activate |
| `/dashboard/settings` | dashboard | client | Avatar, change password, change mobile (OTP), delete account |
| `/dashboard/notifications` | dashboard | client | List + mark read/all |
| `/admin/approvals` | admin | client | Lawyer approval queue → approve/reject |
| `/admin/users` | admin | client | List users, suspend/reactivate (role filter) |
| `/admin/plans` | admin | client | Edit plan price + monthly lead cap |
| `/admin/moderation` | admin | client | Report queue → action/dismiss + suspend |
| `/sitemap.xml` | – | route | Dynamic, from `GET /api/seo/sitemap` |
| `/robots.txt` | – | route | Disallows `/dashboard /admin /settings /api /login /signup` |

Root `app/layout.tsx` sets SEO base metadata (title template, `metadataBase`, OG/Twitter, robots).

## API layer (`lib/api/`)

- **`client.ts`** — `authFetch` (attaches bearer token, redirects to `/login` on 401), `getToken`,
  `clearSession`.
- **`auth.ts`** — `login`, `register`, `sendMobileOtp`, `verifyMobileOtp`, `forgotPassword`, `resetPassword`.
- **`lawyers.ts`** — public `fetchLawyers`/`fetchLawyerMarkers`/`fetchLawyerProfile`; authed
  `createLawyerProfile` (multipart), `getMyProfile`.
- **`leads.ts`** — lawyer inbox + status + reveal; client `fetchMyLeads`/confirm/withdraw.
- **`subscriptions.ts`** — `fetchMySubscription`.
- **`users.ts`** — `getMe`, password/mobile change, `uploadAvatar` (multipart), delete, notifications.
- **`seo.ts`** — server fetchers: `getLawyerBySlug`, `getLanding`, `getSitemapFeed`, `getLawyers` (ISR-cached).

Types in `types/lawyer.ts`, `types/lead.ts`, `types/user.ts`.

## Auth / session model (current)

- Login/refresh return **access + refresh tokens**; stored in `localStorage` (`accessToken`/`refreshToken`).
- `authFetch` sends `Authorization: Bearer <access>` and, on **401**, clears the session and redirects to
  `/login`. **OTP verification does not issue a session** — after verifying, the user signs in.
- `(dashboard)/layout.tsx` guards routes (bounces to `/login` without a token) and provides the nav + logout.

> **Production hardening (not yet done):** move tokens to **httpOnly cookies** + silent refresh (localStorage
> is XSS-exposed), and add CSRF protection. Tracked as a follow-up.

## SEO (implemented)

Slugged URLs, per-page `generateMetadata` (title/description/canonical/OG), **JSON-LD** (BreadcrumbList,
Attorney/ItemList, FAQPage), **ISR** on landing pages (`revalidate`), dynamic **sitemap** + **robots**.
Full strategy: [24-seo-and-landing-pages.md](./24-seo-and-landing-pages.md).

## Wired vs remaining

**Wired to the live API:** signup → OTP → login → password reset · lawyer onboarding/profile submit ·
lawyer lead inbox (reveal/status) · client requirements (confirm/withdraw) · settings (password/mobile/
avatar/delete) · notifications · search · SEO routes · **subscription plan + Razorpay checkout**
(`/dashboard/plan` — duration tiers + GST → `POST /subscriptions/checkout` → Razorpay → verify → activate) ·
**admin console** (approvals, users, plans, moderation) · **in-app reports** (client↔lawyer, `ReportModal`
→ `POST /reports`, counterparty auto-resolved from the lead).

**Remaining (follow-ups):**
- **reCAPTCHA** on signup (currently a placeholder `captchaToken`).
- **httpOnly-cookie session hardening** (tokens are in `localStorage` today).
- Admin **document/template** management page (backend `documents` module still a stub).

## Run

```bash
# backend (once): from backend/
npx prisma migrate dev && npx prisma generate && npm run prisma:seed
npm run dev:backend            # http://localhost:3001/api

# frontend: from repo root
# set frontend/.env.local → NEXT_PUBLIC_API_URL=http://localhost:3001/api
npm run dev:frontend           # http://localhost:3000
```

---
**Related:** [03-system-architecture.md](./03-system-architecture.md) · [05-api-design.md](./05-api-design.md) · [06-frontend-guidelines.md](./06-frontend-guidelines.md) · [24-seo-and-landing-pages.md](./24-seo-and-landing-pages.md) · [MVP-launch-checklist.md](./MVP-launch-checklist.md)
