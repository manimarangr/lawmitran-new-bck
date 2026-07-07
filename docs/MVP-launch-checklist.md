# MVP Launch Checklist

A focused, ship-oriented cut of everything specced across the docs. The goal: get the **core loop** live
in **one city + one practice area**, not build the whole vision at once. Use this as the go/no-go list.

> **The one loop that must work:** a client submits a requirement → it routes to a **verified, subscribed**
> lawyer as a lead → the lawyer reveals the contact and reaches out. Plus lawyer signup, verification, and
> subscription. Everything else waits.

---

## 1. Scope — in vs out

### ✅ In scope (MVP)
- [ ] Client: browse/search verified lawyers, view profile, **submit a requirement (lead)** — no login to browse; login to submit.
- [ ] Client signup/login: **mobile OTP at signup**, password-only login ([02](./02-business-rules.md), [16](./16-security.md)).
- [ ] Lawyer signup (2 pages) → OTP → **photo + Bar Council certificate** upload ([08](./08-lawyer-module.md)).
- [ ] **Admin lawyer approval** queue (approve/reject/suspend) — the trust gate ([10](./10-admin-module.md)).
- [ ] Lawyer **dashboard + lead inbox**: reveal contact (subscription-gated), mark contacted/closed ([08](./08-lawyer-module.md)).
- [ ] Lawyer **subscription**: 30-day trial → Basic/Premium, duration tiers, Razorpay, GST ([13](./13-subscription-module.md)).
- [ ] Ratings on closed leads ([14](./14-lead-management.md)).
- [ ] Compliance basics: disclaimer, Privacy/Terms/Refund pages, DPDP consent ([21](./21-improvement-backlog.md)).

### ⏸ Out of MVP (Phase 2/3 — specced, defer)
- Document marketplace + generation ([11](./11-document-marketplace.md)) → Phase 2.
- AI intake / chatbot ([12](./12-ai-module.md)) and **client membership** ([23](./23-client-membership.md)) → Phase 3.
- **Law firms** as a user type → Phase 2/3.
- Win-back held-lead digests ([20](./20-winback-expired-contact.md)) → fast-follow (nice, not launch-blocking).
- Advanced geo / map "near me" ([15](./15-search-and-matching.md)) → can ship city-filter first, add radius later.
- ElasticSearch, microservices, mobile app, 10k-scale infra ([19](./19-scalability.md)) → Phase 4.

---

## 2. Build checklist (prototype → product)

### Frontend (the biggest gap)
- [ ] **Scaffold the Next.js `frontend` workspace** (it doesn't exist yet — only static `sample-ui/` mocks).
- [ ] Port the ~8 core pages from `sample-ui/` and **wire them to the API**: home, search results, lawyer profile, lead form, signup, OTP, login, lawyer dashboard.
- [ ] Real auth token storage + refresh flow; role-based routing.

### Backend (finish MVP-critical stubs)
- [ ] `admin` module — lawyer approval queue + user management (currently a stub).
- [ ] `users` module — profile, bookmarks, notifications (currently a stub).
- [ ] Confirm `auth`, `lawyers`, `leads`, `ratings`, `subscriptions` (already implemented) cover the MVP endpoints in [05](./05-api-design.md).
- [ ] `documents` / `ai-intake` — leave as stubs for MVP.

### Data & verification
- [ ] Run `npx prisma migrate dev` + `npx prisma generate`.
- [ ] Run `npm run prisma:seed` (plan prices, lead caps, duration tiers).
- [ ] `npm test` (auth, leads, subscriptions specs) + a smoke e2e of the core loop.

---

## 3. Compliance gate (must clear before launch) — **P1**
- [ ] **Advocate review** of the BCI "information platform, not a law firm" positioning, ranking/fee display, and the Disclaimer/Terms/Privacy/Refund page drafts.
- [ ] **DPDP:** persist consent (build the `Consent` model), publish the real Privacy Policy, wire "delete my account / data" ([21 §1b](./21-improvement-backlog.md)).
- [ ] **GST invoicing** on subscriptions ([21 §1c](./21-improvement-backlog.md)).
- [ ] **SMS DLT + WhatsApp BSP** approved for OTP/lead/reminder templates ([21 §1d](./21-improvement-backlog.md)) — lead time is weeks, start early.

---

## 4. Cold-start & go-to-market
- [ ] **Launch narrow:** pick **one city + one practice area** (e.g. Family Law, Bengaluru) for liquidity.
- [ ] **Supply first:** onboard the first **50–100 verified lawyers** before opening to clients (manual outreach + claim-profile). A marketplace with no lawyers converts no clients.
- [ ] Payment gateway (Razorpay) live keys + webhook verified.
- [ ] Transactional channels live: email (verification/reset/reminders) + WhatsApp/SMS (OTP/leads).
- [ ] Basic analytics on the funnel: signups, approvals, leads, lead→contact, subscription conversion.

---

## 5. Pre-launch QA & ops
- [ ] Security pass: rate limits on auth/OTP, refresh rotation, S3 signed URLs, input validation ([16](./16-security.md)).
- [ ] Error monitoring + logs + uptime check.
- [ ] Backups for Postgres; secrets in env, not code.
- [ ] Load sanity check on search + lead submit (don't need full 10k infra for MVP — [19](./19-scalability.md) is later).

---

## Definition of "ready to launch"
The core loop works end-to-end in the pilot city: a real client can find a verified lawyer, submit a
requirement, and that subscribed lawyer receives it and reveals the contact — with payments, OTP, admin
approval, and the compliance pages all live and advocate-reviewed.

---
**Related:** [01](./01-product-vision.md) · [02](./02-business-rules.md) · [05](./05-api-design.md) · [08](./08-lawyer-module.md) · [13](./13-subscription-module.md) · [18-roadmap.md](./18-roadmap.md) · [21](./21-improvement-backlog.md) · [22-decisions-log.md](./22-decisions-log.md)
