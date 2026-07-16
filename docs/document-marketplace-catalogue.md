# LawMitran - Legal Document Marketplace Catalogue & Monetization Spec

A product spec for the billable document marketplace: what documents to sell, to
whom, at what price tier, and which ones require e-stamp, registration, or
notarization. Designed to plug into the existing `documents`, `e-sign`,
`e-stamp`, `payments` (Razorpay), and `ai-intake` modules.

> Compliance note: this is a product/planning document, not legal advice. Stamp
> duty, registration thresholds, and notarization requirements vary by state and
> change over time - the flags below are defaults to encode, but each must be
> verified against current state rules and surfaced to the user at checkout.

---

## 1. Monetization model - three tiers

The core idea: turn a low-cost template into a lawyer engagement. Every document
sits in one of three tiers, and higher tiers earn more and feed the lead engine.

| Tier | What the buyer gets | Who fulfils | Pricing | Role in funnel |
|---|---|---|---|---|
| **T1 - Template** | Static, downloadable template (fill it yourself) | Platform | Free or low flat fee | SEO magnet, top-of-funnel |
| **T2 - Smart doc** | Questionnaire -> auto-filled, ready-to-use document (`ai-intake` + template engine) | Platform (automated) | Pay-per-document | Volume revenue |
| **T3 - Vetted / executed** | Lawyer reviews, customizes, e-stamps and/or e-signs it | Verified advocate (`e-sign`/`e-stamp`) | Premium, revenue-shared | This IS the lead |

**Add-ons that justify premium pricing (T2/T3):** bundled e-stamp paper,
e-signature, notarization facilitation, and a "have a lawyer customize this"
upsell shown on every template.

**Other billing models to layer on later:** template subscription bundles for
SMEs/lawyers (unlimited downloads), and a per-seat precedent-bank subscription
for advocates.

---

## 2. Client document catalogue

Audience: individuals and businesses. Columns - **Tier** (lowest tier it should
be offered at), **e-Stamp** (needs stamp duty), **Reg/Notary** (needs
registration or notarization to be valid/enforceable), **Lead upsell** (natural
hand-off to a lawyer).

### 2.1 Personal & family

| Document | Tier | e-Stamp | Reg/Notary | Lead upsell |
|---|---|---|---|---|
| Residential rental / lease agreement | T1-T2 | Yes | Reg. if > 11 months | Registration help |
| Commercial / PG lease agreement | T2 | Yes | Reg. if > 11 months | Drafting + registration |
| Rent receipts (for HRA) | T1 | No | No | - |
| Affidavit - name change | T2 | Yes | Notary | Gazette publication |
| Affidavit - address / income / single-status / gap-year | T2 | Yes | Notary | - |
| General / Special Power of Attorney | T2-T3 | Yes | Notary (Reg. for property PoA) | Lawyer vetting |
| Will / testament | T2-T3 | No | Optional registration | Lawyer drafting + witnessing |
| Gift deed | T3 | Yes | Registration | Lawyer + registration |
| Relinquishment / release deed | T3 | Yes | Registration | Lawyer + registration |
| Indemnity bond / surety bond | T2 | Yes | Notary | - |
| Self-declaration / undertaking | T1-T2 | Sometimes | Notary | - |
| Marriage-registration affidavit | T2 | Yes | Notary | Registration assistance |

### 2.2 Property

| Document | Tier | e-Stamp | Reg/Notary | Lead upsell |
|---|---|---|---|---|
| Agreement to sell | T2-T3 | Yes | Optional registration | Lawyer vetting |
| Sale deed | T3 | Yes | Registration (mandatory) | Lawyer + registration |
| Lease deed (long-term) | T3 | Yes | Registration | Lawyer + registration |
| Mortgage deed | T3 | Yes | Registration | Lawyer |
| Society / builder NOC | T1-T2 | No | Sometimes notary | - |
| Possession / allotment letter | T1 | No | No | - |
| Title-search / due-diligence report | T3 | No | No | Lawyer service (billable) |

### 2.3 Money & disputes

| Document | Tier | e-Stamp | Reg/Notary | Lead upsell |
|---|---|---|---|---|
| Cheque-bounce legal notice (Sec 138, NI Act) | T2-T3 | No | No | Lawyer sends on letterhead |
| Loan agreement | T2 | Yes | Notary (optional) | Lawyer vetting |
| Promissory note / IOU | T1-T2 | Yes (revenue stamp) | No | - |
| Recovery / demand notice | T2-T3 | No | No | Lawyer + follow-up |
| Eviction notice | T2-T3 | No | No | Lawyer + suit filing |
| Consumer-complaint draft | T2-T3 | No | No | Lawyer represents |
| RTI application | T1-T2 | No | No | Appeal drafting |
| Cease-and-desist / trademark reply | T2-T3 | No | No | IP lawyer |

