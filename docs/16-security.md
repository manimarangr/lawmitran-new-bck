# 16 — Security

Security model for LawMitran. Several controls are implemented today (JWT auth, rate limiting,
sanitisation, security headers, reCAPTCHA); the rest are the target standard.

## Authentication

- **Password + mobile-OTP registration for both roles; password-only login.** A mobile OTP is sent once at signup to verify the number; login never sends an OTP (keeps SMS cost ~1 per user). Email verification is a free, non-blocking link.
- Passwords hashed (bcrypt, cost 12) — never stored or logged in plaintext.
- `ADMIN` accounts cannot be self-registered.

### Mobile OTP hardening (implemented in `common/otp` + `auth.service`)

Mobile OTP is the blocking signup gate for both roles, so it is hardened:

- **Hash the OTP** before storing — the raw code is never persisted; only `mobileOtpHash` (SHA-256) is kept and compared on verify.
- **Cryptographic generation**: 6-digit code from `crypto.randomInt` (no `Math.random`, no modulo bias).
- **Short expiry** (`mobileOtpExpiresAt`, 5 minutes); expired codes rejected.
- **Attempt cap**: after 5 wrong tries (`mobileOtpAttempts`) the code is invalidated and verification is locked for 15 min (`mobileOtpLockedUntil`), forcing a resend.
- **Resend cooldown**: 30s between sends (`mobileOtpLastSentAt`); UI shows the timer. Protects against SMS/WhatsApp bill abuse.
- **Endpoint rate limits**: `@RateLimit(5, 60s)` on `mobile/send-otp`, `@RateLimit(10, 60s)` on `verify-otp`.
- **Delivery: WhatsApp-first, SMS fallback** (`OtpService.deliver`) — WhatsApp is much cheaper in India; SMS is the deliverability backstop.
- Email verification is **async/non-blocking** (link with `emailVerificationToken` + expiry) — never gates login.
- Account-verified (`mobileVerified`) and professionally-verified (`Lawyer.verificationStatus`) are independent gates.

### JWT

- Global `JwtAuthGuard` — every route authenticated unless `@Public()`.
- Access tokens: short-lived JWT signed with `JWT_ACCESS_SECRET`.
- `JwtStrategy` populates the request user; `@CurrentUser()` reads it.

### Refresh Tokens

- Separate JWT signed with `JWT_REFRESH_SECRET`, separate expiry.
- Stored as **SHA-256 hashes** in `RefreshToken` (never the raw token).
- **Single-use:** `refresh()` revokes the stored token before issuing a new pair (rotation).
- `logout()` revokes by re-hashing the presented refresh token.

## Authorization (RBAC)

- Global `RolesGuard` + `@Roles(Role.X)`; allows through when no roles specified.
- Three roles: `CLIENT | LAWYER | ADMIN`.
- Ownership checks in services (a lawyer only sees their own leads; a client only their own history).

### Admin privileges & audit

- All `/api/admin/*` routes are `@Roles(Role.ADMIN)`; `ADMIN` cannot be self-registered.
- **Every admin write is audit-logged** (`AuditLog`: actor, action, entity, entityId, timestamp) —
  approvals, rejections, suspensions, user soft-deletes, template publish/archive, plan changes.
- **Destructive actions are soft, not hard:** users and templates are deactivated/archived, never
  physically deleted (preserves leads, ratings, payments, and purchased documents).
- Admins **trigger** password resets but never read/set raw passwords.
- Least privilege: a `SUPER_ADMIN` vs `MODERATOR` split (approvals vs content) can be added to the `Role`
  enum later without changing the guard model.

## Rate Limiting

- `@RateLimit(limit, windowMs)` + `RateLimitGuard` on public/auth endpoints.
- Examples: register 5/min, login 10/min, refresh 20/min, send-OTP 5/min.
- Backed by Redis counters; protects against brute force and abuse.

## Input Validation & Sanitisation

- Global `ValidationPipe({ whitelist: true, transform: true })` — unknown props stripped, types coerced.
- `sanitize.middleware` strips/escapes dangerous input (XSS/injection).
- DTOs use `class-validator`; reject malformed enums, IDs, and out-of-range values.

## Bot Protection

- `recaptcha` service guards public submission forms (register, lead, document purchase).

## S3 / Upload Security

- Uploads go to S3/MinIO via the storage service; only S3 keys stored in the DB.
- Validate file type and size; scan/limit content types for certs/IDs/documents.
- Serve private files (Bar Council certs, IDs, purchased PDFs) **only via short-lived signed URLs**, scoped to the authorized user/admin.
- `S3_FORCE_PATH_STYLE=true` for MinIO in dev; bucket policies locked down in prod.

## Webhooks & Payments

- Verify Razorpay signatures before trusting webhook/verify payloads.
- Reconcile payment state by provider status; never mark `PAID` on client claim alone.

## Audit Logs

- `AuditLog` (target) records security-relevant actions: verification decisions, suspensions, plan/template changes, account state changes (actor, action, entity, timestamp, metadata).
- Verification trail (`Verification`) and lead transitions (`LeadHistory`) provide domain-level audit.

## Encryption

- TLS in transit (NGINX termination, HTTPS everywhere).
- Secrets in env/secret manager, never in code or logs.
- Encryption at rest for DB and object storage (cloud-provider managed).
- Security headers via `security-headers.middleware` (HSTS, X-Content-Type-Options, frame options, etc.).

## OWASP Top 10 Alignment

| Risk | Mitigation |
|---|---|
| Broken access control | Global guards, role + ownership checks |
| Cryptographic failures | TLS, hashed passwords, hashed refresh tokens, at-rest encryption |
| Injection | Prisma parameterised queries, validation, sanitisation |
| Insecure design | Verification gate, single-use refresh tokens, pay-before-download |
| Security misconfiguration | Security headers, locked S3 policies, least-privilege env |
| Vulnerable components | Dependency scanning in CI |
| Auth failures | Rate limiting, OTP, email verification, token rotation |
| Data integrity | Webhook signature verification, audit logs |
| Logging/monitoring | Structured logs, audit trail, alerts (see DevOps) |
| SSRF | Validate/whitelist outbound URLs |

## Secrets / Env

`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `DATABASE_URL`, `S3_*`, `RAZORPAY_*`, SMS/WhatsApp/SMTP, and
reCAPTCHA keys — all via environment/secret manager.

---
**Related:** [07-backend-guidelines.md](./07-backend-guidelines.md) · [05-api-design.md](./05-api-design.md) · [17-devops.md](./17-devops.md)
