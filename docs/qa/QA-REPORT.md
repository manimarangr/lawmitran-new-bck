# LawMitran — QA Report (static analysis pass)

Date: 18 July 2026. Scope: full static verification of the monorepo (no live
stack in the analysis environment — runtime items are delegated to
[QA-PLAN.md](./QA-PLAN.md)).

## What was verified automatically

**Compile health.** All 257 TypeScript/TSX source files across `backend/src`,
`backend/prisma`, `frontend/app`, `frontend/lib`, `frontend/components`,
`frontend/stores`, and `frontend/types` transpile without syntax errors.

**API contract.** Every frontend API call (152 call sites across `lib/api/*`,
components, and pages) was matched against the 169 backend controller routes.
After discounting query-string interpolation, there are **zero unmatched
calls** — no frontend request targets a non-existent endpoint.

**Route integrity.** Controller route ordering was checked for shadowing (e.g.
`localities`/`states`/`cities` are declared before `:id` in the lawyers
controller; `admin/dashboard` before `admin/:id` in content). All 13 admin
content routes carry `@Roles(ADMIN)` + `@AdminScopes(OPS)`; exactly the 3
intended content reads are `@Public()`. No Prisma accessor references a model
missing from `schema.prisma`.

**Frontend links & assets.** All internal `<Link href>` targets resolve to real
app routes (after discounting dynamic-segment template literals). All icon
names used resolve to the inline SVG set.

## Bugs found in this pass — all fixed

1. **`/terms` and `/privacy` returned 404** while being linked from the signup
   consent line ("Terms & Privacy Policy"). A consent checkbox pointing at dead
   pages is a legal-risk bug, not just a broken link. → Both pages created
   under `(public)` with India-appropriate content (information-platform
   disclaimer, DPDP Act 2023 alignment, grievance routing). *Have a real
   advocate review this copy before launch.*
2. **`print` icon did not exist** in the icon set — the Print button on the
   document detail page rendered without an icon. → Stroke-based printer glyph
   added to `components/ui/Icon.tsx`.
3. **Avatar upload errors were swallowed** — the settings page showed a generic
   "Upload failed." hiding the server's specific message (e.g. the 2 MB
   limit). → The real API error message is now surfaced.

## Bugs found & fixed earlier in this QA-driven session

- Prisma `groupBy` typing failure inside `$transaction` (dashboard counts) —
  moved out of the batch with explicit `orderBy`.
- `PublicQuery` interface not assignable to the query-string helper — converted
  to a type alias (implicit index signature).
- Duplicate `latitude`/`longitude` keys in the lawyers `PUBLIC_SELECT`.
- Login-redirect loop/loss: lead modal, 401 handler, and dashboard gate now
  carry `?next=` and the login page honors it (internal paths only).
- Profile photos invisible (403): MinIO bucket private by default → public-read
  policy applied at startup for `profiles/*`, `offices/*`, `avatars/*` only;
  verification documents remain private.
- Dashboard nav ignored `avatarUrl` (showed initials even with a photo).
- "Trichy"/"Hosur"-class city gaps: alias map + ~110 curated towns added, and
  the city box now shows popular metros before typing.

## Known limitations / follow-ups (not bugs)

- **Runtime QA required**: payments (Razorpay test mode), OTP flows, e-Sign/
  e-Stamp webhooks, scheduled publishing timing, and RBAC behaviour need the
  live checklist in QA-PLAN.md.
- `npx tsc --noEmit` (full type-check) and `npm run lint` should be run locally
  before release — the analysis environment verifies syntax and wiring, not
  full type inference.
- The CMS editor's "Preview public page" link assumes the guide URL shape; NEWS/
  JUDGMENT/NOTIFICATION types will need their public routes before preview
  makes sense for them.
- Locality boost sorts in memory over a 200-lawyer cap per query — fine at
  current scale; revisit with PostGIS if a city exceeds that.
- Legal-guides category pages still read categories from the static file via
  the fallback layer when the DB is unseeded — intended migration behaviour.
