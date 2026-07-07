# 22 — Decisions Log (finalized requirements)

A single, consolidated record of the product/engineering decisions **finalized in this cycle**, with links
to the detailed spec docs. Use this as the quick "what did we decide and why" reference; the numbered docs
remain the authoritative detail.

---

## 1. Authentication & signup

- **Signup = two pages, then a document-upload step.** Page 1 collects the account (name, email, mobile,
  password) and — for lawyers — professional details (**Bar Council enrollment number**, state,
  experience, **primary city**, and **areas of practice as a multi-select, up to 5**). Page 2 verifies the
  mobile via OTP. After OTP, lawyers upload **profile photo + Bar Council certificate**. → [02](./02-business-rules.md), [08](./08-lawyer-module.md)
- **Verification by OTP at signup only; password-only login.** A mobile OTP is sent **once at signup** to
  verify the number (both CLIENT and LAWYER). **Login never sends an OTP** — password only — so SMS cost is
  ~1 per user for life. Password reset uses a free email link. → [02](./02-business-rules.md), [16](./16-security.md)
- **OTP delivery is WhatsApp-first, SMS fallback** (WhatsApp is far cheaper in India). 6-digit code. → [16](./16-security.md)
- **OTP hardened:** stored as a **hash**, generated with `crypto.randomInt`, 5-min expiry, 30s resend
  cooldown, 5-attempt lockout (15 min). → [16](./16-security.md)
- **Email verification is a soft prompt** — it does not block login. Mobile OTP is the account gate. → [02](./02-business-rules.md)
- **Duplicate handling:** signup returns a **field-specific 409** (`{ message, fields:['email'|'mobile'] }`)
  checked **at submit** (no as-you-type lookup). Forgot-password stays enumeration-neutral. → [16](./16-security.md)
- **No ID-card upload.** Identity is verified by matching the **enrollment number** against the Bar Council
  certificate. (Removed `Lawyer.identityCardImageUrl`.) → [02](./02-business-rules.md), [08](./08-lawyer-module.md)
- **Trial length is configurable** via `TRIAL_DAYS` (default **30**; can set 15). → [13](./13-subscription-module.md)

## 2. Verification responsibility

- **Admin approves lawyers only.** Clients are **auto-active** the moment their mobile OTP passes — there is
  **no client-approval queue**. Client trust is handled by OTP + reCAPTCHA + lead rate-limits/dedupe, and
  **reactive suspension** (`UserStatus = SUSPENDED`), never up-front approval. → [02](./02-business-rules.md), [10](./10-admin-module.md)
- **Two independent gates:** *account-verified* (mobile OTP) lets a user log in; *professionally-verified*
  (`Lawyer.verificationStatus = APPROVED`) is the only gate for public search visibility + lead routing. → [02](./02-business-rules.md)

## 3. Subscriptions & monetization

- **Duration tiers:** each plan is sold for **30 days / 3 months / 6 months / 1 year**, longer terms
  discounted. Priced via `SubscriptionPlanTier` (`planName`+`durationDays` → `amount`). Checkout reads the
  tier price; the client never sets the amount. → [13](./13-subscription-module.md)
- **GST:** tier prices are GST-exclusive; **18% GST** is added at checkout and shown (base + GST = total).
  GST invoice issued (invoicing specced in the backlog). → [13](./13-subscription-module.md), [21](./21-improvement-backlog.md)
- **Monthly lead cap per plan:** `SubscriptionPlanPrice.monthlyLeadCap` (Basic = **25/mo**, Premium =
  **unlimited**). Enforced in lead routing; TRIAL = unlimited. → [13](./13-subscription-module.md), [14](./14-lead-management.md)
- **Contact reveal is subscription-gated (server-side).** Only `TRIAL`/`ACTIVE` lawyers can reveal a
  client's contact; `EXPIRED`/no-plan get a 403 and a **benefits prompt** to subscribe. Every reveal is
  written to `AuditLog` (`LEAD_CONTACT_REVEALED`). → [08](./08-lawyer-module.md), [13](./13-subscription-module.md)
- **Pending lawyers can pre-subscribe** while under review, so they're active the moment they're approved. → [13](./13-subscription-module.md)
- **Renewal reminders (email + WhatsApp)** at **T-30 / T-15 / expiry** (`RENEWAL_REMINDER_DAYS`, default
  `30,15,0`) for both trials and paid subscriptions. → [13](./13-subscription-module.md)
- **Win-back on expiry:** contact gated, client interest **held**, lawyer gets an aggregated PII-safe
  "N clients waiting — renew" digest; held leads released on renewal. → [20](./20-winback-expired-contact.md)

## 4. Leads & client experience

- **Lead-gen model (unchanged), CTA = "Contact Lawyer"** (no in-app booking/scheduling). Any fee shown is
  an indicative **"Typical fee,"** confirmed by the lawyer. → [15](./15-search-and-matching.md)
- **Client-confirmed contact:** `POST /api/leads/:id/confirm-contact` records `clientConfirmedAt` so only
  client-confirmed contacts count as conversions (the lawyer-set `CONTACTED` alone is not trusted). → [14](./14-lead-management.md)
