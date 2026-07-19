# Document Template Syntax (conditional engine)

Templates power the guided document builder. The engine is dependency-free
(`backend/src/common/templates/template-engine.ts`, spec alongside) and is used
for the live preview, the paid render, and the PDF.

## Variables

`{{fieldName}}` — replaced with the user's answer. Empty/missing answers render
as a ruled blank (`__________`) so a half-filled preview still reads like a
draft. In the live preview, filled values render **bold** and blanks render as
dotted placeholders.

## Conditionals

```
{{#if petsAllowed}}
8. PETS. The Tenant shall be permitted to keep domesticated pets...
{{/if}}

{{#if maintenanceIncluded}}included in the rent{{else}}payable in addition{{/if}}

{{#eq purpose "Commercial"}}COMMERCIAL RENTAL AGREEMENT{{else}}RESIDENTIAL RENTAL AGREEMENT{{/eq}}
```

`{{#if x}}` is true when the answer is non-empty and not `false`. `{{#eq x "v"}}`
compares case-insensitively; the value may be quoted or a bare word/number.
Blocks nest arbitrarily. A stray `{{/if}}` without an opener is left as literal
text — malformed templates degrade, never crash.

## Field types (schemaJson.fields)

`text · textarea · date · number · select · toggle · checkbox`

- **toggle** — always renders as a button group (LegalDesk-style chips), e.g.
  `{ "name": "purpose", "type": "toggle", "options": ["Residential", "Commercial"] }`.
  Pair with `{{#eq purpose "Commercial"}}` in the body.
- **checkbox** — an opt-in clause. The stored value is `"true"` or empty; pair
  with `{{#if}}`. `placeholder` is used as the visible clause description.
  Checkboxes are optional unless `"required": true`.
- **state** — dropdown of all Indian states/UTs from the platform master list.
  Stores the full state name (use it in `{{#eq state "Karnataka"}}` blocks for
  state-specific clauses); the wizard resolves the code automatically for
  stamp-duty quotes and checkout.
- `"stampValue": true` on a number field marks it as the declared value for the
  stamp-duty calculation (e.g. monthly rent).
- **select** with ≤ 4 options also renders as chips; > 4 renders a dropdown.
- `section` groups fields into wizard steps (tabs across the top).

## State-aware pricing & clauses

When a template has `requiresStamp`, the wizard shows a live price panel (base
price + the selected state's stamp duty + total) as soon as the buyer picks a
state — powered by the public quote endpoint and the admin-managed
StampDutyRate table. Pair a `state` field with `{{#eq state "..."}}` blocks to
reference the correct state tenancy/act names in the document text; the seeded
rental agreement demonstrates Karnataka, Maharashtra, Tamil Nadu and Delhi with
an all-India fallback.

## Reference

The seeded **Residential/Commercial Rental Agreement**
(`prisma/seed-documents.ts`) demonstrates every feature: purpose/property/
furnishing toggles, lock-in `{{#if}}`, maintenance either/or, and four optional
clause checkboxes (pets, parking, subletting, smoking). Re-seed with
`npm run seed:documents --workspace backend` after edits.
