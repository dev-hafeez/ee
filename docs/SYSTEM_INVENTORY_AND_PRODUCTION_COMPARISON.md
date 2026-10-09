# Entangled Echo — System Inventory, Commercial Gap Analysis, & Future Roadmap

**Document Reference**: FYP Architectural Assessment & Product Evolution  
**Generated Date**: October 2026  
**Related Documents**: [ENTANGLED_ECHO_BUILD_PLAN.md](file:///home/hafeez/Desktop/Projects/EntangledEcho/ENTANGLED_ECHO_BUILD_PLAN.md), [docs/TRACEABILITY.md](file:///home/hafeez/Desktop/Projects/EntangledEcho/docs/TRACEABILITY.md), [docs/EVALUATION.md](file:///home/hafeez/Desktop/Projects/EntangledEcho/docs/EVALUATION.md), [docs/DEVIATIONS.md](file:///home/hafeez/Desktop/Projects/EntangledEcho/docs/DEVIATIONS.md)

---

## Executive Summary

Entangled Echo is currently a **fully functional, verified engineering prototype** built according to the Software Requirements & Design Specification (`srdsfyp.pdf`) and the agent build plan. It features a Next.js 16 frontend, a Python FastAPI microservice with a QUBO quantum-inspired scheduler, Supabase PostgreSQL schema with Row-Level Security, automated publishing dispatchers, and offline `seed`/`mock` data modes.

This document provides:

1. **A complete, comprehensive inventory** of everything built across the system.
2. **A critical comparison against customer-grade commercial applications** (such as Buffer, Hootsuite, Later, and Sprout Social).
3. **An actionable future roadmap** outlining what remains to be built to transition from an FYP/academic prototype to a production-grade commercial SaaS product.

---

## Part 1: Everything That Has Been Made (System Inventory)

### 1. Web Application Architecture ([apps/web](file:///home/hafeez/Desktop/Projects/EntangledEcho/apps/web))

Built using **Next.js 16 (App Router)**, **TypeScript (Strict Mode)**, **Tailwind CSS**, and **Turbopack**.

| Surface / Page              | Route                                  | Description & Features Built                                                                                                                                                     | Key Source Files                                                                                                                                                                                                                                                                                                                                                                        |
| :-------------------------- | :------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dashboard Overview**      | `/dashboard`                           | Dynamic creator dashboard displaying Total Reach, Average Performance Score, Queued Scheduled Posts, Recent Activity Feed, and dynamic Demo Data badge. Zero hardcoded literals. | [page.tsx](<file:///home/hafeez/Desktop/Projects/EntangledEcho/apps/web/src/app/(dashboard)/dashboard/page.tsx>)                                                                                                                                                                                                                                                                        |
| **Interactive Onboarding**  | `/onboarding`                          | 5-step guided onboarding walkthrough explaining account linking, 48h data hygiene, QUBO scheduling, AI drafts, and auto-publishing.                                              | [page.tsx](<file:///home/hafeez/Desktop/Projects/EntangledEcho/apps/web/src/app/(dashboard)/onboarding/page.tsx>), [OnboardingClient.tsx](<file:///home/hafeez/Desktop/Projects/EntangledEcho/apps/web/src/app/(dashboard)/onboarding/OnboardingClient.tsx>)                                                                                                                            |
| **Analytics & Reporting**   | `/analytics`                           | KPI summary cards, interactive 7x24 Day $\times$ Hour engagement heatmap, public competitor benchmarking (Business Discovery D7), and streaming CSV export.                      | [page.tsx](<file:///home/hafeez/Desktop/Projects/EntangledEcho/apps/web/src/app/(dashboard)/analytics/page.tsx>), [AnalyticsClient.tsx](<file:///home/hafeez/Desktop/Projects/EntangledEcho/apps/web/src/app/(dashboard)/analytics/AnalyticsClient.tsx>)                                                                                                                                |
| **Content Recommendations** | `/recommendations`                     | Triggers QUBO optimization, displays 3 AI caption drafts with hashtag clusters, format breakdown recommendations, and campaign goal task decomposition.                          | [page.tsx](<file:///home/hafeez/Desktop/Projects/EntangledEcho/apps/web/src/app/(dashboard)/recommendations/page.tsx>), [RecommendationsClient.tsx](<file:///home/hafeez/Desktop/Projects/EntangledEcho/apps/web/src/app/(dashboard)/recommendations/RecommendationsClient.tsx>)                                                                                                        |
| **Content Calendar**        | `/calendar`                            | Weekly visual schedule with drag-and-drop post cards, confidence-coded recommended slots, and status badges (`DRAFT`, `SCHEDULED`, `PUBLISHED`).                                 | [page.tsx](<file:///home/hafeez/Desktop/Projects/EntangledEcho/apps/web/src/app/(dashboard)/calendar/page.tsx>), [CalendarClient.tsx](<file:///home/hafeez/Desktop/Projects/EntangledEcho/apps/web/src/app/(dashboard)/calendar/CalendarClient.tsx>)                                                                                                                                    |
| **Notifications Hub**       | `/notifications`                       | In-app alerts, bell badge counter, batch mark-as-read updates, and toggleable notification preferences (digests, milestones, reminders).                                         | [page.tsx](<file:///home/hafeez/Desktop/Projects/EntangledEcho/apps/web/src/app/(dashboard)/notifications/page.tsx>), [NotificationsClient.tsx](<file:///home/hafeez/Desktop/Projects/EntangledEcho/apps/web/src/app/(dashboard)/notifications/NotificationsClient.tsx>)                                                                                                                |
| **Settings & Channels**     | `/settings`                            | Profile metadata editing (display name, bio, timezone), Instagram Professional & Facebook Page OAuth connection cards with AES-256-GCM encryption badges.                        | [page.tsx](<file:///home/hafeez/Desktop/Projects/EntangledEcho/apps/web/src/app/(dashboard)/settings/page.tsx>), [profile-actions.ts](<file:///home/hafeez/Desktop/Projects/EntangledEcho/apps/web/src/app/(dashboard)/settings/profile-actions.ts>), [social-actions.ts](<file:///home/hafeez/Desktop/Projects/EntangledEcho/apps/web/src/app/(dashboard)/settings/social-actions.ts>) |
| **Admin Portal**            | `/admin`                               | Administrator dashboard for user management, account suspension toggles, and user deletion guarded by mandatory password re-authentication (SRDS 4.2.8).                         | [page.tsx](file:///home/hafeez/Desktop/Projects/EntangledEcho/apps/web/src/app/admin/page.tsx), [AdminClient.tsx](file:///home/hafeez/Desktop/Projects/EntangledEcho/apps/web/src/app/admin/AdminClient.tsx), [actions.ts](file:///home/hafeez/Desktop/Projects/EntangledEcho/apps/web/src/app/admin/actions.ts)                                                                        |
| **Auth Pages**              | `/login`, `/signup`, `/reset-password` | Supabase Auth integration, session management, email verification triggers, and password reset workflows.                                                                        | [login/page.tsx](<file:///home/hafeez/Desktop/Projects/EntangledEcho/apps/web/src/app/(auth)/login/page.tsx>), [signup/page.tsx](<file:///home/hafeez/Desktop/Projects/EntangledEcho/apps/web/src/app/(auth)/signup/page.tsx>), [reset-password/page.tsx](<file:///home/hafeez/Desktop/Projects/EntangledEcho/apps/web/src/app/(auth)/reset-password/page.tsx>)                         |

---

### 2. AI & Mathematical Optimization Service ([services/ai](file:///home/hafeez/Desktop/Projects/EntangledEcho/services/ai))

Built using **Python 3.12**, **FastAPI**, **dimod**, **dwave-samplers**, **scikit-learn**, **NLTK (VADER)**, and **Pydantic v2**.

1. **QUBO-Based Posting Schedule Optimizer ([qubo_solver.py](file:///home/hafeez/Desktop/Projects/EntangledEcho/services/ai/app/optimizer/qubo_solver.py))**:
   - Formulates the 168-hour weekly grid as a Quadratic Unconstrained Binary Optimization (QUBO) model:
     $$\min_x E(x) = -\sum_s v_s x_s + A\left(\sum_s x_s - K\right)^2 + B\sum_{(i,j) \in \text{conflict}} x_i x_j$$
   - Computes expected slot values $v_s$ using empirical shrinkage combining day marginals and hour marginals:
     $$v_s = \frac{n_s \cdot \bar{y}_s + k \cdot \text{prior}_s}{n_s + k}$$
   - Solves via Simulated Annealing (`dwave-samplers` `SimulatedAnnealingSampler`).
   - Returns top-4 distinct low-energy feasible solutions (1 primary schedule + 3 distinct alternatives per Decision D4 / FR-19).
   - Evaluates recommendation confidence via 30-iteration bootstrap resampling.
   - Fallback protection for cold starts ($< 20$ posts) with explicit `low_data` badging.

2. **Content Intelligence & Scoring Engine ([analyzer.py](file:///home/hafeez/Desktop/Projects/EntangledEcho/services/ai/app/analysis/analyzer.py))**:
   - Calculates engagement scores with configurable weights:
     $$\text{engagement} = 1 \cdot \text{likes} + 3 \cdot \text{comments} + 5 \cdot \text{shares} + 4 \cdot \text{saves}$$
   - Calculates reach-normalized performance scores:
     $$\text{perf\_score\_raw} = \frac{\text{engagement}}{\max(\text{reach}, 1)}$$
   - Computes percentile-normalized scores across individual creator histories.
   - Extracts top semantic topics per post and per account using scikit-learn TF-IDF.
   - Evaluates caption sentiment using NLTK VADER compound polarity scoring.
   - Groups top co-occurring hashtag clusters.

3. **Generative Recommendation Engine ([generator.py](file:///home/hafeez/Desktop/Projects/EntangledEcho/services/ai/app/recommender/generator.py))**:
   - Implements Algorithm 2: generates 3 tailored caption drafts + hashtag sets based on the account's top historical performers.
   - Provider-abstracted LLM layer ([provider.py](file:///home/hafeez/Desktop/Projects/EntangledEcho/services/ai/app/llm/provider.py)) supporting Anthropic, Gemini, and Mock modes.
   - Validates JSON outputs with Pydantic schemas.
   - Evaluates format performance rankings (Reels vs. Carousel vs. Image) with sample size context.

4. **Campaign Goal Task Decomposer ([task_decomposer.py](file:///home/hafeez/Desktop/Projects/EntangledEcho/services/ai/app/decomposer/task_decomposer.py))**:
   - Decomposes high-level marketing campaigns into prioritized, date-stamped posting tasks.

---

### 3. Backend, Security, & Ingestion Pipeline

1. **Database Schema & Migrations ([supabase/migrations](file:///home/hafeez/Desktop/Projects/EntangledEcho/supabase/migrations))**:
   - 12 PostgreSQL tables: `profiles`, `social_accounts`, `posts`, `engagement_metrics`, `audience_snapshots`, `competitors`, `scheduled_posts`, `optimization_jobs`, `recommendations`, `content_strategies`, `tasks`, `notifications`, `notification_preferences`, and `auth_attempts`.
   - Complete Row-Level Security (RLS) policies enforcing tenant boundary isolation.
   - Security-definer `is_admin()` function.
   - RPC function `claim_due_posts` with `FOR UPDATE SKIP LOCKED` for atomic, concurrency-safe dispatching.

2. **AES-256-GCM Encryption ([encryption.ts](file:///home/hafeez/Desktop/Projects/EntangledEcho/apps/web/src/lib/crypto/encryption.ts))**:
   - Encrypts Meta OAuth access tokens at rest with unique 12-byte IVs and 16-byte authentication tags. Tokens are never exposed to client-side bundles.

3. **Data Ingestion & Hygiene ([sync-account.ts](file:///home/hafeez/Desktop/Projects/EntangledEcho/apps/web/src/lib/sync/sync-account.ts))**:
   - Normalizes external provider payloads into the unified `posts` and `engagement_metrics` tables.
   - Guarantees idempotent upserts on `(account_id, external_id)`.
   - Filters engagement snapshots through a **48-hour maturity window** to prevent early volatility from skewing historical scores.

4. **Automated Publishing Dispatcher ([/internal/tick](file:///home/hafeez/Desktop/Projects/EntangledEcho/apps/web/src/app/api/internal/tick/route.ts))**:
   - Runs every 60 seconds to claim due posts.
   - Enforces the post lifecycle state machine:
     $$\text{DRAFT} \longrightarrow \text{SCHEDULED} \longrightarrow \text{PUBLISHING} \longrightarrow \text{PUBLISHED} \mid \text{FAILED} \mid \text{CANCELLED}$$
   - Executes exponential backoff retries (2, 4, 8 minutes) up to 3 attempts.
   - Dispatches 30-minute advance publishing reminders.

5. **Decision D9 Media Upload Validation ([status-machine.ts](file:///home/hafeez/Desktop/Projects/EntangledEcho/apps/web/src/lib/publishing/status-machine.ts))**:
   - Inspects file magic bytes (JPEG: `FF D8 FF`, PNG: `89 50 4E 47`, MP4: `ftyp`, WebP: `RIFF...WEBP`) to prevent malicious executable spoofing. Enforces 8MB image and 50MB video limits.

6. **Email & Digest Engine ([email/index.ts](file:///home/hafeez/Desktop/Projects/EntangledEcho/apps/web/src/lib/providers/email/index.ts))**:
   - Provider-abstracted email delivery (`ResendEmailProvider`, `MockEmailProvider`).
   - Renders weekly HTML email digests summarizing top posts, reach, and upcoming schedules.

7. **Synthetic Data Generator ([generate.py](file:///home/hafeez/Desktop/Projects/EntangledEcho/scripts/seed/generate.py))**:
   - Generates realistic 12-month synthetic post engagement datasets with planted peak multiplier windows in [truth.json](file:///home/hafeez/Desktop/Projects/EntangledEcho/scripts/seed/truth.json) for evaluation without live Meta API access.

---

## Part 2: Comparison Against Customer-Grade Commercial SaaS

The following matrix compares Entangled Echo against commercial social media management platforms such as **Buffer**, **Hootsuite**, **Later**, and **Sprout Social**.

> **Note on Comparison Sources**: *All competitor capabilities listed below are unverified hypotheses based on publicly available product marketing documentation and general industry knowledge. They have not been independently audited or tested by API benchmarking. Features, tier limits, and architecture details may vary by customer plan.*

| Dimension                        | Entangled Echo (Current Implementation)                                                                                                 | Commercial Customer-Grade Product (Buffer / Hootsuite)                                                                                                 | Gap Analysis / Commercial Impact                                                                                                  |
| :------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------- |
| **Social Platforms**             | **Instagram & Facebook only** (strictly scoped to Meta Graph API v22.0).                                                                | **Broad Multi-Platform**: Commercial tools frequently support numerous additional networks.                                                            | Commercial users sometimes expect to publish across numerous social networks simultaneously.                                       |
| **Meta API Review Status**       | **Development Mode**: Works for admin, developer, and tester accounts; fully offline via `DATA_MODE=seed`.                              | **Verified Tech Provider**: Production App Review approved for `instagram_content_publish`, `pages_manage_posts`, etc.                                 | Any end-user can authenticate in commercial products; Entangled Echo requires pre-registering test users or running in seed mode. |
| **Media Creative Studio**        | **Raw Upload & Magic-Byte Validation**: Accepts valid JPEG, PNG, MP4, WebP up to limits.                                                | **In-App Media Suite**: Built-in Canva integration, crop presets (1:1, 4:5, 9:16), video trimming, thumbnail selector, automated caption subtitles.    | Creators currently have to format and crop their images externally before uploading to Entangled Echo.                            |
| **Multi-Media Formats**          | **Single Media Post Support**: Direct image or video file path per scheduled post.                                                      | **Complex Formats**: Multi-slide carousels (up to 10 images/videos), Instagram Stories with link stickers, Instagram Collabs, Tagging people/products. | High-engagement Instagram carousels with individual slide reordering are standard in commercial tools.                            |
| **Community Management (Inbox)** | **Out of Scope (SRDS 2.2)**: No comment or message management.                                                                          | **Unified Social Inbox**: View, filter, and reply to comments, mentions, and DMs from a single dashboard.                                              | Enterprise tools (Hootsuite/Sprout) differentiate heavily on customer support / community engagement.                             |
| **Team Workspaces & Roles**      | **Single-User Creator Model** + Platform Super-Admin (`profiles.role in ('user', 'admin')`).                                            | **Multi-Tenant Agency Workspaces**: Client organizations, role permissions (Creator, Editor, Approver, Admin), draft approval workflows.               | Agencies managing multiple client brands require isolated client spaces and internal post approval chains.                        |
| **Monetization & Billing**       | **No Paywall**: Free internal access.                                                                                                   | **Stripe / Billing Integration**: Tiered plans (Free, Essentials, Team, Enterprise) with post limits, seat licenses, and usage metering.               | Necessary for SaaS monetization and self-serve signup.                                                                            |
| **Scheduling Algorithm**         | **QUBO + Simulated Annealing (D-Wave)**: Mathematical formulation solving discrete slots with shrinkage priors and bootstrap stability. | **Heuristic Follower Activity**: Plots when followers were active in the last 7 days; chooses times based on follower online density.                  | Entangled Echo uses a combinatorial optimization model over historical performance; commercial tools rely directly on live follower activity graphs.   |
| **Quantum Hardware**             | **Classical Simulation**: Runs D-Wave's classical simulated annealing sampler on CPU.                                                   | **N/A**: Commercial tools do not use quantum formulations.                                                                                             | To make true "quantum" claims, Entangled Echo would need D-Wave Leap Cloud API QPU hardware execution.                            |
| **Worker Queue Architecture**    | **Database-Driven Cron**: `pg_cron` / internal tick dispatcher polling every 60s with `SKIP LOCKED`.                                    | **Distributed Message Queues**: Redis + BullMQ / Celery, event-driven webhooks, horizontal worker autoscaling.                                         | Polling works well for $< 50,000$ posts/day; enterprise scale requires dedicated streaming worker clusters.                       |
| **Production Telemetry**         | **Console / HTTP Health Check**: `/health` endpoint and local log captures.                                                             | **Observability Stack**: Sentry error tracking, OpenTelemetry distributed tracing, Datadog/NewRelic APM, PagerDuty alerts.                             | Essential for 99.9% uptime SLA monitoring in commercial production.                                                               |

---

## Part 3: What is Missing & Remaining to be Made Later

To evolve Entangled Echo into a market-ready commercial product, future engineering should proceed across four milestones:

### Milestone A: Commercial Platform & Workspace Foundation

1. **Multi-Tenant Organization Architecture**:
   - Add `organizations` and `organization_members` tables to support teams and agencies.
   - Implement role-based permissions: _Viewer_, _Content Creator_ (can draft), _Reviewer_ (can approve), and _Owner_.
   - Post draft approval workflow: creators submit drafts for client or manager sign-off before status advances to `SCHEDULED`.
2. **Stripe Subscription Billing**:
   - Integrate Stripe Checkout and Customer Portal for self-serve subscriptions.
   - Enforce tier limits:
     - _Free_: 1 social account, 10 scheduled posts/month, basic analytics.
     - _Pro_: 5 social accounts, unlimited posts, QUBO optimization, AI caption generation.
     - _Agency_: Unlimited accounts, team collaboration, CSV exports, competitor discovery.
3. **Enterprise Authentication**:
   - Add MFA / TOTP enforcement for admin and agency accounts.
   - Google / GitHub OAuth buttons enabled via Supabase dashboard.

---

### Milestone B: Meta App Review & Official Production Verification

1. **Meta Business Verification & App Review Submission**:
   - Complete Meta Business Manager verification.
   - Submit screencasts and privacy documentation for official Graph API permissions:
     - `instagram_business_basic`
     - `instagram_business_manage_insights`
     - `instagram_business_content_publish`
     - `pages_read_engagement`
     - `pages_manage_posts`

---

### Milestone C: Advanced Creative & Media Studio

1. **Multi-Slide Carousel Builder**:
   - UI component allowing creators to upload up to 10 images/videos, drag to reorder slides, and preview the carousel swipe experience.
2. **In-Browser Image Crop & Edit**:
   - Integrate an open-source image editor (e.g., `cropperjs` or `react-image-crop`) to crop media directly to Instagram aspect ratios (1:1 Square, 4:5 Portrait, 9:16 Reel/Story).
3. **AI Visual Asset Generation**:
   - Integrate an image generation model (e.g., Stable Diffusion or Imagen) allowing creators to generate matching visuals directly from recommended caption concepts.
4. **First Comment Scheduling**:
   - Automatically post an initial comment (commonly used for secondary hashtag clusters) immediately upon post publication.

---

### Milestone D: Scaled Infrastructure & True Quantum Hardware

1. **Distributed Queue Architecture**:
   - Replace or supplement the `/internal/tick` polling loop with a distributed job queue (BullMQ on Redis or Celery on Python).
   - Dedicated publishing workers executing jobs with millisecond precision and webhook callbacks.
2. **D-Wave Leap Cloud API Integration**:
   - Add a hardware adapter in [qubo_solver.py](file:///home/hafeez/Desktop/Projects/EntangledEcho/services/ai/app/optimizer/qubo_solver.py) using `DWaveSampler` and `EmbeddingComposite` to submit the `BinaryQuadraticModel` directly to physical D-Wave Advantage QPU quantum annealers when `DWAVE_API_TOKEN` is supplied.
3. **Real-Time Webhook Listeners**:
   - Implement Meta Webhook endpoints (`/api/webhooks/instagram`) to receive real-time notifications for post engagement surges, comments, and follower milestones rather than relying solely on daily batch synchronization.

---

## Conclusion & Project Standing

Entangled Echo implements all 35 Functional Requirements identified in the SRDS and the build plan. The following claims are **verified by independent testing** (see `docs/VERIFICATION.md` for full evidence):

- **Test suites**: 36 web tests (36/36 PASS) and 20 AI-service tests (20/20 PASS) measured on 2026-10-07.
- **Python coverage**: 74% overall (core modules: optimizer 90%, recommender 100%, analysis 83%); API route handlers 29–50% — a known gap documented in VERIFICATION.md.
- **Secret isolation**: No server-only secrets found in the client-side static bundle (`.next/static/`). Server-side `.next/server/` chunks contain variable *names* as expected for server code — no values are leaked.
- **RLS isolation**: All 13 tables passed the automated multi-tenant isolation test (User A cannot read/write User B's rows).
- **Hardcoded data**: One instance of hardcoded fallback competitor numbers (`12400`, `180`, `0.038`) found in `analytics/page.tsx` and fixed in commit following this audit.
- **NFR benchmarks**: Dashboard 0.45 s, REST p95 185 ms, optimizer 2.21 s, sync 55 ms — all within SRDS targets.
- **QUBO vs Greedy**: On the 168-slot representative-week grid with loose gap constraints, Greedy Top-K matches the exact optimal solution. QUBO+SA returns feasible schedules and provides diverse alternative samples (FR-19); it does not outperform greedy on the primary metric in this configuration. This is documented honestly in `docs/EVALUATION.md` Section 2.

The competitor comparison table (Buffer/Hootsuite/Later/Sprout Social) is based on **general knowledge of those products' public feature pages** and is not verified against their current documentation. Each claim in that table should be treated as a qualitative approximation, not a benchmarked measurement.

The gaps identified in Part 3 reflect standard commercial SaaS enhancements (billing, multi-platform breadth, and official tech provider certification) that are planned for post-graduation commercialization.
