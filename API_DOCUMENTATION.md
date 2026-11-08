# DevFlow AI — REST API Specification

This document provides the canonical API documentation for the **DevFlow AI Core API** (Node.js/Express) and the internal **Python AI Service**. All endpoints conform to RESTful design patterns, support versioned resource routes (`/api/v1`), and follow the **RFC 7807 Problem Details** standard for error representations.

---

## 1. Global API Standards & Conventions

### 1.1. Base URLs
- **Production API**: `https://api.devflow.ai/api/v1`
- **Internal AI Service (Private Network)**: `http://ai-service.internal:8000/internal/v1`
- **Development API**: `http://localhost:4000/api/v1`

### 1.2. Authentication & Headers
All protected public routes require a cryptographically signed JSON Web Token (JWT) passed in the `Authorization` header:

```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
X-Correlation-ID: c8d040ca-8682-158e-3cb8-943f001
Content-Type: application/json
```

Internal service-to-service communication requires a dedicated mutual HMAC or pre-shared secret:
```http
X-Internal-Service-Key: <HIGH_ENTROPY_INTERNAL_SECRET>
```

### 1.3. Standard Error Contract (RFC 7807)
Failed requests return an HTTP status code accompanied by a standard `application/problem+json` payload:

```json
{
  "type": "https://api.devflow.ai/errors/validation-error",
  "title": "Validation Failed",
  "status": 422,
  "detail": "Request body failed schema validation.",
  "instance": "/api/v1/tests/generate",
  "correlationId": "c8d040ca-8682-158e-3cb8-943f001",
  "invalidParams": [
    {
      "name": "targetFramework",
      "reason": "Invalid enum value. Expected 'jest' | 'vitest' | 'pytest', received 'mocha'"
    }
  ]
}
```

---

## 2. Authentication & Identity Endpoints (`/api/v1/auth`)

### 2.1. Initiate GitHub OAuth Flow
Redirects the developer to GitHub's OAuth authorization gateway.

- **Route**: `GET /api/v1/auth/github`
- **Access**: Public
- **Query Parameters**:
  - `redirectUrl` *(optional)*: Post-login destination URL on frontend.

### 2.2. GitHub OAuth Callback
Receives temporary authorization code from GitHub, exchanges it for user credentials, and issues session tokens.

- **Route**: `GET /api/v1/auth/github/callback`
- **Access**: Public
- **Query Parameters**:
  - `code` *(required)*: GitHub temporary authorization code.
  - `state` *(required)*: Anti-CSRF state token.
- **Success Response (`200 OK`)**:
  - Sets `refreshToken` as `HttpOnly`, `Secure`, `SameSite=Strict` cookie.
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "expiresIn": 900,
    "user": {
      "id": "6639c017d84a329ef3123456",
      "githubId": 1234567,
      "username": "octocat",
      "email": "octocat@github.com",
      "displayName": "The Octocat",
      "avatarUrl": "https://avatars.githubusercontent.com/u/1234567?v=4",
      "role": "USER"
    }
  }
}
```

### 2.3. Refresh Access Token
Issues a new short-lived access token using the rotating refresh token cookie.

- **Route**: `POST /api/v1/auth/refresh`
- **Access**: Public (Cookie-authenticated)
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "expiresIn": 900
  }
}
```

### 2.4. Current User Session
- **Route**: `GET /api/v1/auth/me`
- **Access**: Protected (`Bearer JWT`)
- **Success Response (`200 OK`)**: Returns current user profile with active organization memberships.

---

## 3. Organizations & Workspaces (`/api/v1/organizations`)

### 3.1. List User Organizations
- **Route**: `GET /api/v1/organizations`
- **Access**: Protected (`Bearer JWT`)
- **Success Response (`200 OK`)**: Array of organizations where user is an active member.

### 3.2. Create Organization
- **Route**: `POST /api/v1/organizations`
- **Access**: Protected (`Bearer JWT`)
- **Zod Validation Schema**:
```typescript
export const CreateOrganizationSchema = z.object({
  name: z.string().min(2).max(50),
  slug: z.string().min(2).max(30).regex(/^[a-z0-9-]+$/),
  billingEmail: z.string().email()
});
```
- **Request Body Example**:
```json
{
  "name": "Acme Engineering",
  "slug": "acme-engineering",
  "billingEmail": "billing@acme.com"
}
```
- **Success Response (`201 Created`)**

