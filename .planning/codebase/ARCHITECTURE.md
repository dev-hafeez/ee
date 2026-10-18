# System Architecture & Technical Design

## 1. Architectural Overview

**Entangled Echo** is built as a hybrid **Next.js App Router BFF (Backend-for-Frontend)** + **Python FastAPI Analytical Microservice** backed by a **PostgreSQL Database-as-a-Service (Supabase)**.

The architecture decouples lightweight, high-concurrency user operations (auth, page routing, drag-and-drop scheduling, realtime notifications) from heavy mathematical and ML operations (QUBO matrix formulation, simulated annealing, NLP vectorization, and LLM orchestration).

```
                             ┌──────────────────────────────────────────────┐
                             │               BROWSER CLIENT                 │
                             │  (Next.js React 19 Client Components, HTML5) │
                             └───────┬───────────────────────────────▲──────┘
                                     │ HTTPS                         │ Supabase Realtime
                                     ▼                               │ (WebSockets)
                             ┌───────────────────────────────────────┴──────┐
                             │          NEXT.JS 16 BFF LAYER                │
                             │   (App Router, Server Actions, Middleware)   │
                             └───┬───────────────────────────┬──────────────┘
                                 │                           │
                   PostgREST     │                           │ HTTP Bearer Secret
                   (Direct DB)   ▼                           ▼
┌────────────────────────────────────────────┐   ┌─────────────────────────────────────────┐
│              SUPABASE BAAS                 │   │          FASTAPI AI SERVICE             │
│  - PostgreSQL 15+ (14 Relational Tables)   │   │  - D-Wave Simulated Annealing (QUBO)    │
│  - Row-Level Security (RLS)                │   │  - TF-IDF Topic & Feature Extraction    │
│  - Supabase Auth (GoTrue)                  │   │  - VADER / Sanders Sentiment Analysis   │
│  - S3 Object Storage (Media Assets)        │   │  - LLM Orchestration & Validator        │
│  - Realtime CDC Engine                     │   │  - AI Assistant & Image Studio Engine   │
└────────────────────────────────────────────┘   └─────────────────────────────────────────┘
```

---

## 2. Key Subsystems & Layers

### A. Presentation & Routing Layer (`apps/web/src/app`)
- **Route Groups**:
  - `(auth)`: Login, signup, password recovery, verification callbacks.
  - `(dashboard)`: Core application shell (`Sidebar`, `TopBar`, `RealtimeListener`) wrapping:
    - `/dashboard`: KPI summary, recent activity, quick actions.
    - `/analytics`: 7×24 heatmap matrix, content type comparisons, competitor benchmarks, CSV exports.
    - `/recommendations`: QUBO optimizer run, caption/hashtag generators, campaign goal decomposition.
    - `/calendar`: Visual weekly drag-and-drop posting grid.
    - `/notifications`: Notification center with batch read state updates.
    - `/settings`: Social account connections (Instagram/Facebook) and profile preferences.
  - `/admin`: Restricted administrative dashboard for user suspension and access control.
- **Performance Architecture**:
  - React `cache()` deduplication in `src/lib/supabase/cached.ts` eliminates duplicate session/profile lookups.
  - Instant loading skeletons via `loading.tsx` and React Suspense boundaries.
  - Link prefetching with `staleTimes: { dynamic: 30, static: 180 }` in `next.config.ts`.
  - Middleware fast-path caching (`ee_session_check`) avoids 500ms remote database roundtrips on route changes.

### B. Security & Cryptography Layer (`apps/web/src/lib/crypto`)
- **AES-256-GCM Token Encryption**:
  - Access tokens from Meta OAuth are encrypted before writing to `social_accounts.access_token_enc`.
  - Initialized with a 32-byte secret (`TOKEN_ENC_KEY`), random 12-byte IV, and 16-byte auth tag.
  - Plaintext tokens never reach browser bundles.
- **Row-Level Security (RLS)**:
  - All application tables enforce RLS ensuring users can only read and write their own rows.
  - Administrators are granted bypass access via the PostgreSQL security-definer function `is_admin()`.

