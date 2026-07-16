# Security

## Purpose

Define the security controls for the marketplace: authorization, document access,
signed URLs, encryption, rate limiting, PII protection, audit, and OWASP coverage.

## Authentication & authorization

- Global `JwtAuthGuard` + `RolesGuard` (`APP_GUARD`); access + refresh JWTs signed
  with separate secrets; refresh tokens stored as SHA-256 hashes, single-use.
- Public catalogue routes opt out via `@Public()`. Everything else requires a JWT.
- **RBAC:** `CLIENT`, `LAWYER`, `ADMIN`; admin sub-scopes `SUPER | OPS | FINANCE`.

| Action | Required |
|---|---|
| Browse catalogue, preview, prefill | Public |
| Checkout, my documents, request review | `CLIENT` (JWT) |
| Review queue / decision | `LAWYER` (assigned only) |
| Template/category/pricing CRUD, orders | `ADMIN` + `OPS` |
| Refunds | `ADMIN` + `FINANCE` |
| Feature flags / provider keys | `ADMIN` + `SUPER` |

## Document access control

- A `CustomerDocument` is readable only by its `userId` (queries always filter by
  `userId`); the assigned `lawyerId` gets scoped read for review; admins per scope.
- `contentHtml` is returned **only** when `status != DRAFT` (post-payment).
- Preview returns a truncated, watermarked snippet - never the full body.

## Signed URLs

- PDFs and executed documents are **private** objects; access is via short-lived
  presigned GET (default 300 s) minted only after an ownership check.
- `pdfUrl` stores the object key, not a URL; URLs are never persisted or logged.

## Encryption

- **In transit:** TLS everywhere (Let's Encrypt at nginx; provider APIs over HTTPS).
- **At rest:** S3/MinIO server-side encryption; Postgres volume encryption (EBS).
- **Secrets:** provider keys stored as settings secrets, masked in `GET /admin/settings`,
  never returned or logged.

## Rate limiting

- `@RateLimit(n, windowMs)` decorator (Redis/in-memory guard). Public generation
  endpoints are limited (e.g., prefill `6/min`). Recommended limits:

| Endpoint | Limit |
|---|---|
| `templates/:id/prefill` | 6 / min (existing) |
| `templates/:id/preview` | 20 / min |
| `checkout` | 10 / min |
| `verify-payment` | 10 / min |
| webhooks | provider IP allowlist + HMAC (no user limit) |

## Input handling

- `ValidationPipe({ whitelist: true, transform: true })` strips unknown fields and
  coerces types; every DTO uses `class-validator`.
- Template answers are **HTML-escaped** at render (`escapeHtml` in the engine) so a
  malicious answer cannot inject markup into a generated document/PDF.
- File uploads (review attachments) validated for MIME/size; stored private.

## OWASP Top-10 coverage

| Risk | Control |
|---|---|
| A01 Broken access control | Ownership-filtered queries, RBAC + scopes, per-doc checks |
| A02 Cryptographic failures | TLS, SSE at rest, hashed refresh tokens, masked secrets |
| A03 Injection | Prisma parameterized queries; escaped template render; DTO validation |
| A04 Insecure design | Server-side pricing; idempotent payments; fail-safe flags |
| A05 Security misconfiguration | Least-priv S3 keys; DB ports closed; secure headers (nginx) |
| A06 Vulnerable components | `npm audit` in CI; pinned versions |
| A07 Auth failures | JWT + rate-limited auth; reCAPTCHA on auth routes |
| A08 Data integrity failures | HMAC-verified webhooks; content hash on PDFs |
| A09 Logging/monitoring failures | Central `AuditService`; alerting (see deployment) |
| A10 SSRF | No user-supplied URLs fetched; provider endpoints allowlisted |

## PII protection

- PII in `inputJson` (names, addresses, amounts) is need-to-know: returned only to
  the owner and the assigned lawyer.
- Never load raw production PII into non-prod (mask on QA refresh - DevOps doc 20).
- Audit logs store identifiers and actions, not full document bodies.

## Audit logging

`AuditService.log(action, { entityType, entityId, summary, oldValue?, newValue? })`
for: template create/update/publish, purchase, refund, review actions, e-sign/
e-stamp requests and callbacks, settings changes.

## Acceptance criteria

- A user cannot read another user's document or PDF (403/404).
- Full document content is inaccessible before payment.
- Provider secrets never appear in API responses or logs.
- Webhooks reject invalid HMAC and replays.