---

## 4. Repositories Management (`/api/v1/repositories`)

### 4.1. List Active Repositories
- **Route**: `GET /api/v1/repositories`
- **Access**: Protected (`Bearer JWT` + Organization Member)
- **Query Parameters**:
  - `organizationId` *(required)*: Organization ObjectId.
  - `page` *(optional, default: 1)*: Page number.
  - `limit` *(optional, default: 20)*: Items per page.
  - `search` *(optional)*: Search string for repo full name.
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "6639c017d84a329ef3123789",
        "githubRepoId": 58941032,
        "name": "payment-gateway",
        "fullName": "acme/payment-gateway",
        "isPrivate": true,
        "defaultBranch": "main",
        "healthScore": 92,
        "primaryLanguage": "TypeScript",
        "lastScannedAt": "2026-11-06T14:22:10.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 1,
      "totalPages": 1
    }
  }
}
```

### 4.2. Synchronize Repositories from GitHub App
Dispatches a background sync task to fetch accessible repositories under the GitHub App Installation.

- **Route**: `POST /api/v1/repositories/sync`
- **Access**: Protected (Org Admin or Owner)
- **Request Body**:
```json
{
  "organizationId": "6639c017d84a329ef3123456"
}
```
- **Success Response (`202 Accepted`)**:
```json
{
  "success": true,
  "message": "Repository synchronization initiated."
}
```

### 4.3. Update Repository Scan Settings
- **Route**: `PATCH /api/v1/repositories/:id/settings`
- **Access**: Protected (Org Admin or Owner)
- **Zod Schema**:
```typescript
export const UpdateRepoSettingsSchema = z.object({
  autoReviewPullRequests: z.boolean().optional(),
  failCheckOnHighSeverity: z.boolean().optional(),
  generateTestsAutomatically: z.boolean().optional(),
  targetTestFramework: z.enum(['jest', 'vitest', 'pytest']).optional(),
  ignoredPaths: z.array(z.string()).optional()
});
```

---

## 5. Pull Requests & Automated Reviews (`/api/v1/pull-requests`)

### 5.1. List Repository Pull Requests
- **Route**: `GET /api/v1/repositories/:id/pull-requests`
- **Access**: Protected
- **Query Parameters**:
  - `state` *(optional)*: `OPEN` | `CLOSED` | `MERGED`

### 5.2. Trigger Manual AI Review on PR
Forces an immediate re-evaluation of an open pull request.

- **Route**: `POST /api/v1/repositories/:id/pull-requests/:prNumber/review`
- **Access**: Protected (Org Member)
- **Success Response (`202 Accepted`)**:
```json
{
  "success": true,
  "data": {
    "analysisRunId": "6639c017d84a329ef3123999",
    "status": "QUEUED"
  }
}
```

---

## 6. Full Codebase Scans & Analysis Runs (`/api/v1/analyses`)

### 6.1. Trigger Full Repository Scan
- **Route**: `POST /api/v1/repositories/:id/scans`
- **Access**: Protected (Org Member)
- **Request Body**:
```json
{
  "branch": "main"
}
```
- **Success Response (`202 Accepted`)**:
```json
{
  "success": true,
  "data": {
    "analysisRunId": "6639c017d84a329ef3124001",
    "status": "QUEUED",
    "commitSha": "9f8a2b4c1e7d"
  }
}
```

### 6.2. Get Analysis Run Status & Metrics
- **Route**: `GET /api/v1/analyses/:runId`
- **Access**: Protected
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "id": "6639c017d84a329ef3124001",
    "repositoryId": "6639c017d84a329ef3123789",
    "status": "COMPLETED",
    "metrics": {
      "bugsFound": 2,
      "vulnerabilitiesFound": 1,
      "codeSmellsFound": 5,
      "securityCriticalCount": 0,
      "qualityScore": 88,
      "cyclomaticComplexityAvg": 4.2
    },
    "durationMs": 14250,
    "completedAt": "2026-11-07T12:00:15.000Z"
  }
}
```

