# Docker Compose — LawMitran

Base stack + per-environment overrides. The **base** (`compose.yml`) defines the five services (postgres, redis, minio, backend, frontend); each **override** adjusts images, ports, and runtime for one environment.

```
infra/docker/
├── compose.yml                  # base — shared service definitions
├── compose.dev.override.yml     # Development — local build, all ports exposed
├── compose.qa.override.yml      # QA — prebuilt images, localhost ports
└── compose.prod.override.yml    # Production — always-restart, limits, logging
```

> nginx + TLS run **host-level** (see [docs/devops/08-nginx.md](../../docs/devops/08-nginx.md), [09-ssl.md](../../docs/devops/09-ssl.md)), not in this stack. On the shared box, Dev and QA run as separate Compose **projects** (`lawmitran-dev`, `lawmitran-qa`) so they never share state.

## Usage

Run from the repo root. Always pass the base first, then one override.

```bash
# Development — build images locally, expose 3000/3001 + db/redis/minio to host
docker compose -f infra/docker/compose.yml \
               -f infra/docker/compose.dev.override.yml up -d --build

# QA — pull the image built in CI, bind app ports to localhost only
IMAGE_TAG=<sha> docker compose -f infra/docker/compose.yml \
               -f infra/docker/compose.qa.override.yml up -d

# Production
IMAGE_TAG=<sha> docker compose -f infra/docker/compose.yml \
               -f infra/docker/compose.prod.override.yml up -d
```

## Database migrations

Run once per deploy, before the new backend serves traffic:

```bash
docker compose -f infra/docker/compose.yml -f infra/docker/compose.prod.override.yml \
  run --rm backend npx prisma migrate deploy
```

## Environment variables

Each app owns its env file: the backend reads `backend/.env` and the frontend reads `frontend/.env.local` (`env_file:` in the base compose). There is no root `.env` dependency. Postgres/MinIO container credentials come from compose interpolation defaults (or the shell). See [docs/devops/10-environment-variables.md](../../docs/devops/10-environment-variables.md). Key build-time / runtime vars:

| Variable | Used by | Notes |
|---|---|---|
| `IMAGE_TAG` | qa/prod | Commit SHA of the image to run (rollback = older SHA) |
| `GHCR_OWNER` | qa/prod | GHCR namespace for pulled images |
| `NEXT_PUBLIC_API_URL` | frontend build | Baked at build time (per environment) |
| `POSTGRES_*` | postgres/minio containers | compose interpolation (defaults provided) |
| `DATABASE_URL`, `S3_*`, `JWT_*` | backend | From `backend/.env` |

## Port map

| Service | Dev (host) | QA (host) | Prod (host) |
|---|---|---|---|
| frontend | `3000` | `127.0.0.1:3200` | `127.0.0.1:3000` |
| backend | `3001` | `127.0.0.1:3201` | `127.0.0.1:3001` |
| postgres | `5432` | — | — |
| redis | `6379` | — | — |
| minio | `9000/9001` | — | — |

QA/Prod expose **only** app ports on localhost (host nginx proxies them); data services stay on the internal network.

## Common operations

```bash
COMPOSE="docker compose -f infra/docker/compose.yml -f infra/docker/compose.prod.override.yml"
$COMPOSE ps
$COMPOSE logs -f backend
$COMPOSE pull && $COMPOSE up -d      # deploy new IMAGE_TAG
$COMPOSE down                        # stop stack (volumes preserved)
```
