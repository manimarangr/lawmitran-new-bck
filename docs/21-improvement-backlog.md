# 21 — Improvement Backlog

A prioritized backlog of requirement-level improvements found while reviewing the docs, schema, and UI.
Each item lists the **gap**, the **change**, and **where** it lands (doc / schema / endpoint / UI). Priority:
**P1** = address before/at launch, **P2** = fast-follow, **P3** = later phase.

> This is a planning document. Items here are proposals to fold into the numbered docs and the roadmap,
> not yet-built features. Legal/regulatory notes are **not legal advice** — validate with an Indian
> advocate before launch.

## At a glance

| # | Theme | Priority | Headline |
|---|---|---|---|
| 1 | India compliance | **P1** | BCI advertising framing, DPDP consent, GST invoicing, DLT/WhatsApp |
| 2 | Trust & lead integrity | **P1** | Client-PII masking, contact confirmation, report/moderation, re-verification |
| 3 | Marketplace cold-start | **P2** | Claim-profile, provisional listing, referrals |
| 4 | Client-side depth | **P2** | Client dashboard: lead tracking, withdraw, re-engage |
| 5 | Monetization | **P2** | Hybrid pricing + lead caps; document↔lawyer cross-sell |
| 6 | Search & UX | **P2/P3** | Geo "near me", keyword search, structured reviews, i18n, a11y, WhatsApp/PWA |

---

## 1. India legal & regulatory compliance — **P1**

The single biggest gap: the plan treats LawMitran as a generic marketplace, but Indian legal-services
platforms operate under specific constraints.

### 1a. Bar Council of India (BCI) advertising / solicitation framing
- **Gap:** BCI rules (notably Rule 36 of the Standards of Professional Conduct) restrict advocates from
  advertising or soliciting work. "Top-rated," "Best lawyer," paid ranking boosts, displayed fees, and
  pay-per-lead can be construed as solicitation. Existing Indian platforms mitigate by positioning as a
  neutral **information directory** with prominent disclaimers.