### 6.3. Real-time Analysis Event Stream (SSE)
Establishes a Server-Sent Events stream for live progress updates during scan execution.

- **Route**: `GET /api/v1/analyses/:runId/stream`
- **Access**: Protected (Query param token: `?token=<JWT>`)
- **Headers**:
  - `Accept: text/event-stream`
- **Event Stream Output**:
```
event: progress
data: {"stage": "AST_PARSING", "percent": 25, "filesProcessed": 12, "totalFiles": 48}

event: issue_discovered
data: {"type": "BUG", "severity": "HIGH", "filePath": "src/auth/jwt.ts", "line": 42}

event: completed
data: {"status": "COMPLETED", "qualityScore": 88}
```

---

## 7. Findings & Vulnerabilities Management (`/api/v1/issues`)

### 7.1. List Repository Issues
- **Route**: `GET /api/v1/repositories/:id/issues`
- **Access**: Protected
- **Query Parameters**:
  - `type`: `SECURITY_VULNERABILITY` | `BUG` | `CODE_SMELL` | `PERFORMANCE_ISSUE`
  - `severity`: `CRITICAL` | `HIGH` | `MEDIUM` | `LOW` | `INFO`
  - `status`: `OPEN` | `RESOLVED` | `FALSE_POSITIVE` | `IGNORED`
  - `page`: `1`
  - `limit`: `25`
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "6639c017d84a329ef3125001",
        "type": "SECURITY_VULNERABILITY",
        "severity": "HIGH",
        "status": "OPEN",
        "title": "Unsanitized User Input in SQL Query",
        "description": "Dynamic SQL query formed using unescaped string concatenation.",
        "cweId": "CWE-89",
        "owaspCategory": "A03:2021-Injection",
        "location": {
          "filePath": "src/controllers/userController.ts",
          "startLine": 45,
          "endLine": 47,
          "snippet": "const query = `SELECT * FROM users WHERE email = '${req.body.email}'`;"
        },
        "suggestedFixDiff": "@@ -45,1 +45,1 @@\n-const query = `SELECT * FROM users WHERE email = '${req.body.email}'`;\n+const query = 'SELECT * FROM users WHERE email = $1'; [req.body.email];"
      }
    ],
    "pagination": { "page": 1, "limit": 25, "totalItems": 1 }
  }
}
```

### 7.2. Update Issue Status (Triage)
- **Route**: `PATCH /api/v1/issues/:issueId/status`
- **Access**: Protected (Org Member)
- **Request Body**:
```json
{
  "status": "FALSE_POSITIVE",
  "reason": "Input is pre-validated by custom upstream proxy."
}
```

---

## 8. Automated Test Generation & Sandbox Execution (`/api/v1/tests`, `/api/v1/executions`)

### 8.1. Request Unit Test Generation
- **Route**: `POST /api/v1/tests/generate`
- **Access**: Protected (Org Member)
- **Zod Validation Schema**:
```typescript
export const GenerateTestRequestSchema = z.object({
  repositoryId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  filePath: z.string().min(1),
  functionName: z.string().min(1),
  targetFramework: z.enum(['jest', 'vitest', 'pytest']),
  mockExternalDependencies: z.boolean().default(true)
});
```
- **Request Body Example**:
```json
{
  "repositoryId": "6639c017d84a329ef3123789",
  "filePath": "src/services/billingService.ts",
  "functionName": "calculateProratedAmount",
  "targetFramework": "vitest",
  "mockExternalDependencies": true
}
```
- **Success Response (`202 Accepted`)**:
```json
{
  "success": true,
  "data": {
    "testCaseId": "6639c017d84a329ef3126001",
    "status": "GENERATED",
    "message": "Test generated. Execution verification queued."
  }
}
```

### 8.2. Trigger Sandbox Execution Run
Dispatches test execution into the isolated Docker sandbox environment.

- **Route**: `POST /api/v1/executions/run`
- **Access**: Protected
- **Request Body**:
```json
{
  "testCaseId": "6639c017d84a329ef3126001"
}
```
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "executionId": "6639c017d84a329ef3127001",
    "exitCode": 0,
    "stdout": "✓ calculateProratedAmount > correctly prorates mid-cycle cancellation (12ms)\n\nTest Files  1 passed (1)\nTests  1 passed (1)",
    "stderr": "",
    "executionTimeMs": 1420,
    "memoryPeakMb": 84,
    "passed": true
  }
}
```