- **Client can withdraw:** `PATCH /api/leads/:id/withdraw` → `CLOSED` (`closedReason=WITHDRAWN`). Every
  transition writes `LeadHistory`. → [14](./14-lead-management.md)
- **Client dashboard** (`client-dashboard.html`) tracks submitted requirements, responses, confirm-contact,
  withdraw, and post-close rating. → [09](./09-client-module.md)

## 5. Search & discovery

- **Quick search = City + Practice Area only.** Language and other attributes moved to the results-page
  **Advanced filters**; **Language is a multi-select** ("select any"). → [15](./15-search-and-matching.md)
- Expired lawyers stay listed (SEO) but rank lower and show "Currently unavailable" + "Request callback". → [20](./20-winback-expired-contact.md)

## 6. Lawyer dashboard (post-login home)

- New `lawyer-dashboard.html` is the post-login home: **state-aware** —
  - `PENDING/UNDER_REVIEW` → verification banner, empty inbox, **pre-subscribe** prompt.
  - `APPROVED + TRIAL/ACTIVE` → live **lead inbox** (reveal contact, mark contacted/closed, notes).
  - `APPROVED + EXPIRED/free` → inbox visible but contacts **locked** + benefits prompt.
  → [08](./08-lawyer-module.md)

## 7. Account: notifications, settings, two-sided reports

- **In-app notifications** for both roles: subscription reminders/status, new lead, lead contacted/confirmed,
  report updates. `GET /api/users/me/notifications` + mark-read. UI: `notifications.html`. → [05](./05-api-design.md), [08](./08-lawyer-module.md), [09](./09-client-module.md)
- **Account settings** (`settings.html`): **change password** (verifies current, revokes other sessions),
  **change mobile** (OTP to the new number), **profile picture** upload, **delete account** (soft delete +
  session revoke). New `User` fields: `avatarUrl`, `status` (`UserStatus`), `deletedAt`, `pendingMobile`.
- **Two-sided reporting + admin moderation.** A client can report a lawyer and a lawyer can report a client
  about a contacted lead (`Report` model). Admin reviews in `admin-moderation` → action/dismiss + optional
  **suspend**, all audit-logged. → [10](./10-admin-module.md), [21](./21-improvement-backlog.md)

## 8. Compliance & legal (India)

- **BCI framing:** LawMitran is an **information platform, not a law firm**; listings/rankings are
  informational, not endorsements or solicitation. Persistent footer disclaimer on public pages; dedicated
  **Disclaimer, Privacy Policy, Terms, Refund** pages. → [21](./21-improvement-backlog.md)
- **DPDP consent** captured at signup (granular: required Terms+Privacy & data-processing, optional
  marketing). → [21](./21-improvement-backlog.md)
- **Report a lawyer** action + admin moderation (proposed) — client-facing report modal built. → [21](./21-improvement-backlog.md)

## 8b. Frontend (Next.js) — built this cycle

The `frontend/` Next.js 16 app was wired to the live API: SEO routes (`/lawyers/[city]/[area]`,
`/lawyer/[slug]`, sitemap, robots, root metadata), the auth flow (signup → OTP → login, password reset),
lawyer + client dashboards (lead inbox with subscription-gated reveal, confirm/withdraw), lawyer
onboarding/profile submit, settings (password/mobile-OTP/avatar/delete), and notifications — all via a
shared `authFetch` + react-query pattern. Session tokens are in `localStorage` today (httpOnly-cookie
hardening is a follow-up). Full detail: [26-frontend-implementation.md](./26-frontend-implementation.md).

## 9. Config flags introduced

| Env | Default | Purpose |
|---|---|---|
| `TRIAL_DAYS` | `30` | Free-trial length |
| `RENEWAL_REMINDER_DAYS` | `30,15,0` | Renewal reminder offsets (days before end) |
| `WINBACK_DIGEST_CRON` / `WINBACK_*` | see [20](./20-winback-expired-contact.md) | Win-back digest cadence/limits |

## 10. Schema changes applied this cycle

- `Lawyer`: **removed** `identityCardImageUrl`; location/gender/bio/rating already normalized.
- `SubscriptionPlanTier` (new); `SubscriptionPlanPrice.monthlyLeadCap` (new).
- `Lead`: `clientConfirmedAt`, `closedReason`.
- `User` OTP hardening: `mobileOtpHash`, `mobileOtpAttempts`, `mobileOtpLockedUntil`, `mobileOtpLastSentAt`
  (replacing plaintext `mobileOtpCode`).
- `User` account fields: `avatarUrl`, `status` (`UserStatus` enum), `deletedAt` (soft delete), `pendingMobile`.
- `Report` model + `ReportStatus` enum (two-sided reporting); `Notification` model already present.
- Seed (`prisma/seed.ts`): plan base prices + lead caps + duration tiers.

> **Migration:** run `npx prisma migrate dev` + `npx prisma generate`, then `npm run prisma:seed` from
> `backend/`.

---
**Related:** [02](./02-business-rules.md) · [08](./08-lawyer-module.md) · [13](./13-subscription-module.md) · [14](./14-lead-management.md) · [15](./15-search-and-matching.md) · [16](./16-security.md) · [20](./20-winback-expired-contact.md) · [21](./21-improvement-backlog.md)
