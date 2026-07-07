# 25 — Multi-Professional Expansion (Find Professionals)

**Future direction, not MVP.** A plan for extending LawMitran beyond lawyers to a broader
**"Find Professionals"** marketplace — Chartered Accountants (CA), Company Secretaries (CS), GST
practitioners, and (separately) productized **compliance services** — so a client can handle all their
legal + compliance needs in one place.

> **Sequencing:** prove the **lawyer MVP** (supply + liquidity in one city) first. This is a **Phase 2/3**
> horizontal expansion. Going multi-vertical before liquidity is the classic marketplace mistake. See
> [MVP-launch-checklist.md](./MVP-launch-checklist.md).

## Why it fits

- The core model — *verified professional discovery → lead → the professional contacts the client* —
  plus subscriptions, reviews, and admin verification, **generalises cleanly** across professions.
- Strong Indian demand + adjacency: startups/SMBs need a lawyer **and** a CA **and** a CS (incorporation,
  GST, ROC filings, tax, contracts). "All your legal + compliance in one place" is a real value prop.
- Reuses existing machinery: search/matching ([15](./15-search-and-matching.md)), leads
  ([14](./14-lead-management.md)), subscriptions/tiers ([13](./13-subscription-module.md)), ratings, SEO
  ([24](./24-seo-and-landing-pages.md)).

## Two distinct business models — keep them separate

| Model | What it is | Fits LawMitran as | Effort |
|---|---|---|---|
| **Professional discovery** | Connect a client to a verified CA/CS/lawyer as a lead; they engage directly | Direct extension of today's lead-gen | **Lower** — reuse existing flows |
| **Productized compliance services** | Fixed-price packages ("GST registration ₹X", "Pvt Ltd incorporation ₹Y") fulfilled behind the scenes | A separate e-commerce/fulfilment product (like IndiaFilings/VakilSearch) | **Higher** — packages, pricing, fulfilment, SLAs |

Decide deliberately: are you a **marketplace** (connect) or a **service provider** (sell + fulfil
packages)? They have different UX, unit economics, and ops. **Start with discovery**; treat productized
services as a later, separate decision (it overlaps with the document marketplace, [11](./11-document-marketplace.md)).

## Generalise `Lawyer` → `Professional`

Introduce a professional type and per-type verification. Two options:

- **Option A (recommended): one `Professional` model + `professionType`.** Maximum reuse of search/leads/
  subscriptions; type-specific fields kept optional or in a small side table.
- **Option B: separate models per profession** sharing common services. More isolation, more duplication.

```prisma
enum ProfessionType {
  LAWYER
  CHARTERED_ACCOUNTANT   // ICAI
  COMPANY_SECRETARY      // ICSI
  GST_PRACTITIONER       // GSTP enrolment
}

// generalised from the current Lawyer model
model Professional {
  id                 String         @id @default(uuid())
  userId             String         @unique
  professionType     ProfessionType
  fullName           String
  slug               String?        @unique
  // verification body + registration id differ per type:
  registrationBody   String         // "Bar Council of Karnataka" | "ICAI" | "ICSI" | "GSTN"
  registrationNumber String         @unique
  registrationState  String?
  certificateUrl     String
  // shared: city/geo, experience, bio, rating, verification + subscription state, etc.
}
```

> Migration path: today's `Lawyer` becomes `professionType = LAWYER`. The lawyer-specific docs remain the
> canonical reference for that vertical; this doc governs the generalisation.

## Verification differs by body (the core complexity)

| Profession | Body | ID to verify | Notes |
|---|---|---|---|
| Lawyer | State **Bar Council** | Enrollment number | Existing flow ([08](./08-lawyer-module.md)) |
| Chartered Accountant | **ICAI** | Membership number | Verify against ICAI register (manual first) |
| Company Secretary | **ICSI** | Membership number | Verify against ICSI register |
| GST Practitioner | **GSTN** | GSTP enrolment number | Verify enrolment |

Each type needs its own admin-review config (number format, body, certificate). The two-gate model still
holds: **account-verified** (OTP) vs **professionally-verified** (admin-approved per body).

## Regulatory / advertising rules per body

Just as **BCI Rule 36** constrains lawyer advertising, **ICAI** and **ICSI** have their own restrictions on
how members may be listed/promoted. The "**information platform, not an endorsement/solicitation**" framing
([21 §1a](./21-improvement-backlog.md)) must be **re-validated per profession** with the respective body's
rules before listing them. Do not assume the lawyer framing transfers unchanged.

## UX changes

- **"Find Professionals"** entry point + a **profession filter** (Lawyer / CA / CS / GST) layered on search.
- Type-appropriate practice/skill taxonomies (e.g. CA: audit, GST, income-tax, ROC).
- Profession-specific SEO landing pages (`/ca/:city`, `/cs/:city/:service`) — extends [24](./24-seo-and-landing-pages.md).

## Branding note

**"LawMitran" is law-specific.** A multi-professional platform may need broader branding (e.g. a parent
brand with LawMitran as the legal vertical). Flag this before committing to multi-vertical marketing.

## Phasing

1. **Now (MVP):** lawyers only — prove the loop in one city.
2. **Phase 2:** generalise to `Professional`; add **Chartered Accountants** (highest adjacency) with ICAI
   verification + advertising review; profession filter in search; CA SEO pages.
3. **Phase 3:** add **CS** and **GST practitioners**; consider **productized compliance services** as a
   separate module; revisit branding.

---
**Related:** [01-product-vision.md](./01-product-vision.md) · [08-lawyer-module.md](./08-lawyer-module.md) · [11-document-marketplace.md](./11-document-marketplace.md) · [13-subscription-module.md](./13-subscription-module.md) · [15-search-and-matching.md](./15-search-and-matching.md) · [21-improvement-backlog.md](./21-improvement-backlog.md) · [MVP-launch-checklist.md](./MVP-launch-checklist.md)
