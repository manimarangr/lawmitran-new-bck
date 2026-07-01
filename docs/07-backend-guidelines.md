# 07 — Backend Guidelines

NestJS + Prisma conventions for the LawMitran API.

## Module Conventions

- One feature = one module under `src/modules/<feature>` (`*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`).
- Modules export only what other modules need; keep services private otherwise.
- Cross-cutting concerns live in `src/common` (storage, payments, mail, sms, whatsapp, esign, estamp, security, guards, decorators).
- `PrismaModule` is global; inject `PrismaService` rather than instantiating clients.

## Auth & Guards (global)

`AppModule` registers `JwtAuthGuard` and `RolesGuard` as global `APP_GUARD`s — **every route is
authenticated and role-checked by default**.

- `@Public()` — bypass `JwtAuthGuard` (use on search, public profiles, document browsing, auth endpoints).
- `@Roles(Role.LAWYER, Role.ADMIN)` — restrict to listed roles; `RolesGuard` allows through if no roles specified.
- `@CurrentUser()` — read the authenticated user (populated by `JwtStrategy`).

New controllers don't wire guards manually — mark public routes `@Public()`, gate role-specific ones with `@Roles()`.

## DTOs & Validation

- Every request body is a DTO class with `class-validator` + `class-transformer` decorators.
- Global `ValidationPipe({ whitelist: true, transform: true })` strips unknown props and coerces types — so DTOs must declare every accepted field.
- Use `@ApiProperty()` for Swagger; separate Create/Update DTOs (`PartialType` for updates).
- Validate enums with `@IsEnum`, IDs with `@IsUUID`, and bound pagination (`@Min/@Max`).

## Exception Handling

- Throw Nest `HttpException` subclasses (`BadRequestException`, `ForbiddenException`, `ConflictException`, `NotFoundException`).
- A global `AllExceptionsFilter` normalises the error envelope and logs with a correlation id.
- Never leak Prisma errors directly — map `P2002` (unique) → 409, `P2025` (not found) → 404.

## Interceptors

- **Logging interceptor:** method, path, status, duration, correlation id.
- **Transform interceptor:** consistent success envelope where used.
- **Timeout interceptor:** guard slow downstreams (payments, storage).

## Logging

- Structured JSON logs (level, timestamp, correlationId, userId, message).
- No secrets/PII (passwords, raw tokens, OTPs) in logs.
- Correlation id per request, propagated to async jobs.

## Prisma Standards

- `PrismaService` extends `PrismaClient`, hooks `onModuleInit`/`enableShutdownHooks`.
- Schema changes via `npx prisma migrate dev`; never hand-edit the database.
- Select only needed fields (`select`/`include`); avoid N+1 with nested reads.
- Money as `Decimal`; enums for state machines.

## Repository / Service Rules

- Business logic in services; controllers stay thin (parse → call service → return).
- Keep Prisma access inside services (or a thin repository layer for complex queries).
- Enforce business rules from [02-business-rules.md](./02-business-rules.md) in the service layer, not the controller.

## Transactions

- Wrap multi-write operations in `prisma.$transaction` (e.g. create Lead + LeadHistory + notification record; refresh-token rotation; payment capture + document status).
- Keep transactions short; do external calls (Razorpay, S3) outside the DB transaction and reconcile by status.

## Pagination

- Standard query: `page` (default 1), `limit` (default 20, max 100).
- Response: `{ data, meta: { page, limit, total, totalPages } }`.
- Use keyset/cursor pagination for very large/public listings when needed.

## Security Practices

- Rate-limit public/auth endpoints (`@RateLimit(n, windowMs)` + `RateLimitGuard`).
- Sanitise input (`sanitize.middleware`); set security headers (`security-headers.middleware`).
- reCAPTCHA on public submission forms (register, lead, document purchase).
- Validate webhook signatures (Razorpay) before trusting payloads.

## Testing

- Unit tests (`*.spec.ts`, `rootDir: src`) for service logic, especially business rules.
- e2e tests (`test/jest-e2e.json`) for auth, lead routing, verification gating.
- Run: `npm run test --workspace backend`, `npm run test:e2e --workspace backend`, `npm run test:cov --workspace backend`.

---
**Related:** [03-system-architecture.md](./03-system-architecture.md) · [05-api-design.md](./05-api-design.md) · [16-security.md](./16-security.md)
