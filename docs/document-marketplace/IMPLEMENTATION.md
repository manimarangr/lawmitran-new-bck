# Document Marketplace - Implementation Status

Source-of-truth for what is **built** in the codebase versus planned. The other
files in this folder describe the design; this one records the delivered code,
the exact endpoints, feature flags, migrations, seeds, and how to enable and test
each phase.

Every feature is gated by an admin-configurable flag and defaults **off** (except
the master marketplace flag, which defaults on to preserve existing behaviour).
See [00-admin-configuration-framework.md](./00-admin-configuration-framework.md).

## Phase status

| Phase | Feature | Status | Migration | Master flag |
|---|---|---|---|---|
| 1 | Content marketplace (templates, guided form, AI prefill) | **Built** | none | `DOCS_MARKETPLACE_ENABLED` (default on) |
| 2 | PDF generation (Gotenberg/Puppeteer, QR + hash, verify) | **Built** | none | `DOCS_PDF_ENABLED` |
| 3 | Stamp-duty calculator (state x type, quote) | **Built** | `stamp_duty_rates` | `DOCS_STAMP_DUTY_ENABLED` |
| 4 | Lawyer review + revenue share (Tier 3) | **Built** | `lawyer_review` | `DOCS_LAWYER_REVIEW_ENABLED` |
| 5 | e-Sign / e-Stamp (vendor-agnostic, mock only) | **Built** | `esign_estamp_requests` | `DOCS_ESIGN_ENABLED`, `DOCS_ESTAMP_ENABLED` |
| 6 | Subscriptions & bundles | Planned | - | `DOCS_SUBSCRIPTIONS_ENABLED` |
| 7 | Physical delivery | Planned | - | `DOCS_PHYSICAL_DELIVERY_ENABLED` |

## Runbook - apply everything

Run once after pulling these phases (schema changed in P3/P4/P5):

```bash
# 1. install (picks up optional qrcode used by PDF)
npm install

# 2. database (from backend/)
cd backend
npx prisma migrate dev --name document_marketplace_phases   # or per-phase names
npx prisma generate

# 3. seed content + rates
npm run seed:documents        # categories + starter templates (P1)
npm run seed:stamp-duty       # indicative state rates (P3)
cd ..

# 4. run
npm run dev:backend
npm run dev:frontend
```

Then enable the phases you want in **Admin -> Settings -> Document marketplace**.

## Phase 1 - Content marketplace

- **Code**: `backend/src/modules/documents/*` (service/controller/dto - pre-existing
  engine), `feature-flags.ts` (new guard), `prisma/seed-documents.ts` (new).
- **Endpoints** (existing): `GET /documents/categories|templates|templates/:id`,
  `POST /documents/templates/:id/preview|prefill`, `POST /documents/checkout`,
  `POST /documents/verify-payment`, `GET /documents/me[/:id]`, admin CRUD.
- **Added**: master-flag gate on `checkout`; three real templates (Rental
  Agreement, NDA, Cheque-Bounce Notice) via `npm run seed:documents`.
- **Enable**: `DOCS_MARKETPLACE_ENABLED` (on by default).
- **Test**: `/legal-documents` -> pick a template -> wizard -> preview -> pay.

## Phase 2 - PDF generation

- **Code**: `backend/src/common/pdf/*` (new `PdfService`, `PdfModule`),
  `common/storage/storage.service.ts` (`putBytes`/`getBytes`), documents service
  wiring, `frontend/lib/api/documents.ts` (`downloadMyDocumentPdf`, `verifyDocument`),
  dashboard document page (Download PDF button), `infra/docker/compose.yml`
  (gotenberg service).
- **Endpoints**: `GET /documents/me/:id/pdf` (stream), `GET /documents/verify/:id`.
- **Config**: `DOCS_PDF_ENABLED`, `DOCS_PDF_ENGINE` (`gotenberg` default | `puppeteer`),
  `GOTENBERG_URL` env.
- **Test**: enable the flag, start the `gotenberg` container, pay for a document,
  click **Download PDF**; `GET /documents/verify/:id` returns the content hash.

## Phase 3 - Stamp-duty calculator

- **Code**: `prisma/schema.prisma` (`StampDutyRate`), `stamp-duty.service.ts` (new),
  `documents.service.ts` (`quote`, duty in `checkout`, admin delegates), DTOs,
  controller routes, `prisma/seed-stamp-duty.ts`, `frontend/lib/api/documents.ts`
  (`fetchDocQuote`, `checkoutDocument` state).
- **Endpoints**: `POST /documents/quote`; admin `GET/POST/PATCH /documents/admin/stamp-duty`.
- **Config**: `DOCS_STAMP_DUTY_ENABLED`, `DOCS_STAMP_DUTY_MODE` (`estimate`|`strict`).
- **Test**: seed rates, enable, quote a stampable template with `state: "KA"`.

## Phase 4 - Lawyer review + revenue share

