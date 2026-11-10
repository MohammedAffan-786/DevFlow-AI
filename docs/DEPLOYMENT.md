# DevFlow AI: Production Deployment Guide

This document outlines the step-by-step procedures for deploying DevFlow AI into production environments with enterprise-grade availability, security, and scalability.

---

## 1. Prerequisites & System Requirements

### Hardware Sizing (Minimum Production Baseline)
- **CPU**: 4 vCPUs (x86_64 or ARM64)
- **Memory**: 8 GB RAM (16 GB recommended for high concurrent test suites)
- **Disk**: 50 GB NVMe SSD storage
- **Docker Engine**: Version 24.0+ with Docker Compose v2.20+

### External Credentials Required
1. **GitHub App**:
   - App ID, Client ID, Client Secret, Webhook Secret, and RSA Private Key (`.pem`).
2. **Ollama API**:
   - `OLAMA_API_KEY`, `OLAMA_BASE_URL` (defaults to `https://ollama.com`), and `OLAMA_MODEL`.
3. **Domain & DNS**:
   - Registered domain (e.g. `devflow.ai`) with DNS records pointing to your ingress or load balancer.

---

## 2. Environment Configuration

1. Clone the repository on your production host:
   ```bash
   git clone https://github.com/devflow-ai/devflow.git /opt/devflow
   cd /opt/devflow
   ```

2. Copy the production environment template:
   ```bash
   cp .env.production.example .env.production
   ```

3. Populate secrets in `.env.production`:
   ```bash
   # Generate cryptographic keys
   openssl rand -base64 32 # Use for JWT_ACCESS_SECRET
   openssl rand -base64 32 # Use for JWT_REFRESH_SECRET
   openssl rand -base64 32 # Use for REDIS_PASSWORD
   openssl rand -base64 32 # Use for AI_SERVICE_INTERNAL_KEY
   ```

---

## 3. Multi-Container Orchestration (Docker Compose)

DevFlow AI features a production compose file with isolated bridge networks, healthchecks, and non-root execution:

```bash
# Build and start all services in detached mode
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

### Checking Service Health
```bash
docker compose -f docker-compose.prod.yml ps
```

Verify that all five services transition to `healthy`:
- `devflow-prod-web` (Port 80/443)
- `devflow-prod-api` (Port 4000)
- `devflow-prod-ai` (Port 8000)
- `devflow-prod-mongodb` (Port 27017, rs0 replica set)
- `devflow-prod-redis` (Port 6379)

---

## 4. Reverse Proxy & SSL/TLS Configuration (Nginx / Cloudflare)

For production HTTPS termination, place Nginx, Traefik, or an AWS Application Load Balancer in front of `web:80`:

```nginx
server {
    listen 443 ssl http2;
    server_name app.devflow.ai;

    ssl_certificate /etc/letsencrypt/live/app.devflow.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.devflow.ai/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://127.0.0.1:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

---

## 5. Database Index Initialization & Migration

Run the automated index migration script inside the API container:
```bash
docker compose -f docker-compose.prod.yml exec api node apps/api/dist/scripts/initIndexes.js
```

---

## 6. Full-Stack Deployment on Vercel

The repository root `vercel.json` configures one Vercel project with the Vite
web app, Express API, FastAPI AI service, and a background job daemon. Connect
the repository with the **Root Directory set to `.`**; do not set it to
`apps/web`. The API service also uses the repository root so Vercel includes
pnpm's workspace dependency store when packaging the API function; keep its
entrypoint pointed at `apps/api/src/server.ts`. The API is routed under
`/api/*`, health probes under `/health/*`, and the AI service is private and
reached through a Vercel service binding.

Configure these production environment variables in the Vercel project:

- `MONGO_URI`: reachable MongoDB connection string for a managed replica set.
- `REDIS_URL`: reachable Redis URL (`rediss://` when TLS is required). This is
  used by the API, cache, and background worker.
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`: independent random secrets of
  at least 32 characters.
- `TOKEN_ENCRYPTION_KEY`: a separate strong secret for encrypting stored GitHub
  tokens.
- `AI_SERVICE_INTERNAL_KEY` and `INTERNAL_API_KEY`: the same strong random
  value; the API/worker use the former and the private AI service uses the
  latter.
- `OLAMA_API_KEY`, `OLAMA_BASE_URL`, and `OLAMA_MODEL`.
- GitHub App settings: `GITHUB_APP_ID`, `GITHUB_CLIENT_ID`,
  `GITHUB_CLIENT_SECRET`, `GITHUB_WEBHOOK_SECRET`, and `GITHUB_PRIVATE_KEY`.
- `FRONTEND_URL` and `API_URL`: the public Vercel deployment origin (both are
  the same origin when using the shared domain).

Set the GitHub OAuth callback URL to
`<API_URL>/api/v1/auth/github/callback` and the GitHub App webhook URL to
`<API_URL>/api/v1/webhooks/github`.

Vercel injects `AI_SERVICE_URL` into the API and worker from the private service
binding; do not set it to localhost. Do not use the Compose `mongodb`/`redis`
hostnames or localhost URLs in production. Those Compose containers and their
volumes are not deployed by Vercel, so use managed, externally reachable data
services. Keep all credentials in Vercel environment settings, not in source
control.

The job worker is a Vercel Daemon and needs the same MongoDB, Redis, GitHub, and
AI internal-key environment variables as the API. Its configured instance is
in `iad1`; align your data-service regions with it where practical.

Vercel Functions do not provide the local Docker socket used by generated-test
execution. That feature requires a separately hosted, securely isolated Docker
sandbox; without one, test execution reports that the sandbox is unavailable.
The deployment configuration does not expose the private AI service or claim
that Compose databases/sandbox containers run on Vercel.

After adding the environment variables, deploy from the repository root with
the Vercel CLI or connect the Git repository in Vercel. A live deployment
cannot complete until the Vercel project is linked and these external service
credentials are configured.
