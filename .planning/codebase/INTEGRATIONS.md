# External Integrations & Service Architecture

## Overview
**Entangled Echo** integrates external social APIs, AI foundation model APIs, email delivery providers, and cloud backend services through strict interface abstractions. Every integration implements a `mock` or `seed` mode, ensuring full offline functionality and deterministic testing without external dependencies.

---

## 1. Meta / Graph API (Instagram & Facebook)

### Architecture: `SocialProvider` Interface
Located in `apps/web/src/lib/providers/social.ts`.

All social interactions go through a unified contract:
- `getAuthUrl(state: string, redirectUri: string): Promise<string>`
- `exchangeCode(code: string, redirectUri: string): Promise<TokenPayload>`
- `refreshToken(token: string): Promise<TokenPayload>`
- `fetchPosts(token: string, accountId: string, limit?: number): Promise<SocialPost[]>`
- `fetchPostInsights(token: string, postId: string): Promise<PostMetrics>`
- `fetchAudience(token: string, accountId: string): Promise<AudienceSnapshot>`
- `publish(token: string, accountId: string, post: ScheduledPost): Promise<PublishResult>`
- `businessDiscovery(token: string, competitorHandle: string): Promise<CompetitorPublicMetrics>`

### Implementations
1. **Live Instagram & Facebook Provider** (`LiveInstagramProvider`, `LiveFacebookProvider`):
   - Uses Meta Graph API (`v21.0+`, configured via `META_GRAPH_VERSION`).
   - Token exchange requests long-lived access tokens (60-day expiry).
   - Insights ingest: likes, comments, shares, saves, reach, views/impressions.
   - Instagram publishing follows Meta's two-step protocol: container creation (`POST /{ig-user-id}/media`) followed by container publication (`POST /{ig-user-id}/media_publish`).
   - Competitor analysis uses Meta Business Discovery API (public fields only: follower count, media count, public engagement).
2. **Seed Provider** (`SeedProvider`):
   - Generates realistic historical distributions grounded in a synthetic ground-truth multiplier matrix (`scripts/seed/truth.json`).
   - Normalizes data through identical production pipelines.
3. **Mock Provider** (`MockProvider`):
   - Returns deterministic in-memory fixtures for unit tests and local UI development.

### Token Security & Encryption
- Tokens are encrypted server-side using **AES-256-GCM** via Node.js `crypto` with a 32-byte secret (`TOKEN_ENC_KEY`).
- Tokens are persisted to `social_accounts.access_token_enc` with IV and authentication tag (`${ivHex}:${tagHex}:${cipherHex}`).
- Tokens never reach the client; client queries query the security-definer view `social_accounts_public`.

---

## 2. Supabase Cloud Infrastructure (BaaS)

### Services Used
- **Supabase Auth (`@supabase/ssr`)**:
  - Cookie-based authentication across Next.js Server Components, Server Actions, and Middleware.
  - Email/password signup with verification requirement, password reset flow, and Google OAuth.
  - Auto-provisions user profiles in `public.profiles` via Postgres trigger `on_auth_user_created`.
- **PostgreSQL Database**:
  - Relational storage for 14 domain tables.
  - Enforces multi-tenant isolation via PostgreSQL Row-Level Security (RLS) on all user tables.
  - Security-definer functions (`is_admin()`, `claim_due_scheduled_posts()`).
- **Supabase Storage**:
  - Object storage bucket for user media uploads (post images/videos).
  - Validated via file size limits and magic-byte checks before upload.
- **Supabase Realtime**:
  - PostgreSQL CDC (Change Data Capture) subscription in `RealtimeListener.tsx`.
  - Pushes live updates for `optimization_jobs`, `notifications`, and `scheduled_posts` to avoid manual page refreshes.

---

## 3. Large Language Model (LLM) Providers

### Architecture: `LLMProvider` Abstraction
Located in `services/ai/app/llm/provider.py`.

Configured via `LLM_PROVIDER=anthropic|gemini|mock` and `LLM_API_KEY`:

1. **Google Gemini (`GeminiProvider`)**:
   - Uses `gemini-1.5-flash` or `gemini-1.5-pro` via asynchronous HTTPX REST API calls.
   - Generates structured JSON responses conforming to Pydantic schemas.
2. **Anthropic Claude (`AnthropicProvider`)**:
   - Uses `claude-3-5-sonnet` with JSON system constraints.
3. **Mock LLM (`MockLLMProvider`)**:
   - Deterministic template-based caption and task generation for offline execution and CI pipelines.

### Guardrails & Safety
- **Pydantic Validation**: All LLM outputs must validate against strict Pydantic models. On parse failure, the provider retries once; if it fails again, it falls back to a deterministic template labeled `"Fallback template"`.
- **Unseen Numbers Validator** (`services/ai/app/llm/validator.py`):
  - When explaining schedules or content-type recommendations, prevents hallucinations by verifying that any number mentioned in the generated text was present in the ground-truth input payload.
- **Token Logging & Rate Limiting**:
  - Per-user token consumption is audited in `llm_token_logs(user_id, endpoint, tokens, created_at)`.

---

## 4. Email Notification Service

### Architecture: `EmailProvider` Interface
Located in `apps/web/src/lib/providers/email.ts`.

- **Providers**: `ResendEmailProvider`, `SmtpEmailProvider`, and `MockEmailProvider`.
- **Use Cases**:
  - 30-minute advance publishing reminders for scheduled posts.
  - Publishing success/failure notifications with error diagnostics.
  - Weekly Social Intelligence Digest (Monday 8:00 AM user timezone).
- **Preference Enforcement**: Always verifies user opt-outs against `notification_preferences` before dispatch.

---

## 5. Inter-Service Communication (BFF <-> AI Service)

```
┌─────────────────────────────────┐                 ┌─────────────────────────────────┐
│     Next.js 16 (BFF / Web)      │                 │      FastAPI (AI Service)       │
│           (Port 3000)           │                 │           (Port 8000)           │
├─────────────────────────────────┤                 ├─────────────────────────────────┤
│ Server Actions & API Routes:    │  HTTP POST      │ Endpoints:                      │
│ - runQuboOptimizerAction        ├────────────────►│ - /api/v1/optimize (QUBO Anneal)│
│ - generateCaptionsAction        ├────────────────►│ - /api/v1/recommend (Rec Engine)│
│ - decomposeGoalAction           ├────────────────►│ - /api/v1/decompose (Planner)   │
│ - analyzeAccountAction          ├────────────────►│ - /api/v1/analyze (Topics/Sent) │
│ - AssistantModal (Client/Route) ├────────────────►│ - /api/v1/assistant/chat        │
│ - ImageGeneratorModal           ├────────────────►│ - /api/v1/image/generate        │
│                                 │                 │                                 │
│ Auth Header:                    │                 │ Security:                       │
│ Bearer <AI_SERVICE_SECRET>      │                 │ Depends(verify_service_secret)  │
└─────────────────────────────────┘                 └─────────────────────────────────┘
```

- **Authentication**: All BFF-to-FastAPI requests include `Authorization: Bearer <AI_SERVICE_SECRET>`.
- **Timeout & Retries**: Asynchronous HTTPX client with configurable timeouts (default 10s for recs, 30s for QUBO solver).
- **Healthcheck**: `GET /health` monitored by Docker container healthcheck and deployment runners.