### C. Analytical & Optimization Microservice (`services/ai`)
- **QUBO Optimizer (`services/ai/app/optimizer/qubo.py`)**:
  - Formulates posting schedule as a Quadratic Unconstrained Binary Optimization (QUBO) problem over 168 weekly slots ($7 \times 24$):
    $$E(x) = -\sum_{s} v_s x_s + A \left(\sum_{s} x_s - K\right)^2 + B \sum_{(i,j) \in \text{conflict}} x_i x_j$$
  - $v_s$: Normalized expected slot performance score calculated via empirical Bayesian shrinkage.
  - $K$: Target posts per week.
  - Conflict penalties enforce minimum gap hours between posts.
  - Solved using `dwave-samplers` `SimulatedAnnealingSampler`.
  - Alternative schedules: Evaluates top-4 distinct low-energy feasible solutions.
  - Bootstrap Stability Confidence: Resamples historical posts 30 times with replacement to determine schedule robustness.
- **Content Analysis (`services/ai/app/analysis/analyzer.py`)**:
  - TF-IDF over captions for topic clustering.
  - VADER sentiment analysis compound scoring.
  - Percentile-normalized multi-factor engagement scoring:
    $$\text{Engagement} = 1.0 \cdot \text{likes} + 3.0 \cdot \text{comments} + 5.0 \cdot \text{shares} + 4.0 \cdot \text{saves}$$
    $$\text{Raw Score} = \frac{\text{Engagement}}{\max(\text{Reach}, 1)}$$
- **Recommendation & Task Decomposer (`services/ai/app/recommender`)**:
  - Generates 3 caption drafts with matching hashtag clusters based on top historical posts.
  - Decomposes high-level marketing goals into prioritized post tasks inside `content_strategies` and `tasks`.
  - Enforces strict hallucination guardrails via `UnseenNumbersValidator`.

### D. Publishing & Automated Background Worker (`apps/web/src/app/api/internal/tick`)
- **Scheduler State Machine**:
  $$\text{DRAFT} \longrightarrow \text{SCHEDULED} \longrightarrow \text{PUBLISHING} \longrightarrow \text{PUBLISHED} \mid \text{FAILED} \mid \text{CANCELLED}$$
- **Concurrency & Idempotency**:
  - Worker is triggered every minute via `/api/internal/tick` protected by `INTERNAL_TICK_SECRET`.
  - Due posts are claimed atomically using PostgreSQL `FOR UPDATE SKIP LOCKED`.
  - Dispatches to `SocialProvider.publish()` with exponential backoff (2, 4, 8 minutes) across 3 retries.
  - Publishes within 60 seconds of scheduled time (SRDS 4.1.5).

---

## 3. Relational Database Schema (Supabase PostgreSQL)

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────────────┐
│ auth.users   │◄──────┤ profiles         │◄──────┤ social_accounts      │
└──────────────┘       └─────────┬────────┘       └──────────┬───────────┘
                                 │                           │
                                 │                           ▼
                                 │                ┌──────────────────────┐
                                 │                │ posts                │
                                 │                └──────────┬───────────┘
                                 │                           │
                                 │                           ▼
                                 │                ┌──────────────────────┐
                                 │                │ engagement_metrics   │
                                 │                └──────────────────────┘
                                 ▼
       ┌─────────────────────────┼─────────────────────────┐
       │                         │                         │
       ▼                         ▼                         ▼
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│ competitors  │          │ scheduled_   │          │ optimization_│
│              │          │ posts        │          │ jobs         │
└──────────────┘          └──────────────┘          └──────────────┘
```

1. `profiles`: Extends Supabase auth; stores `role`, `suspended`, `timezone`, `display_name`, `bio`.
2. `social_accounts`: Connected Instagram/Facebook accounts, encrypted tokens, sync timestamps, synthetic flags.
3. `posts`: Ingested social media posts with caption, hashtags, media type, permalink, perf_score, topics, sentiment.
4. `engagement_metrics`: Time-series engagement snapshots (likes, comments, shares, saves, reach, views, impressions).
5. `audience_snapshots`: Demographic distributions (age, gender, location).
6. `competitors`: Public competitor handles and metrics tracked via Business Discovery.
7. `scheduled_posts`: Content calendar queue with status lifecycle, retry counters, and error diagnostics.
8. `optimization_jobs`: Asynchronous QUBO solver job payloads, parameters, results, and confidence scores.
9. `content_strategies`: High-level marketing goals and campaigns.
10. `tasks`: Individual post creation tasks generated by the AI decomposer.
11. `recommendations`: Caption drafts, schedule suggestions, content-type advice with user acceptance feedback.
12. `notifications`: In-app alerts and notifications.
13. `notification_preferences`: Granular user opt-in/opt-out settings for email and in-app notifications.
14. `auth_attempts`: Brute-force IP rate-limiting tracker (blocks IP after 10 failures in 15 minutes).
