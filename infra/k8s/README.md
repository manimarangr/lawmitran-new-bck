# Kubernetes manifests — autoscaled API + workers

Production-leaning manifests implementing the stateless/autoscaling tiers from
[`../../docs/19-scalability.md`](../../docs/19-scalability.md). Pair these with managed Postgres
(+ PgBouncer + read replicas), managed Redis, S3, and an Ingress/CDN.

## Files

| File | What it deploys |
|---|---|
| `api.yaml` | NestJS API `Deployment` + `Service` + **HPA** (CPU/memory, 4→16) + `PodDisruptionBudget` |
| `worker.yaml` | BullMQ workers `Deployment` + HPA (with a KEDA queue-depth example) |

## Prerequisites

- A cluster with the **metrics-server** installed (HPA needs it).
- A `lawmitran-api` Secret holding the env the app reads:

```bash
kubectl create secret generic lawmitran-api \
  --from-literal=DATABASE_URL='postgresql://user:pass@pgbouncer:6432/lawmitran?pgbouncer=true&connection_limit=5' \
  --from-literal=REDIS_URL='redis://redis:6379' \
  --from-literal=JWT_ACCESS_SECRET='***' \
  --from-literal=JWT_REFRESH_SECRET='***' \
  --from-literal=S3_ENDPOINT='https://s3.amazonaws.com' \
  --from-literal=S3_BUCKET='lawmitran' \
  --from-literal=S3_ACCESS_KEY='***' \
  --from-literal=S3_SECRET_KEY='***'
```

> Note `DATABASE_URL` points at **PgBouncer**, with a small per-pod `connection_limit` — this is what
> lets you run 16 API pods without exhausting Postgres connections.

## Apply

```bash
kubectl apply -f infra/k8s/api.yaml
kubectl apply -f infra/k8s/worker.yaml

kubectl get pods -l app=lawmitran-api
kubectl get hpa                      # watch replicas scale under load
```

Point an Ingress (NGINX Ingress / ALB) and your CDN at the `lawmitran-api` Service, and cache public
GET routes (`/api/lawyers`, `/api/documents`) at the edge — see the scalability doc.

## Validating autoscaling

Run the load test (`../../loadtest/`) against the Ingress/CDN URL and watch:

```bash
kubectl get hpa lawmitran-api -w        # replicas should climb past the baseline
kubectl top pods -l app=lawmitran-api   # CPU per pod
```

The CI workflow `.github/workflows/k6-loadtest.yml` can run this as a release gate.

## Notes

- Workers scale best on **queue depth** — install KEDA and use the `ScaledObject` example in
  `worker.yaml` instead of the CPU HPA for production.
- `PodDisruptionBudget` (minAvailable: 3) keeps capacity during node drains and rolling deploys.
- `maxUnavailable: 0` + readiness probes + preStop sleep give zero-downtime rollouts.
