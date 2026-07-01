# Load Testing — validating the 10k-concurrent target

This validates the capacity plan in [`../docs/19-scalability.md`](../docs/19-scalability.md) using
[k6](https://k6.io). The script models realistic traffic: ~95% public reads (search, profile, document
browse) with think-time, and ~5% writes (signup + OTP, lead submission). Because each VU sleeps between
requests, **VUs ≈ concurrent users** (not raw RPS).

## Prerequisites

- Install k6: https://k6.io/docs/get-started/installation/
- A running target — either the scale stack or a staging deployment.

### Option A — local scale stack

```bash
# from repo root: bring up nginx + N api replicas + pgbouncer + postgres + redis + minio
docker compose -f infra/docker-compose.scale.yml up -d --scale api=4

# target the nginx load balancer
export BASE_URL=http://localhost:8080
```

### Option B — staging

```bash
export BASE_URL=https://staging.lawmitran.com
```

## Run

```bash
# smoke (default ~2000 peak VUs)
k6 run loadtest/k6-lawmitran.js

# scale up the peak concurrency
TARGET=5000 k6 run loadtest/k6-lawmitran.js

# full 10k target — usually needs a strong load generator or k6 Cloud / distributed mode
TARGET=10000 DURATION_RAMP=3m DURATION_HOLD=10m k6 run loadtest/k6-lawmitran.js
```

Tunables (env): `BASE_URL`, `TARGET` (peak VUs), `DURATION_RAMP`, `DURATION_HOLD`.

## Pass/fail thresholds (baked into the script)

| Metric | Target |
|---|---|
| `http_req_duration` p95 | < 300 ms |
| `http_req_duration` p99 | < 800 ms |
| `http_req_failed` | < 1% |
| `read_failures` | < 1% |

k6 exits non-zero if a threshold is breached — wire it into CI as a gate before release.

## What to watch while it runs

Correlate k6 output with server metrics (see the Observability section of the scalability doc):

- API: p95/p99 latency, RPS, error rate, event-loop lag.
- Postgres: active connections (should stay flat thanks to **PgBouncer**), slow queries, replica lag.
- Redis: cache hit ratio, memory, evictions.
- NGINX: `X-Cache-Status` header — public read endpoints should show `HIT` for most traffic.
- Autoscaler: pod count scaling with load.

## Tuning loop

1. Run at `TARGET=2000`, confirm thresholds pass.
2. Raise `TARGET` toward 10000; find the first thing that bends (usually DB connections or a hot query).
3. Fix it — bump PgBouncer pool / add an index / raise cache TTL / add an API replica — and re-run.
4. Repeat until 10k holds within thresholds, then add ~30% headroom.

## Notes

- The write paths create throwaway accounts/leads — point at a **disposable/staging DB**, never production.
- For authenticated write load, extend the script to log in once per VU and reuse the JWT (`Authorization: Bearer`).
- Reads are intentionally cache-friendly so you can verify the CDN/NGINX cache layer is doing its job.
