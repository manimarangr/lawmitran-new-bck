# LawMitran

LawMitran is a legal marketplace for India: lawyer discovery, lead generation, and a legal document marketplace. It is a **lead-generation** platform, not a consultation-booking one — a client submits a legal requirement, it routes to verified, eligible lawyers as a lead, and the lawyer contacts the client directly. There is no in-app scheduling.

## Repo layout

This is an npm workspace with two packages:

- `backend` — NestJS + Prisma + PostgreSQL API. Implemented.
- `frontend` — Next.js 16 (App Router). Implemented — see [docs/26-frontend-implementation.md](./docs/26-frontend-implementation.md).

## Stack

- **Backend**: NestJS, Prisma, PostgreSQL
- **Cache/queues**: Redis
- **File storage**: MinIO (dev) / AWS S3 (prod) via `@aws-sdk/client-s3`
- **Payments**: Razorpay
- **Auth**: JWT (access + refresh), Passport
- **Infra**: Docker Compose (Postgres, Redis, MinIO, backend, frontend, nginx)

## Backend modules

- `auth` — register/login, JWT access + refresh tokens, email/mobile OTP verification, reCAPTCHA
- `lawyers` — profile creation/update, admin review/approval, public search
- `leads` — lead submission and status lifecycle (`NEW → CONTACTED → CLOSED`)
- `subscriptions` — trial/plan activation, Razorpay payment verification
- `ratings` — lawyer ratings
- `users`, `documents`, `admin`, `ai-intake` — scaffolded, not yet implemented

Cross-cutting (`src/common`): storage (S3/MinIO), mail, SMS, WhatsApp, payments (Razorpay), e-sign, e-stamp, reCAPTCHA, rate limiting, request sanitization, security headers.

## Key business rules

- Only lawyers with `verificationStatus = APPROVED` appear in public search.
- Lead routing excludes lawyers with `subscriptionStatus = EXPIRED` (their profile stays visible, but they stop receiving new leads).
- Public lawyer search/profile/document browsing is unauthenticated for SEO; only lead submission and document purchase require login.

## Getting started

```bash
# install dependencies
npm install

# copy per-app env templates and fill in secrets (each app owns its own env)
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# start infra (Postgres, Redis, MinIO, nginx)
docker compose up -d postgres redis minio

# apply database schema
npx prisma migrate dev --schema backend/prisma/schema.prisma

# run the apps in watch mode
npm run dev:backend
npm run dev:frontend
```

The API is served under `/api`, with Swagger docs at `/api/docs`.

## Common commands

Run from the repo root unless noted.

```bash
npm run dev:backend          # nest start --watch (port from .env, default 3001)
npm run build:backend

# Backend (run from backend/, or via --workspace backend)
npm run start:dev --workspace backend
npm run lint --workspace backend
npm run format --workspace backend
npm run test --workspace backend
npm run test --workspace backend -- app.controller.spec   # single test file
npm run test:e2e --workspace backend
npm run test:cov --workspace backend

# Prisma (run from backend/)
npx prisma migrate dev
npx prisma studio
npx prisma generate

# Full stack via Docker
docker compose up -d
```

## Environment variables

Each application owns its own environment file — there is **no root `.env`**. Copy the templates and fill in values:

### Backend

```bash
cp backend/.env.example backend/.env
```

Loaded automatically by `@nestjs/config` and Prisma (both run with `backend/` as the working directory). Required / core variables:

| Variable | Purpose | Default |
|---|---|---|
| `NODE_ENV` | Runtime mode | `development` |
| `PORT` | API port | `3001` |
| `FRONTEND_ORIGIN` | CORS origin + email links | `http://localhost:3000` |
| `DATABASE_URL` | PostgreSQL connection (Prisma) | — |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Token signing | — |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN_LONG` | Token lifetimes | `15m` / `7d` / `30d` |
| `S3_ENDPOINT` / `S3_REGION` / `S3_BUCKET` / `S3_ACCESS_KEY` / `S3_SECRET_KEY` / `S3_FORCE_PATH_STYLE` | MinIO / S3 storage | — / `us-east-1` / `lawmitran-documents` / — / — / `true` |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS` | Default rate limit | `100` / `60000` |
| `ADMIN_EMAIL` / `ADMIN_MOBILE` / `ADMIN_PASSWORD` | Admin seed (`prisma/seed.ts`) | — |
| `AWARD_CC_*` / `AWARD_TR_*` / `AWARD_RS_*` | Lawyer award thresholds | see example |
| `REDIS_URL` | Reserved (container runs; not yet consumed by backend code) | `redis://localhost:6379` |

Integration keys (Razorpay, SMTP/email, reCAPTCHA, SMS, WhatsApp, AI, GST, business rules) are **managed in the Admin console** and stored in the database; the corresponding env vars in `backend/.env.example` are an optional fallback/bootstrap. See the commented section of that file.

### Frontend

```bash
cp frontend/.env.example frontend/.env.local
```

Next.js auto-loads `frontend/.env.local` for local development. `NEXT_PUBLIC_*` values are inlined at build time (never put secrets here):

| Variable | Purpose | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:3001/api` |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for SEO / sitemap / robots | `https://www.lawmitran.com` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps key for lawyer search (optional) | _(empty)_ |

## Documentation

Key references for the repo:

- [ROADMAP.md](./ROADMAP.md) — where the project is headed (phases).
- [STATUS.md](./STATUS.md) — what's implemented today (snapshot).
- [CONTRIBUTING.md](./CONTRIBUTING.md) — setup, workflow, and code conventions.
- [docs/architecture-diagrams.md](./docs/architecture-diagrams.md) — system, module, lead-flow, auth, data-model, and deployment diagrams.
- [docs/screenshots.md](./docs/screenshots.md) — UI reference / screenshot gallery.
- [docs/26-frontend-implementation.md](./docs/26-frontend-implementation.md) — the Next.js app (routes, API layer, auth model).
- [CLAUDE.md](./CLAUDE.md) — architecture notes (auth guards, Prisma domain model, storage conventions) for AI coding assistants.

The full design-doc set lives in [`docs/`](./docs/).

## More details

See `CLAUDE.md` for architecture notes (auth guards, Prisma domain model, storage conventions) aimed at AI coding assistants working in this repo.