---

## 9. GitHub Webhook Ingress (`/api/v1/webhooks/github`)

Ingests asynchronous events from GitHub.

- **Route**: `POST /api/v1/webhooks/github`
- **Access**: Public (Cryptographically verified via HMAC)
- **Required Headers**:
  - `X-GitHub-Event`: e.g. `pull_request`, `push`, `installation`
  - `X-GitHub-Delivery`: Unique UUIDv4 delivery identifier
  - `X-Hub-Signature-256`: `sha256=<HMAC_SHA256_HEX_DIGEST>`
- **Behavior**:
  1. Computes `crypto.createHmac('sha256', secret).update(rawPayload).digest('hex')`.
  2. Compares with `X-Hub-Signature-256` via `crypto.timingSafeEqual` (mitigating timing attacks).
  3. Checks Redis for `deliveryId`. Discards duplicates immediately with `200 OK`.
  4. Pushes job to BullMQ `webhook-ingestion-queue`.
- **Success Response (`202 Accepted`)**:
```json
{
  "status": "accepted",
  "deliveryId": "68b44a2c-9a4f-11ee-8c90-0242ac120002"
}
```

---

## 10. Internal Service Communication (API <-> Python AI Service)

These endpoints are strictly internal to the private network cluster and protected via mutual service tokens (`X-Internal-Service-Key`).

### 10.1. Parse AST & Build Dependency Graph
- **Route**: `POST /internal/v1/ai/parse-ast`
- **Request Payload**:
```json
{
  "files": [
    {
      "filePath": "src/auth/jwt.ts",
      "content": "export function signToken(payload: object): string { ... }"
    }
  ]
}
```
- **Response Payload**: Extracted AST symbols, exported functions, imported modules, and cyclomatic complexity indices per function.

### 10.2. Review PR Git Diff
- **Route**: `POST /internal/v1/ai/review-diff`
- **Request Payload**:
```json
{
  "repoFullName": "acme/payment-gateway",
  "baseBranch": "main",
  "headBranch": "feature/stripe-v3",
  "modifiedFiles": [
    {
      "filePath": "src/payments/stripe.ts",
      "patch": "@@ -12,4 +12,6 @@ ...",
      "fullContent": "..."
    }
  ],
  "contextDependencies": {}
}
```
- **Response Payload** (Validated via Pydantic):
```json
{
  "qualityScore": 85,
  "summary": "Pull request introduces updated Stripe SDK handling with potential unhandled promise rejections in webhook dispatcher.",
  "findings": [
    {
      "type": "BUG",
      "severity": "HIGH",
      "filePath": "src/payments/stripe.ts",
      "startLine": 34,
      "endLine": 36,
      "title": "Unhandled Stripe Signature Verification Exception",
      "description": "Constructing event without wrapping stripe.webhooks.constructEvent in try/catch will crash the Express handler on bad signature.",
      "suggestedFixDiff": "@@ -34,3 +34,7 @@\n-const event = stripe.webhooks.constructEvent(buf, sig, secret);\n+try {\n+  const event = stripe.webhooks.constructEvent(buf, sig, secret);\n+} catch (err) {\n+  return res.status(400).send(`Webhook Error: ${err.message}`);\n+}"
    }
  ]
}
```

### 10.3. Generate Unit Test Suite
- **Route**: `POST /internal/v1/ai/generate-tests`
- **Request Payload**: Target source code, related imported interfaces, and requested framework (`pytest`, `jest`, `vitest`).
- **Response Payload**: Generated test case definitions, test file code string, required mock configurations, and expected dependencies.
