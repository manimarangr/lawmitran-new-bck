# Document Marketplace - Feasibility Analysis

Assessment of the existing `documents` module against the [Document Marketplace
Catalogue](./document-marketplace-catalogue.md) - what's already built, what's
missing, and the effort to close the gap (backend + frontend).

## Verdict: HIGH feasibility

The existing module is well-architected and already implements Tier 1 (templates)
and Tier 2 (smart, auto-filled documents - including AI prefill). Most of the
catalogue is achievable as **content + configuration** (seeding templates), not
new engineering. The genuinely new work is isolated and additive - no
re-architecture needed. The four real build items are: T3 lawyer-vetting +
revenue share, real e-sign/e-stamp vendor integration, a stamp-duty calculator,
and PDF generation.

---

## What already exists

### Backend (`backend/src/modules/documents`, 545-line service)

| Capability | Status |
|---|---|
| `DocumentCategory` / `DocumentTemplate` / `CustomerDocument` models | Done |
| Template engine (`{{field}}` mustache-lite render) | Done |
| Guided-form schema (`schemaJson` -> typed fields: text/date/select/etc.) | Done |
| Public catalogue: categories, templates, template detail, keyword/SEO fields | Done |
| Watermarked partial preview (never full doc pre-payment) | Done |
| **AI prefill** - LLM extracts form values from the user's words (`ai-intake`) | Done (= Tier 2) |
| Checkout -> Razorpay order -> verify signature -> freeze `contentHtml` | Done |
| Content locked until payment; `myDocuments` / `myDocument` | Done |
| Admin CRUD (categories, templates), publish/archive, **version bump** on edit | Done |
| Orders list + pagination; audit logging; admin/user notifications | Done |
| Template flags already present: `requiresStamp`, `stampBasis`, `version`, `language` | Done |
| `CustomerDocument` fields already present: `eStamped`, `eSigned`, `stampDuty`, `deliveryType`, `deliveryFee`, `deliveryAddress`, `pdfUrl` | Modelled (not yet populated) |

### Frontend

| Surface | Path |
|---|---|
| Public catalogue + template wizard | `app/(public)/legal-documents/`, `[slug]` |
| Buyer "My Documents" | `app/(dashboard)/dashboard/documents/`, `[id]` |
| Admin management | `app/(admin)/admin/documents/`, `[id]` |
| Typed API layer (supports wizard `section` grouping) | `lib/api/documents.ts` |

**Conclusion:** the pipeline questionnaire -> filled doc -> pay -> download already
works end to end. Adding catalogue documents = author `schemaJson` +
`bodyTemplate` per document in the admin console.

---

## Gap analysis

| # | Feature | Status | Backend work | Frontend work | Effort |
|---|---|---|---|---|---|
| 1 | **Catalogue content** (~40 templates) | Missing | Seed script or admin authoring | none (renders already) | M (mostly content) |
| 2 | **PDF generation** (`pdfUrl`) | Missing | HTML->PDF (puppeteer/gotenberg) + store to S3/MinIO | "Download PDF" button | M |
| 3 | **Stamp-duty calculator** | Partial | `StampDutyRate` model (state x docType) + calc; add duty to checkout total | show duty + total at checkout | M |
| 4 | **E-stamp integration** | Stub only | Wire `EstampService` to a licensed vendor (SHCIL/Digio/Leegality); set `eStamped` | "add e-stamp" option | L (vendor + legal) |
| 5 | **E-sign integration** | Stub only | Wire `EsignService` to ASP (Digio/Leegality/eMudhra); webhook -> set `eSigned` | signer flow / status | L (vendor + legal) |
| 6 | **Tier 3: lawyer-vetting + revenue share** | Missing | `lawyerId` + review workflow on `CustomerDocument`; assignment; payout split | "get it lawyer-reviewed" upsell; lawyer review queue | L |
| 7 | **Subscription bundles / lawyer precedent-bank** | Missing | Access model (entitlements) or reuse subscriptions | bundle pages, gated downloads | L |
| 8 | **Physical delivery fulfilment** | Partial | Courier/fulfilment flow on existing delivery fields | address + tracking UI | M |

