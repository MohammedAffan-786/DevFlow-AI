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
2. **LLM Provider API Keys**:
   - Anthropic Claude API Key (`sk-ant-...`) and/or OpenAI API Key (`sk-...`).
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

## 6. Frontend Deployment on Vercel (Alternative Cloud Setup)

If deploying the frontend independently on Vercel:
1. Framework Preset: **Vite**
2. Root Directory: `apps/web`
3. Build Command: `pnpm run build`
4. Output Directory: `dist`
5. Environment Variables:
   - `VITE_API_BASE_URL`: `https://api.devflow.ai/api/v1`
