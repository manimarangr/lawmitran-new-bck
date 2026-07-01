# LawMitran — Documentation

LawMitran is a **legal marketplace for India**: verified-lawyer discovery + lead generation + a legal
document marketplace. It runs on a **lead-generation model** — a client submits a requirement, it routes
to verified eligible lawyers as a lead, and the lawyer contacts the client directly. There is no in-app
scheduling or messaging.

This `docs/` folder is the product + engineering reference.

## How to read these docs

> **Vision-first.** These documents describe the **target product**. The current codebase is early
> scaffolding — `auth` and `ratings` are implemented; most feature modules are stubs, and the
> `frontend` workspace isn't created yet. Individual docs use **"Today"** callouts to flag where the
> current implementation differs from the target (e.g. `LeadStatus` has no `ASSIGNED` yet; locations
> and practice areas are denormalized strings; document marketplace and AI are not built).

## Index

| # | Doc | What's inside |
|---|---|---|
| 01 | [Product Vision](./01-product-vision.md) | Vision, mission, users, competitors, MVP, roadmap |
| 02 | [Business Rules](./02-business-rules.md) | Roles + verification, subscription, lead, trial, premium rules |
| 03 | [System Architecture](./03-system-architecture.md) | Next.js, NestJS, PostgreSQL, MinIO/S3, Redis, BullMQ, ElasticSearch |
| 04 | [Database Design](./04-database-design.md) | Every entity + complete ER diagram |
| 05 | [API Design](./05-api-design.md) | All endpoints, conventions, Swagger |
| 06 | [Frontend Guidelines](./06-frontend-guidelines.md) | Tailwind, shadcn/ui, structure, state, a11y |
| 07 | [Backend Guidelines](./07-backend-guidelines.md) | NestJS, DTOs, Prisma, transactions, pagination |
| 08 | [Lawyer Module](./08-lawyer-module.md) | Onboarding, verification, profile, inbox, dashboard |
| 09 | [Client Module](./09-client-module.md) | Search, bookmarks, leads, documents, notifications |
| 10 | [Admin Module](./10-admin-module.md) | Approvals, users, plans, templates, reports |
| 11 | [Document Marketplace](./11-document-marketplace.md) | Categories, generation & purchase, PDF, storage |
| 12 | [AI Module](./12-ai-module.md) | Intake, matching, generation, review, assistant, RAG |
| 13 | [Subscription Module](./13-subscription-module.md) | Trial, plans, billing, renewal, expiry, restrictions |
| 14 | [Lead Management](./14-lead-management.md) | Lifecycle, distribution, scoring, duplicates |
| 15 | [Search & Matching](./15-search-and-matching.md) | Homepage search + showcase, ranking, filters, SEO |
| 16 | [Security](./16-security.md) | JWT, refresh tokens, RBAC, rate limiting, S3, OWASP |
| 17 | [DevOps](./17-devops.md) | Docker, CI/CD, environments, AWS, monitoring |
| 18 | [Roadmap](./18-roadmap.md) | Phases 1–4 |
| 19 | [Scalability](./19-scalability.md) | Handling 10k+ concurrent users: caching, CDN, pooling, autoscaling |
| 20 | [Win-back (expired contact)](./20-winback-expired-contact.md) | Gate contact on expired subs, hold leads, "N clients waiting — renew" digest |
| 21 | [Improvement Backlog](./21-improvement-backlog.md) | Prioritized gaps: India compliance (BCI/DPDP/GST), trust & lead integrity, cold-start, client depth, pricing, search/UX |

## Tech stack (target)

Frontend **Next.js (App Router)** · Backend **NestJS** · DB **PostgreSQL (Prisma)** · Storage
**MinIO/S3** · Cache **Redis** · Payments **Razorpay** · Future **ElasticSearch + BullMQ**.

## Current vs Target — quick diff

| Area | Today | Target |
|---|---|---|
| Modules | `auth`, `ratings` real; rest stubs | all modules implemented |
| Frontend | not scaffolded | Next.js app |
| Lead status | `NEW → CONTACTED → CLOSED` | `NEW → ASSIGNED → CONTACTED → CLOSED` |
| Location / practice area | strings on `Lawyer` | normalized `State/District/City`, `PracticeArea` |
| "Review" entity | `Rating` | `Rating` (a.k.a. Review) |
| Notifications / AuditLog | not present | dedicated entities |
| Document marketplace / AI | stubs | fully built (Phase 2 / 3) |

## Conventions

- API base prefix `/api`; Swagger at `/api/docs`.
- Every route authenticated + role-checked by default; `@Public()` opts out, `@Roles()` restricts.
- Public browse (search, profiles, document catalog) is unauthenticated for SEO; lead submission and
  document purchase require login.

See `../CLAUDE.md` for build/run commands and repository-level guidance.