### 2.4 Business & startup

| Document | Tier | e-Stamp | Reg/Notary | Lead upsell |
|---|---|---|---|---|
| Partnership deed | T2-T3 | Yes | Registration (recommended) | Lawyer + firm registration |
| LLP agreement | T2-T3 | Yes | MCA filing | CS/lawyer filing |
| Founders' / shareholders' agreement | T3 | Yes | No | Lawyer drafting |
| MoU / letter of intent | T2 | Sometimes | No | Lawyer vetting |
| NDA (uni/mutual) | T1-T2 | No | No | Lawyer vetting |
| Service / consultant / freelancer agreement | T2 | Sometimes | No | Lawyer vetting |
| Vendor / supplier contract | T2 | Sometimes | No | Lawyer vetting |
| Employment letters (offer, appointment, NDA, relieving) | T1-T2 | No | No | HR-policy pack upsell |
| ESOP policy / grant letter | T3 | No | No | Lawyer + CS |
| Website Privacy Policy / Terms / Refund policy | T1-T2 | No | No | Compliance review |
| GST / Udyam (MSME) registration paperwork | T2 | No | No | CA/CS service |

---

## 3. Lawyer document catalogue

Audience: verified advocates. A second revenue stream (sell tools to your supply
side), and it deepens retention alongside the lead subscription.

| Document / product | Tier | Billing model | Notes |
|---|---|---|---|
| Precedent & drafting bank (plaints, written statements, bail/anticipatory-bail apps, writ petitions) | T2-T3 | Per-seat subscription | Searchable clause library, biggest value |
| Vakalatnama template pack | T1-T2 | Bundle / subscription | High-volume everyday need |
| Legal-notice template library | T2 | Subscription | Sec 138, recovery, eviction, consumer |
| Legal-opinion templates | T2 | Subscription | Standardized formats |
| Client engagement / retainer letter | T1-T2 | Bundle | Practice-management pack |
| Fee agreement | T1-T2 | Bundle | - |
| Matter-intake forms | T1 | Bundle | Feeds their own client onboarding |
| GST-compliant invoice templates (legal services) | T1-T2 | Bundle | Ties to billing module |
| Compliance checklists (by practice area) | T2 | Subscription | Property, corporate, family, criminal |

---

## 4. Compliance rules to encode in the product

Turn the flags above into enforced behavior so the marketplace stays safe and
credible:

- **Registration/stamp-duty flag**: documents marked "Reg." show an estimated
  stamp-duty/registration cost (by state) and a "this must be registered to be
  valid" banner before purchase.
- **Notarization flag**: offer notarization facilitation as a paid add-on where
  required.
- **No unauthorized practice**: every output is a *template* or *lawyer-vetted
  document* - never framed as the platform giving legal advice. T3 always has a
  named, verified advocate attached.
- **Enforceability caveats**: surface known limits (e.g., prenuptial agreements
  have limited enforceability in India; unregistered documents that require
  registration are inadmissible as evidence).
- **State/versioning**: templates are versioned and tagged by applicable
  state/jurisdiction; show "last reviewed" date.
- **Audit trail**: log who generated/executed each document (pairs with the
  existing audit + e-sign trail).

---

## 5. Mapping to existing modules

| Capability | Module |
|---|---|
| Marketplace listing, purchase, delivery | `documents` |
| Questionnaire -> filled document (T2) | `ai-intake` + template engine |
| Signature on executed docs (T3) | `e-sign` |
| Stamp duty / e-stamp paper (T1-T3 flagged) | `e-stamp` |
| Payments, revenue share to lawyer | `payments` (Razorpay) |
| Storage of generated/purchased files | S3 / MinIO storage |
| Lawyer eligibility for T3 fulfilment | `lawyers` (verificationStatus = APPROVED) |
| SEO landing pages per document x city | `seo` |

---

## 6. Suggested launch sequence

1. **Phase 1 (SEO + volume):** T1/T2 for the top ~15 high-search documents -
   rental agreement, affidavits, cheque-bounce notice, NDA, employment letters,
   RTI, will. Pure automation, no lawyer needed.
2. **Phase 2 (revenue depth):** add T3 vetting + e-stamp/e-sign add-ons on the
   same documents; wire the "have a lawyer customize this" upsell into leads.
3. **Phase 3 (supply side):** launch the lawyer precedent-bank subscription.
4. **Phase 4 (bundles):** SME template subscriptions and per-city compliance
   packs.

Prioritize by search volume x automatability x lead value - the rental
agreement and cheque-bounce notice score highest on all three.
