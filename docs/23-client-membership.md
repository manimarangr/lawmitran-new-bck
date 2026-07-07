# 23 — Client Membership (AI assistant + document generation)

A **freemium client membership** that monetizes the demand side without hurting the core funnel. Today
clients are entirely free; this adds an optional low-cost plan that bundles two self-serve tools — an **AI
legal chatbot** and **dynamic legal-document generation** (affidavits, agreements, notices) with download.

> **Guiding principle: keep "find a lawyer" free.** Submitting a requirement / lead stays free forever —
> that's the top of the funnel. Membership monetizes the *self-serve tools*, and every tool cross-sells
> back into the lead-gen (e.g. "get a verified lawyer to review this document").

Builds on [11-document-marketplace.md](./11-document-marketplace.md) (templates + `CustomerDocument`) and
[12-ai-module.md](./12-ai-module.md) (assistant/RAG).

## Free vs paid

| Capability | Free | Membership (paid) |
|---|---|---|
| Browse lawyers, submit requirements/leads | ✅ | ✅ |
| Bookmarks, lead tracking, ratings | ✅ | ✅ |
| Buy a document pay-per-use | ✅ | ✅ (included up to quota) |
| **AI legal chatbot** | Taster (e.g. 3 questions/mo) | ✅ up to plan quota |
| **Generate + download documents** | 1 free/mo (or pay-per-use) | ✅ included up to plan quota |
| e-Stamp / e-Sign / physical delivery | Paid add-on | Paid add-on (member discount) |

**Rationale for keeping stamping/delivery as add-ons:** they carry real third-party cost (e-stamp duty,
courier, Aadhaar e-sign) — bundling them into a flat fee would lose money.

## Plans

| Plan | Price (indicative, excl. GST) | AI questions/mo | Doc generations/mo | Notes |
|---|---|---|---|---|
| **Free** | ₹0 | 3 (taster) | 1 | Default for every client |
| **Basic** | ₹99/mo | 25 | 5 | Casual/individual use |
| **Plus** | ₹199/mo | Unlimited* | Unlimited* | Landlords, small businesses, frequent users |

\* "Unlimited" is fair-use rate-limited to control LLM cost (see below). Duration tiers (3/6/12-month,
discounted) can reuse the same mechanism as lawyer plans — see [13-subscription-module.md](./13-subscription-module.md).

## Feature 1 — AI legal chatbot

- **Scope:** answers **general legal questions**, explains concepts and procedures, and routes the user to
  the right document template or practice area. It is an **information tool, not legal advice.**
- **Legal framing (critical):** in India, giving case-specific legal advice touches **unauthorized practice
  of law** and BCI norms. The chatbot must:
  - present output as **general legal information**, with a persistent disclaimer;
  - avoid definitive "what you should do in your specific case" answers;
  - **nudge to a verified lawyer** for anything case-specific → opens the lead form (cross-sell).
- **Implementation:** the AI module (RAG over a curated Indian-law knowledge base) — [12-ai-module.md](./12-ai-module.md).
- **Cost control:** count each turn against the plan's `aiQueryQuota`; rate-limit (e.g. per-minute) and cap
  tokens per answer. "Unlimited" plans are fair-use throttled.

## Feature 2 — Dynamic document generation

- Reuses the marketplace flow: pick a `DocumentTemplate` → fill inputs (conversational or form) →
  generate PDF → download. Membership changes only the **pricing gate**: members generate up to
  `docQuota` at no extra charge; non-members pay per document.
- Generated documents are **self-help drafts**, not a substitute for advice; each carries a disclaimer and
  a "have a lawyer review this" CTA.
- **Add-ons remain paid:** e-stamp, e-sign, physical delivery (member discount optional). See
  [11-document-marketplace.md](./11-document-marketplace.md).

## Schema (Prisma)

Client membership is **separate from the lawyer `SubscriptionPlanTier`** (different audience, different
quotas), but reuses the same Razorpay billing + GST.