- **Code**: `prisma/schema.prisma` (review columns on `CustomerDocument`,
  `DocReviewStatus`, `DocumentReviewEvent`), `review.service.ts` (new), DTOs,
  controller routes, `documents.module.ts` provider, `frontend/lib/api/documents.ts`
  review helpers.
- **Endpoints**: client `POST /documents/me/:id/request-review`, `.../review-payment`,
  `GET .../review`; lawyer `GET /documents/reviews/queue`, `POST /documents/reviews/:id/claim`,
  `.../decision`.
- **Config**: `DOCS_LAWYER_REVIEW_ENABLED`, `DOCS_LAWYER_REVIEW_FEE`,
  `DOCS_LAWYER_PAYOUT_PERCENT`.
- **Rules**: only `verificationStatus = APPROVED` lawyers can claim/decide; approval
  records `lawyerPayout = round(fee x payout%)`.

## Phase 5 - e-Sign / e-Stamp (vendor-agnostic)

- **Docs**: [../esign-architecture.md](../esign-architecture.md),
  [../estamp-architecture.md](../estamp-architecture.md).
- **Code**: `backend/src/common/esign/*` and `backend/src/common/estamp/*` -
  strategy `interface`, `MockESignProvider`/`MockEStampProvider`, `ESignService`/
  `EStampService` orchestrators, controllers, modules, provider onboarding READMEs;
  `prisma/schema.prisma` (`ESignRequest`, `EStampRequest`, `ESignStatus`,
  `EStampStatus`); `app.module.ts` registers both modules; `frontend/lib/api/documents.ts`
  esign/estamp helpers; `ESIGN_PROVIDER`/`ESTAMP_PROVIDER` env.
- **Endpoints**: `POST /documents/:id/esign`, `GET /esign/:id/status`,
  `POST /webhooks/esign`, `POST /esign/:id/simulate` (mock); e-stamp parallel.
- **Config**: `DOCS_ESIGN_ENABLED`/`DOCS_ESTAMP_ENABLED`, provider via
  `DOCS_ESIGN_PROVIDER` (admin) -> `ESIGN_PROVIDER` (env) -> `mock`.
- **Test (no external vendor)**:

```bash
# after enabling DOCS_ESIGN_ENABLED and paying for a document
POST /api/documents/:id/esign            -> { id, status: AWAITING_SIGNATURE, signingUrl }
POST /api/esign/:id/simulate {outcome:"signed"}   -> { ok, status: SIGNED }  # sets eSigned=true
# outcomes: signed | rejected | timeout | failed  (estamp: stamped | rejected | timeout | failed)
```

## Consolidated feature-flag reference

Admin group **Document marketplace** (`settings.registry.ts`):

| Key | Type | Phase |
|---|---|---|
| `DOCS_MARKETPLACE_ENABLED` | toggle | 1 |
| `DOCS_PDF_ENABLED` / `DOCS_PDF_ENGINE` | toggle / select | 2 |
| `DOCS_STAMP_DUTY_ENABLED` / `DOCS_STAMP_DUTY_MODE` | toggle / select | 3 |
| `DOCS_LAWYER_REVIEW_ENABLED` / `DOCS_LAWYER_REVIEW_FEE` / `DOCS_LAWYER_PAYOUT_PERCENT` | toggle / number / number | 4 |
| `DOCS_ESIGN_ENABLED` / `DOCS_ESIGN_PROVIDER` / `DOCS_ESIGN_API_KEY` / `DOCS_ESIGN_API_SECRET` | toggle / select / secret / secret | 5 |
| `DOCS_ESTAMP_ENABLED` / `DOCS_ESTAMP_PROVIDER` / `DOCS_ESTAMP_API_KEY` | toggle / select / secret | 5 |
| `DOCS_SUBSCRIPTIONS_ENABLED` | toggle | 6 |
| `DOCS_PHYSICAL_DELIVERY_ENABLED` / `DOCS_DELIVERY_FEE` / `DOCS_DELIVERY_PROVIDER` | toggle / number / text | 7 |

Env fallbacks: `GOTENBERG_URL`, `ESIGN_PROVIDER`, `ESTAMP_PROVIDER`.

## Migrations & seeds summary

| Change | Command |
|---|---|
| P3 schema | `prisma migrate dev --name stamp_duty_rates` |
| P4 schema | `prisma migrate dev --name lawyer_review` |
| P5 schema | `prisma migrate dev --name esign_estamp_requests` |
| After any migration | `prisma generate` |
| Content seed (P1) | `npm run seed:documents --workspace backend` |
| Rates seed (P3) | `npm run seed:stamp-duty --workspace backend` |

## Verification notes

Each phase was verified by TypeScript transpile + brace-balance checks in the
build environment; a full `tsc`/`nest build`, the Prisma migrations, and live
Razorpay/Gotenberg runs must be executed on a developer machine. Seed values
(stamp-duty rates, template prices) are indicative and admin-editable - verify
stamp duty against current state rules before production use.