Legend: S = small, M = medium, L = large.

---

## Catalogue tier -> current readiness

| Catalogue tier | Readiness | What's needed |
|---|---|---|
| **T1 - Template** | Ready now | Seed templates (content only) |
| **T2 - Smart doc** | Ready now | Seed templates; AI prefill already wired |
| **T3 - Vetted / executed** | Needs build | Items 4, 5, 6 above (e-stamp, e-sign, lawyer review + revenue share) |

So Phases 1-2 of the catalogue launch plan are **content work on top of existing
code**; only Phase 2's premium add-ons and Phase 3 need new engineering.

---

## New schema needed (additive migrations, backward-compatible)

```prisma
// Stamp-duty rate table (mirrors the existing PropertyChecklist state pattern)
model StampDutyRate {
  id              String  @id @default(uuid())
  state           String
  documentType    String  // maps to DocumentTemplate.stampBasis
  calcType        String  // FLAT | PERCENT | SLAB
  flatAmount      Decimal? @db.Decimal(10,2)
  percent         Decimal? @db.Decimal(5,2)
  minAmount       Decimal? @db.Decimal(10,2)
  @@unique([state, documentType])
}

// Tier-3 lawyer review on an existing CustomerDocument (add columns, don't replace)
// CustomerDocument += lawyerId?, reviewStatus?, reviewFee?, lawyerPayout?
enum DocReviewStatus { NONE REQUESTED ASSIGNED IN_REVIEW COMPLETED }
```

The `eStamped` / `eSigned` / `stampDuty` / `deliveryFee` columns already exist,
so items 2-5 mostly populate existing fields rather than reshape the model.

---

## Risks & dependencies

- **E-sign / e-stamp are legally gated in India.** Both current services are
  explicit placeholders ("no vendor selected"). Going live needs a licensed ASP
  (Digio, Leegality, eMudhra) and e-stamp vendor (SHCIL / add-on), plus
  contracts and KYC. This is the longest-lead item - start vendor selection early.
- **PDF on the self-hosted box.** No PDF library is installed today. Puppeteer
  needs Chromium on the EC2 host (extra ~300 MB + fonts); alternatively run
  Gotenberg as a small container. Factor into the Docker/EC2 setup.
- **Stamp-duty accuracy varies by state and changes.** Seed conservatively, show
  "estimate - verify at execution," and make it admin-editable (like
  `PropertyChecklist`).
- **Unauthorized-practice line.** T3 must attach a named, verified advocate
  (`verificationStatus = APPROVED`); the platform never "advises."
- **Template authoring is the real volume of work.** Each document = a
  `schemaJson` (fields) + `bodyTemplate` (clauses). Budget legal review of each.

---

## Recommended build order

1. **Content (Phase 1):** author the top ~15 T1/T2 templates in the admin console
   (rental agreement, affidavits, cheque-bounce notice, NDA, employment letters,
   RTI, will). Ships on existing code. **No new backend.**
2. **PDF generation (item 2):** add HTML->PDF + store to S3/MinIO; populate
   `pdfUrl`; "Download PDF" button. Applies to every document.
3. **Stamp-duty calculator (item 3):** `StampDutyRate` table + checkout duty line.
4. **T3 lawyer-vetting + revenue share (item 6):** the differentiator that turns a
   document sale into a lawyer lead. Build the review workflow before wiring
   paid e-sign/e-stamp.
5. **E-stamp + e-sign vendors (items 4-5):** integrate once a vendor is under
   contract; flip the already-present flags.
6. **Bundles / precedent-bank (item 7)** and **physical delivery (item 8)** last.

Bottom line: the module is a strong base - Phases 1-2 of the catalogue are
mostly content, and the new code is well-scoped, additive, and low-risk to the
existing flow.