```prisma
enum MembershipPlanName { FREE BASIC PLUS }
enum MembershipStatus   { ACTIVE EXPIRED CANCELLED }

model MembershipPlan {
  name          MembershipPlanName @id
  price         Decimal            @db.Decimal(10, 2)
  aiQueryQuota  Int? // null = unlimited (fair-use)
  docQuota      Int? // included document generations per period; null = unlimited
  updatedAt     DateTime           @updatedAt
}

// Added to User:
model User {
  // ...existing...
  membershipPlan     MembershipPlanName @default(FREE)
  membershipStatus   MembershipStatus?  // null while on FREE
  membershipEndsAt   DateTime?
  aiQueriesUsed      Int      @default(0) // reset monthly
  docsGeneratedUsed  Int      @default(0) // reset monthly
  usagePeriodStart   DateTime @default(now())
}

// Optional: per-use log for analytics / abuse
model MembershipUsage {
  id        String   @id @default(uuid())
  userId    String
  kind      String   // AI_QUERY | DOC_GENERATED
  createdAt DateTime @default(now())
  @@index([userId, createdAt])
}
```

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/memberships/plans` | Public | List client plans + quotas (pricing page) |
| GET | `/api/memberships/me` | CLIENT | Current plan, status, usage-remaining |
| POST | `/api/memberships/checkout` | CLIENT | Razorpay order for a plan (reuses payment flow) |
| POST | `/api/memberships/checkout/verify` | CLIENT | Verify & activate |
| POST | `/api/memberships/cancel` | CLIENT | Cancel (stays active to period end) |
| POST | `/api/ai/chat` | CLIENT | Ask the AI assistant — **checks `aiQueryQuota`**, increments usage |
| POST | `/api/documents/generate` | CLIENT | Generate a document — **checks `docQuota`** (else pay-per-use) |

- Quota checks are **server-side**; over-quota returns a clear "upgrade to continue" response (like the
  lawyer contact-reveal gate).
- A daily/monthly job resets `aiQueriesUsed` / `docsGeneratedUsed` at the start of each usage period.

## Billing, GST, config

- Reuses Razorpay + **18% GST** at checkout; GST invoice issued (see [21 → GST](./21-improvement-backlog.md#1c-gst--invoicing)).
- Suggested env: `CLIENT_MEMBERSHIP_ENABLED`, `AI_QUERY_RATE_LIMIT`, `MEMBERSHIP_FREE_AI_QUOTA`,
  `MEMBERSHIP_FREE_DOC_QUOTA`.

## Cross-sell into lead-gen (the strategic point)

- Chatbot answer on anything case-specific → **"Consult a verified lawyer"** → lead form.
- After generating a document → **"Have a verified lawyer review it"** → lead form (or a paid review add-on).
- This makes the membership both a revenue stream *and* a funnel into the lawyer marketplace.

## Legal & safety framing

- **AI = general legal information, not advice**; documents = **self-help drafts**. Persistent disclaimers,
  consistent with the platform's "information platform, not a law firm" stance ([21](./21-improvement-backlog.md), Disclaimer page).
- DPDP: chatbot conversations and document inputs are personal data — apply the same consent/retention
  rules as the rest of the platform ([16-security.md](./16-security.md)).

## Phasing

1. **Phase 2** — ship **pay-per-document** generation first (already specced in [11](./11-document-marketplace.md)); no membership yet.
2. **Phase 3** — add the **AI chatbot** (AI module) and wrap both tools in the **membership** (this doc):
   plans, quotas, billing, usage reset, cross-sell.

Keeping find-a-lawyer free throughout.

---
**Related:** [11-document-marketplace.md](./11-document-marketplace.md) · [12-ai-module.md](./12-ai-module.md) · [13-subscription-module.md](./13-subscription-module.md) · [16-security.md](./16-security.md) · [18-roadmap.md](./18-roadmap.md) · [21-improvement-backlog.md](./21-improvement-backlog.md)
