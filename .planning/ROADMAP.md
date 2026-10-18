# Project Roadmap & Milestone Tracker

---

## Completed Phases (Milestone 1.0 — Core Platform)

- [x] **Phase 1: Scaffold & Monorepo Configuration**
  - Next.js 16 App Router (`apps/web`) + Python 3.12 FastAPI (`services/ai`).
  - ESLint, Prettier, TypeScript strict mode, Ruff, Pytest.
  - Zero hardcoded secrets with `.env.example` reference.

- [x] **Phase 2: Database Schema & Row-Level Security**
  - 14 relational tables in Supabase PostgreSQL (`supabase/migrations`).
  - Row-Level Security (RLS) policies on all tenant tables with `is_admin()` helper.
  - Automated `profiles` creation trigger on auth signup.

- [x] **Phase 3: Auth, Profiles & Admin (FR-01..06, UC01, UC10)**
  - Supabase Auth (`@supabase/ssr`) with email verification and Google OAuth.
  - IP brute force rate limiting backed by `auth_attempts` (blocks after 10 failures in 15 min).
  - Admin portal (`/admin`) enforcing server-side role check and user suspension.

- [x] **Phase 4: Social Account Connection (FR-07, FR-08, UC02)**
  - `SocialProvider` interface supporting Instagram and Facebook.
  - AES-256-GCM authenticated encryption for OAuth access tokens.
  - Mock and live OAuth connection workflows.

- [x] **Phase 5: Data Ingestion & Normalization (FR-09..12)**
  - Unified post normalization schema with idempotent upserts on `(account_id, external_id)`.
  - 48-hour maturity filter on metrics to exclude premature volatility.
  - Synthetic data generator (`scripts/seed`) matching production ingestion pipelines.

- [x] **Phase 6: Content Analysis Microservice (FR-13..16, UC03)**
  - TF-IDF topic keyword extraction and VADER sentiment analysis.
  - Multi-factor percentile-normalized performance scoring.
  - Raw insights endpoint (`/api/v1/analyze`).

- [x] **Phase 7: Quantum-Inspired QUBO Optimizer (FR-17..20, UC06)**
  - 168-variable Binary Quadratic Model solved via `dwave-samplers` `SimulatedAnnealingSampler`.
  - Hard constraint penalties (minimum gap hours, target posts/week, blackout exclusions).
  - Primary schedule + 3 distinct alternatives with bootstrap stability confidence (30 resamples).

- [x] **Phase 8: Recommendations & Goal Decomposition (FR-21..24, UC04, UC07)**
  - Algorithm 2 caption drafting and hashtag clustering based on top performers.
  - Campaign goal decomposition into prioritized tasks (`content_strategies`, `tasks`).
  - User feedback loop (`recommendations.feedback`) adapting preference weights.

- [x] **Phase 9: Content Calendar & Auto-Publishing (FR-25..28, UC05)**
  - Visual weekly drag-and-drop calendar with status lifecycle enforcement.
  - Worker `/api/internal/tick` claiming due posts with `FOR UPDATE SKIP LOCKED`.
  - 3 retries with exponential backoff (2, 4, 8 min) and punctuality < 60 seconds.

- [x] **Phase 10: Analytics & Reporting (FR-29..32, UC03, UC09)**
  - 7×24 weekly engagement timing heatmap matrix.
  - Content-type comparative performance breakdowns.
  - Competitor tracking via Meta Business Discovery API (public metrics).
  - RFC 4180 compliant CSV export streaming.

- [x] **Phase 11: Notifications & Email Digest (FR-33..35, UC08)**
  - In-app notification center with batch mark-as-read.
  - 30-minute advance publishing reminders.
  - Rich HTML weekly email digest delivered Monday 8:00 AM user timezone.

- [x] **Phase 12: Hardening, NFRs & Accessibility**
  - WCAG 2.1 AA accessibility audit passed with 0 violations (`axe-core`).
  - Strict security headers (`HSTS`, `X-Content-Type-Options`, `X-Frame-Options: SAMEORIGIN`).
  - 40 web tests + 20 AI microservice tests passing with 0 failures.

---

## Completed Post-12 Enhancements

- [x] **Phase 13: Navigation Performance & Latency Optimization**
  - React `cache()` request deduplication (`getCachedAuthUser`, `getCachedProfile`).
  - Parallelized server component queries via `Promise.all()`.
  - Instant loading skeletons (`loading.tsx`) and React Suspense boundaries.
  - Next.js 16 link prefetching with `staleTimes: { dynamic: 30, static: 180 }`.
  - Fast-path middleware session validation (`ee_session_check` cookie).

- [x] **Phase 14: Real AI Grounding & Anti-Hallucination Guardrails**
  - Wired real LLM providers (Gemini, Claude, Mock) with Pydantic validation and deterministic fallbacks.
  - Built `UnseenNumbersValidator` preventing hallucinated numbers in recommendation rationales.
  - Token consumption auditing via `llm_token_logs`.
  - Trained domain sentiment classifier on Sanders corpus ($N=3,424$) achieving 74.31% accuracy.

---

## Active & Upcoming Roadmap (Milestone 2.0)

- [ ] **Phase 15: Production Cloud Deployment & Region Colocation**
  - Deploy Next.js to Vercel and FastAPI container to Render / Fly.io.
  - Colocate instances in the same AWS region as Supabase to eliminate cross-region roundtrips.
  - Set up external cron pinger for `/api/internal/tick`.

- [ ] **Phase 16: Next.js 16 Proxy Migration**
  - Migrate from deprecated `middleware.ts` to Next.js canary `proxy` architecture via `@next/codemod`.

- [ ] **Phase 17: Multi-Account Cross-Posting Coordination**
  - Add cross-platform collision avoidance to the QUBO solver when an agency manages linked Instagram and Facebook accounts simultaneously.
