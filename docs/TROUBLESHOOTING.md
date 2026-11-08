# DevFlow AI: Production Troubleshooting Guide

This runbook provides diagnostic commands, incident response playbooks, and mitigation steps for operational issues in production.

---

## 1. Quick Diagnostic Checklist

| Check | Command | Healthy Indicator |
|---|---|---|
| API Health Probe | `curl http://localhost:4000/health/live` | `{"status":"live"}` |
| API Database Readiness | `curl http://localhost:4000/health/ready` | `{"status":"ready"}` |
| System Resource Metrics | `curl http://localhost:4000/health/metrics` | Heap usage normal, uptime incrementing |
| AI Microservice Probe | `curl http://localhost:8000/health` | `{"status":"healthy"}` |
| Redis Broker Ping | `redis-cli -a $REDIS_PASSWORD ping` | `PONG` |
| MongoDB Replica Set | `mongosh --eval "rs.status().ok"` | `1` |

---

## 2. Common Issues & Runbooks

### A. Webhook Signature Validation Failure (401 Unauthorized)
- **Symptom**: GitHub delivery reports `Invalid webhook signature (HMAC-SHA256 mismatch)`.
- **Root Cause**:
  - `GITHUB_WEBHOOK_SECRET` in `.env.production` does not match the secret in the GitHub App settings.
  - Reverse proxy modified or parsed the raw HTTP body before signature evaluation.
- **Resolution**:
  1. Verify the exact webhook secret string in the GitHub App console.
  2. Ensure your ingress or reverse proxy passes the body unaltered without decoding.

### B. Background Jobs Stuck in "PENDING" or "ACTIVE"
- **Symptom**: Jobs in `/jobs` remain in `ACTIVE` state without updating progress.
- **Root Cause**:
  - Redis connection dropped or worker concurrency pool exhausted.
- **Resolution**:
  1. Inspect container logs:
     ```bash
     docker compose -f docker-compose.prod.yml logs api --tail 100 -f
     ```
  2. Inspect BullMQ queue depth:
     ```bash
     curl -H "Authorization: Bearer <TOKEN>" http://localhost:4000/api/v1/jobs/stats/summary
     ```
  3. If jobs stalled due to unhandled container termination, trigger cancellation or manual replay from the UI or via API:
     ```bash
     curl -X POST -H "Authorization: Bearer <TOKEN>" http://localhost:4000/api/v1/jobs/<JOB_ID>/retry
     ```

### C. Test Sandbox Execution Timeout (Killed After 15s)
- **Symptom**: Sandbox runner fails with exit code 137 or timeout error.
- **Root Cause**:
  - Developer-submitted test suite contained an infinite loop or heavy network dependencies (remember sandbox has `networkMode: none`).
- **Resolution**:
  - Check the test run stdout/stderr in `/tests/execution`. Verify the test file does not make external HTTP requests or block indefinitely on timers.

### D. MongoDB "Unready" Status
- **Symptom**: `GET /health/ready` returns 503 `Database connection offline`.
- **Root Cause**:
  - Replica set `rs0` not initiated or mongod process OOM-killed.
- **Resolution**:
  1. Check MongoDB container status:
     ```bash
     docker logs devflow-prod-mongodb --tail 50
     ```
  2. Re-initiate replica set if needed:
     ```bash
     docker exec -it devflow-prod-mongodb mongosh --eval "rs.initiate()"
     ```

---

## 3. Disaster Recovery & Restoration

To restore from the latest automated S3 backup:
```bash
./scripts/restore-mongodb.sh /backups/mongodb/devflow_backup_latest.tar.gz
```
