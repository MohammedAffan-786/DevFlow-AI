# DevFlow AI — Autonomous Code Intelligence & Security Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform Status](https://img.shields.io/badge/Architecture-Modular%20Monolith-emerald.svg)](#architecture)
[![Docker](https://img.shields.io/badge/Sandbox-gVisor%20%7C%20Docker-2496ED.svg)](#secure-code-execution)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript%205.x-3178C6.svg)](#tech-stack)
[![Python](https://img.shields.io/badge/AI%20Runtime-Python%203.11-3776AB.svg)](#tech-stack)

---

## Executive Overview

**DevFlow AI** is a next-generation, production-grade developer platform engineered to automate modern software quality and security engineering. It combines Abstract Syntax Tree (AST) parsing, static application security testing (SAST), graph-based dependency analysis, and Large Language Model (LLM) reasoning inside deterministic, isolated execution sandboxes.

DevFlow AI eliminates developer toil across the software delivery lifecycle:
- **Autonomous Bug Detection & Static Analysis**: Uncovers logic bugs, race conditions, memory/resource leaks, and anti-patterns before code merges.
- **Context-Aware Automated Code Reviews**: Inspects pull requests against repository-wide context, architecture guidelines, and style contracts, generating actionable GitHub inline reviews with diffs.
- **Automated Unit Test Generation**: Emits production-ready test suites (PyTest, Jest, Vitest) tailored to uncovered edge cases, mocks external services, and enforces mutation testing standards.
- **Ephemeral Sandboxed Execution**: Executes generated tests inside hardened, network-isolated, CPU/memory-governed Docker/gVisor containers to verify test greenness prior to proposing PR changes.
- **OWASP & CWE Security Vulnerability Auditing**: Discovers critical security flaws (SQLi, SSRF, XSS, insecure deserialization, hardcoded secrets) with zero-tolerance false-positive filtering.
- **Code Health & Technical Debt Analytics**: Computes real-time maintainability indexes, cyclomatic complexity, cognitive load, and churn metrics per repository.

---

## High-Level System Architecture

```
                                  +---------------------------------------+
                                  |         GitHub Platform API           |
                                  |   (OAuth, Webhooks, Rest, Octokit)    |
                                  +-------------------+-------------------+
                                                      |
                                                      | Webhook Events & OAuth
                                                      v
+------------------------+        HTTP / REST         +---------------------------------------+
|                        |<-------------------------->|                                       |
|      Frontend Web      |                            |        Core API Server (Node.js)      |
|  (React 18 + Vite + TS |                            |   (Express, Zod, Mongoose, BullMQ)    |
|   + Tailwind + shadcn) |<---------------------------|                                       |
+------------------------+         SSE / WS           +---------+-------------------+---------+
                                                                |                   |
                                                  Enqueues Jobs |                   | REST / JSON
                                                                v                   v
                                                      +-------------------+   +--------------------+
                                                      |    Redis 7.x      |   |   Python AI Core   |
                                                      | (BullMQ Queues)   |   | (FastAPI + Pydantic|
                                                      +---------+---------+   |  + LLM Orchestrator|
                                                                |             |  + AST Extraction) |
                                              Pulls Task Items  |             +--------------------+
                                                                v
                                              +-----------------------------------+
                                              |        Worker Fleet               |
                                              |  - Repo Ingestion & AST Worker    |
                                              |  - AI Analysis & PR Worker        |
                                              |  - Isolated Execution Worker      |
                                              +-----------------+-----------------+
                                                                |
                                             Launches Ephemeral | Docker Container
                                             Network: NONE      | Read-Only RootFS
                                                                v
                                              +-----------------------------------+
                                              |   Hardened Execution Sandbox      |
                                              |  (Python 3.11 / Node 20 / TS)     |
                                              |  cgroups v2 + Seccomp + gVisor    |
                                              +-----------------------------------+
```

---

## Technology Stack Matrix

| Layer | Technology | Version | Purpose / Rationale |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | React.js | `^18.3.1` | Concurrent rendering, component-driven reactive architecture. |
| **Language (UI/API)** | TypeScript | `^5.4.0` | Strict static typing across client, server, and shared domain models. |
| **Build Tool** | Vite | `^5.2.0` | Sub-second HMR and optimized tree-shaken production bundles. |
| **Styling & UI Components**| Tailwind CSS + shadcn/ui | `v3.4 / Radix` | Headless, accessible primitives styled via atomic utility classes. |
| **Client State / Fetching**| TanStack Query (v5) | `^5.28.0` | Cache invalidation, optimistic mutations, server state synchronization. |
| **Client Routing** | React Router | `^6.22.0` | Declarative, nested routing with protected route guards. |
| **Core API Gateway** | Express.js / Node.js | `v20.x LTS` | High-throughput asynchronous I/O, middleware ecosystem, event loop efficiency. |
| **Validation Engine** | Zod | `^3.22.0` | End-to-end runtime type safety, request schema verification. |
| **AI Inference Service** | Python / FastAPI | `Python 3.11 / ^0.110.0` | Native asynchronous ASGI server for ML/LLM pipelines, token streaming. |
| **Data Validation (AI)**| Pydantic v2 | `^2.6.0` | High-performance C-compiled schema validation, strict JSON schema output. |
| **Primary Database** | MongoDB Replica Set | `7.0.x` | Document model for polymorphic ASTs, diffs, scan runs, and flexible schemas. |
| **Object Data Modeling** | Mongoose | `^8.2.0` | Schema definitions, compound indexing, discriminator models, transactions. |
| **Message Broker & Queue**| Redis + BullMQ | `Redis 7.2 / BullMQ 5.x` | Distributed FIFO/delayed queues, priority job scheduling, rate limiting. |
| **Execution Sandbox** | Docker Engine / gVisor | `Docker 26+ / runsc` | Isolated micro-containers (`--network none`, `--read-only`, cgroup limits). |
| **Supported Run times**| Node, Python, TS | `Node 20, Python 3.11, TS 5` | Ephemeral test runners with standard runtime toolchains (`pytest`, `jest`). |
| **VCS Integration** | GitHub Apps & REST API | `@octokit/rest ^20.x` | Granular security tokens, Webhook HMAC validation, Check Run API. |

---

## Repository Structure

DevFlow AI is organized as a production-grade monorepo containing distinct operational domains:

```
devflow-ai/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── contexts/
│   │   ├── types/
│   │   └── utils/
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── queues/
│   │   ├── workers/
│   │   ├── integrations/
│   │   ├── validators/
│   │   └── utils/
│   └── package.json
│
├── ai-service/
│   ├── app/
│   │   ├── analyzers/
│   │   ├── generators/
│   │   ├── prompts/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   └── requirements.txt
│
├── execution-worker/
│   ├── runners/
│   ├── policies/
│   ├── tests/
│   └── Dockerfile
│
├── infrastructure/
│   ├── docker/
│   ├── monitoring/
│   └── deployment/
│
├── docs/
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```
|-- .env.example                           # Consolidated environment template
`-- package.json                           # Root monorepo workspace configuration
```

---

## Quickstart & Local Development Setup

### Prerequisites
- **Node.js**: `v20.11.0 LTS` or higher
- **pnpm**: `v8.15.0` or higher (`corepack enable pnpm`)
- **Python**: `3.11.x` with `pip` and `virtualenv`
- **Docker Engine**: `24.0+` with Docker Compose v2 support
- **GitHub App**: Configured on GitHub Developer Settings with appropriate permissions and webhook secrets

### Step 1: Clone and Configure Environment

```bash
git clone https://github.com/your-org/devflow_ai.git
cd devflow_ai
cp .env.example .env
```

Edit `.env` to populate required credentials (LLM API keys, GitHub App Client ID/Secret, Private Key, JWT Secrets, Mongo and Redis URIs).

### Step 2: Launch Supporting Infrastructure via Docker Compose

```bash
# Starts MongoDB 7.0 (Replica Set) and Redis 7.2 Stack with persistent volumes
docker compose up -d mongodb redis
```

Verify services are healthy:
```bash
docker compose ps
```

### Step 3: Install Dependencies

```bash
# Install root, workspace packages, frontend, and backend dependencies
pnpm install

# Setup Python AI service virtual environment
cd services/ai
python -m venv venv
# On Linux/macOS:
source venv/bin/activate
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd ../..
```

### Step 4: Build Isolated Sandbox Base Images

Before running local test executions, build the minimal, hardened container images:

```bash
docker build -t devflow-sandbox-python:latest -f docker/sandboxes/python-runner/Dockerfile .
docker build -t devflow-sandbox-node:latest -f docker/sandboxes/node-runner/Dockerfile .
```

After the API is running with access to the Docker socket, verify the Node sandbox with:

```bash
pnpm --filter @devflow/api smoke:sandbox
```

The Compose API service mounts `/var/run/docker.sock`; set `DOCKER_GID` to the socket's group ID on Linux hosts so the non-root API user can access it. The API process can control the host Docker daemon, so only enable this mount for a trusted deployment.

### Step 5: Start All Microservices in Development Mode

Open separate terminals or run via root orchestration script:

```bash
# Terminal 1: Node.js API Gateway (Port 4000)
pnpm --filter @devflow/api dev

# Terminal 2: Python AI Service (Port 8000)
cd services/ai && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 3: BullMQ Job Processors
pnpm --filter @devflow/job-processor dev

# Terminal 4: Sandbox Execution Worker
pnpm --filter @devflow/execution-engine dev

# Terminal 5: Web UI Application (Port 5173)
pnpm --filter @devflow/web dev
```

Visit `http://localhost:5173` to access the DevFlow AI Dashboard.

---

## Environment Variables Configuration Reference

| Variable Name | Required | Default / Format | Description |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Yes | `development` \| `production` | Node runtime environment. |
| `PORT` | No | `4000` | Port for Express API server. |
| `MONGO_URI` | Yes | `mongodb://localhost:27017/devflow?replicaSet=rs0` | Connection string for MongoDB. |
| `REDIS_URL` | Production | `redis://localhost:6379` | Redis broker connection URI. Required on Vercel unless a remote `REDIS_HOST` is configured; the API and job worker must use the same Redis instance. |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | No | `localhost` / `6379` | Alternative Redis connection settings for container deployments and remote-host configurations. |
| `JWT_ACCESS_SECRET` | Yes | High-entropy string (256-bit) | Secret for short-lived access tokens. |
| `JWT_REFRESH_SECRET` | Yes | High-entropy string (256-bit) | Secret for long-lived refresh tokens. |
| `GITHUB_APP_ID` | Yes | String (e.g. `123456`) | GitHub App identifier. |
| `GITHUB_CLIENT_ID` | Yes | String | OAuth App Client ID. |
| `GITHUB_CLIENT_SECRET`| Yes | String | OAuth App Client Secret. |
| `GITHUB_PRIVATE_KEY` | Yes | PEM string / base64 | Private key for GitHub App JWT generation. |
| `GITHUB_WEBHOOK_SECRET`| Yes | High-entropy string | HMAC verification secret for webhooks. |
| `AI_SERVICE_URL` | Yes | `http://localhost:8000` | Internal URL to reach Python AI backend. |
| `AI_SERVICE_INTERNAL_KEY`| Yes | High-entropy string | Shared secret for inter-service auth. |
| `OLAMA_API_KEY` | Yes | Ollama Cloud API key | Authenticates requests to the Ollama API. |
| `OLAMA_BASE_URL` | No | `https://ollama.com` | Ollama API base URL. |
| `OLAMA_MODEL` | No | `qwen3-coder:480b-cloud` | Ollama model used for AI code reviews. |
| `DOCKER_HOST` | No | `unix:///var/run/docker.sock` | Docker socket path for sandbox controller. |
| `SANDBOX_MAX_CONCURRENCY`| No | `5` | Maximum parallel execution containers. |
| `SANDBOX_TIMEOUT_MS` | No | `20000` | Hard container execution timeout (20s). |

---

## System Documentation Index

For exhaustive technical blueprints, operational runbooks, and DevSecOps specifications, refer to the dedicated documentation:

1. [Architecture Blueprint (`docs/ARCHITECTURE.md`)](docs/ARCHITECTURE.md) — Comprehensive service topology, data flows, queue designs, and microservice contracts.
2. [Production Deployment Guide (`docs/DEPLOYMENT.md`)](docs/DEPLOYMENT.md) — Multi-container Docker Compose, Nginx reverse proxy, SSL/TLS, and Vercel instructions.
3. [Security Architecture & Threat Model (`docs/SECURITY.md`)](docs/SECURITY.md) — STRIDE threat modeling, gVisor/Docker isolation rules, AST prompt protection, and OAuth security.
4. [REST API Documentation (`docs/API.md`)](docs/API.md) — OpenAPI-compliant route specifications, payloads, responses, and error contracts.
5. [Database Schema (`docs/DATABASE.md`)](docs/DATABASE.md) — Mongoose models, data dictionaries, compound indexes, and relational integrity.
6. [Production Troubleshooting Runbook (`docs/TROUBLESHOOTING.md`)](docs/TROUBLESHOOTING.md) — Diagnostic commands, incident response playbooks, worker recovery, and disaster recovery.
7. [Development Roadmap (`DEVELOPMENT_ROADMAP.md`)](DEVELOPMENT_ROADMAP.md) — Multi-phase milestones, engineering tasks, and production go-live gates.

---

## License

DevFlow AI is released under the **MIT License**. See `LICENSE` for details.