- **Change:** Position LawMitran as an information platform; soften superlatives ("Top-rated" → "Verified
  lawyers" / "Experienced in …"); make displayed fees clearly **indicative**; keep ranking criteria
  transparent and merit-based.
- **Where:** new `docs/compliance` section (this doc + a note in [01-product-vision.md](./01-product-vision.md)
  and [15-search-and-matching.md](./15-search-and-matching.md)). **UI:** persistent footer disclaimer on
  all public pages; disclaimer on lawyer cards/profile ("Listing is not an endorsement or recommendation").

### 1b. DPDP Act 2023 — data privacy
- **Gap:** No consent capture, retention policy, or erasure flow, despite collecting client PII, lawyer
  IDs, and bar certificates.
- **Change:** Explicit consent at signup (purpose-scoped), data-retention windows, right-to-access and
  right-to-erasure, breach-notification process, named grievance officer.
- **Where:** extend [16-security.md](./16-security.md) with a Privacy section. **Schema:** add `Consent`
  (userId, purpose, version, grantedAt, revokedAt). **UI:** consent checkboxes at signup; "Download my
  data" / "Delete my account" in account settings; a real Privacy Policy page behind the footer link.

```prisma
model Consent {
  id        String    @id @default(uuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id])
  purpose   String    // TERMS, MARKETING, DATA_PROCESSING
  version   String    // policy version accepted
  grantedAt DateTime  @default(now())
  revokedAt DateTime?
  @@index([userId, purpose])
}
```

### 1c. GST & invoicing
- **Gap:** Subscriptions and document sales take money with no GST-compliant invoice.
- **Change:** Generate sequential tax invoices with GST breakup; store lawyer/firm GSTIN; show HSN/SAC.
- **Where:** [13-subscription-module.md](./13-subscription-module.md), [11-document-marketplace.md](./11-document-marketplace.md).
  **Schema:** `Invoice` model; `gstin` on `Lawyer`; tax fields on `Payment`/`CustomerDocument`. **UI:**
  invoice download in billing/orders.

### 1d. SMS DLT & WhatsApp BSP
- **Gap:** India mandates DLT-registered SMS sender IDs + templates, and an approved WhatsApp Business
  Solution Provider. Not flagged anywhere.
- **Change:** Register DLT templates for OTP/lead/digest; onboard a WhatsApp BSP; template approval lead
  time built into the launch plan.
- **Where:** [17-devops.md](./17-devops.md) (operational prerequisites) + notification consent/unsubscribe
  in [16-security.md](./16-security.md).

---

## 2. Trust, safety & lead integrity — **P1**

### 2a. Client-PII masking on contact
- **Gap:** The lead-gen model hands the client's phone/email straight to the lawyer.
- **Change:** Prefer **call-masking / proxy numbers** (e.g. via a telephony provider) so raw PII isn't
  shared; let the client set preferred contact method and time window.
- **Where:** [14-lead-management.md](./14-lead-management.md). **Schema:** `contactMethod`,
  `preferredTimeWindow`, optional `proxyNumber` on `Lead`. **UI:** contact-preference fields on the lead
  form.

### 2b. "Contacted" must be client-confirmed
- **Gap:** `PATCH /leads/:id/status → CONTACTED` is lawyer-asserted with no verification, inflating
  conversion and enabling abuse.
- **Change:** Add a client confirmation loop ("Did this lawyer contact you?") and **auto-close + review
  prompt** after an SLA window; only count confirmed contacts in metrics.
- **Where:** [14-lead-management.md](./14-lead-management.md). **Schema:** `clientConfirmedAt` on `Lead`.
  **UI:** confirmation prompt in the client dashboard + post-close rating CTA.

### 2c. Report / flag + review moderation
- **Gap:** No way for a client to report a lawyer; review trust relies only on the closed-lead gate.
- **Change:** Client-facing "Report this lawyer" with reasons; admin moderation queue for reports and
  reviews; lawyer right-to-reply on reviews.
- **Where:** [10-admin-module.md](./10-admin-module.md), [09-client-module.md](./09-client-module.md).
  **Schema:** `Report` (reporterId, lawyerId, reason, status); `reply` on `Rating`. **UI:** report modal
  on profile (built); admin moderation tab.

```prisma
model Report {
  id          String   @id @default(uuid())
  reporterId  String
  lawyerId    String
  reason      String   // FAKE_PROFILE, MISCONDUCT, WRONG_INFO, SPAM, OTHER
  details     String?
  status      String   @default("OPEN") // OPEN, REVIEWING, ACTIONED, DISMISSED
  createdAt   DateTime @default(now())
  @@index([lawyerId, status])
}
```

### 2d. Re-verification cadence
- **Gap:** Bar membership can lapse or be suspended; verification is one-time.
- **Change:** Periodic re-verification with `verificationExpiresAt`; auto-flag to `UNDER_REVIEW` on expiry.
- **Where:** [08-lawyer-module.md](./08-lawyer-module.md). **Schema:** `verificationExpiresAt` on `Lawyer`.

---

## 3. Marketplace cold-start & lawyer supply — **P2**

A two-sided marketplace is supply-constrained at launch; nothing in the plan bootstraps lawyer supply.

- **Claim-your-profile:** pre-seed lightweight, `UNCLAIMED` profiles from public data; a lawyer claims
  and verifies. Drives early SEO + supply. **Schema:** `claimStatus` on `Lawyer` (UNCLAIMED/CLAIMED).
- **Provisional listing during review:** approved-pending lawyers appear greyed/limited rather than
  invisible for days (reuse the win-back "unavailable" treatment).
- **Referral program:** lawyer- and client-referral codes with incentives. **Schema:** `Referral`.
- **Where:** [01-product-vision.md](./01-product-vision.md) (GTM), [08-lawyer-module.md](./08-lawyer-module.md).

---

## 4. Client-side product depth — **P2**

- **Gap:** Clients can search, bookmark, submit a lead, and buy docs, but there's no dashboard to track
  outcomes — the core of their experience after submitting.
- **Change:** A **client dashboard**: submitted requirements with live status, which lawyers responded,
  confirm-contact, withdraw a lead, re-engage/alternatives, rate after close, saved searches, bookmarks,
  and document orders.
- **Where:** expand [09-client-module.md](./09-client-module.md). **Endpoints:** `GET /api/leads/me`
  (exists), add `PATCH /api/leads/:id/withdraw`, `POST /api/leads/:id/confirm-contact`. **UI:**
  `client-dashboard.html` (built as a stub).

---

## 5. Monetization options — **P2**

- **Hybrid pricing + lead caps:** keep Basic/Premium subscriptions but add **lead caps per tier** (Basic
  = N leads/month, Premium = unlimited + boost) and/or **lead credits / pay-per-contact** for high-intent
  leads. Pure subscription under-monetizes demand and gives weak upgrade levers.
  **Where:** [13-subscription-module.md](./13-subscription-module.md). **Schema:** `monthlyLeadCap` on
  plan; `leadCreditBalance` on `Lawyer`.
- **Document ↔ lawyer cross-sell:** "Buy this template **+** have a verified lawyer review it" — links the
  two revenue lines and raises AOV. **Where:** [11-document-marketplace.md](./11-document-marketplace.md).

---

## 6. Search & UX — **P2 / P3**

- **Geo "lawyers near me" (P2):** `Lawyer.latitude/longitude` already exist but radius search isn't
  specified. Add `?lat=&lng=&radiusKm=` to `GET /api/lawyers`. **Where:** [15-search-and-matching.md](./15-search-and-matching.md).
- **Keyword / "describe your issue" search (P2):** ship a simple free-text match over practice-area names
  + `LawyerPracticeArea.skills[]` in Phase 1, without waiting for AI intake (Phase 3).
- **Structured reviews (P2):** sub-scores (communication / expertise / value) + verified-client badge +
  lawyer reply. **Schema:** add sub-score columns or a `RatingAspect` table.
- **i18n — Hindi + regional (P2):** English-only undercuts the "Justice Made Accessible" positioning;
  plan a localization layer. **Where:** [06-frontend-guidelines.md](./06-frontend-guidelines.md).
- **Accessibility / WCAG pass (P2):** audit the UI (contrast, focus order, labels, keyboard nav).
- **WhatsApp-first + PWA (P2/P3):** given India's mobile-first, WhatsApp-heavy base, deliver OTP and
  lead/digest alerts via WhatsApp and ship a PWA before the Phase-4 native app. **Where:**
  [17-devops.md](./17-devops.md), [18-roadmap.md](./18-roadmap.md).

---

## Suggested phasing

| Phase | Add from this backlog |
|---|---|
| **1 (launch)** | 1a disclaimers/framing · 1b consent capture · 2a PII masking (or "contact shown after submit") · 2b contact-confirmation · footer disclaimer · client dashboard basics |
| **2 (fast-follow)** | 1c GST invoicing · 1d DLT/WhatsApp · 2c report/moderation · 2d re-verification · 3 cold-start · 5 pricing/cross-sell · 6 geo + keyword search |
| **3+** | 6 structured reviews · i18n · a11y depth · WhatsApp/PWA · AI intake (existing Phase 3) |

---
**Related:** [01-product-vision.md](./01-product-vision.md) · [09-client-module.md](./09-client-module.md) · [13-subscription-module.md](./13-subscription-module.md) · [14-lead-management.md](./14-lead-management.md) · [15-search-and-matching.md](./15-search-and-matching.md) · [16-security.md](./16-security.md) · [18-roadmap.md](./18-roadmap.md)
