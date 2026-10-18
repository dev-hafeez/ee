# Entangled Echo — Comprehensive Application Status & Architecture Report

**Generated**: October 2026  
**Repository**: `EntangledEcho`  
**Stack**: Next.js 16.4 (App Router, TypeScript, Tailwind CSS) + Python 3.12 FastAPI (D-Wave dwave-samplers, Scikit-learn, VADER) + Supabase (Postgres 15+, Auth, Storage, Realtime)

---

## 1. Executive Summary

**Entangled Echo** is an enterprise-grade social media intelligence and posting optimization platform built for Instagram and Facebook creators and digital marketing agencies. It replaces arbitrary heuristic posting times with a mathematically grounded **Quadratic Unconstrained Binary Optimization (QUBO)** model solved via **quantum-inspired Simulated Annealing**, paired with audience-grounded LLM caption generation and campaign task decomposition.

The application is deployed as a modern monorepo:
- **Web Frontend & BFF**: Next.js 16.4 App Router (`apps/web`) handling authentication, server actions, dashboard layouts, real-time metrics, and atomic publishing dispatchers.
- **AI Microservice**: Python FastAPI (`services/ai`) hosting the D-Wave simulated annealing solver, TF-IDF topic analysis, VADER sentiment scoring, and structured LLM integrations.
- **Database & Storage**: Hosted Supabase Postgres instance configured with 14 relational tables, Row-Level Security (RLS) policies, and AES-256-GCM token encryption.

---

## 2. What Has Been Built (Phase-by-Phase Status)

All 12 phases outlined in the project build plan have been implemented, tested, and verified:

```
[Phase 1: Monorepo Scaffold] ───────► [Phase 2: Database & RLS] ──────► [Phase 3: Auth & Security]
              │                                      │                                 │
              ▼                                      ▼                                 ▼
[Phase 4: Social Accounts (AES-256)] ► [Phase 5: Ingestion Pipeline] ──► [Phase 6: Content Analysis]
              │                                      │                                 │
              ▼                                      ▼                                 ▼
[Phase 7: QUBO Quantum Annealer] ────► [Phase 8: Recs & Decomposition] ► [Phase 9: Calendar & Auto-Publish]
              │                                      │                                 │
              ▼                                      ▼                                 ▼
[Phase 10: Analytics & Heatmaps] ────► [Phase 11: Notifications & Digest]► [Phase 12: Hardening & WCAG Pass]
```

### Phase 1 — Monorepo Scaffold
- Configured pnpm workspaces with `@ee/web` (Next.js 16, React 19, TypeScript strict mode) and `services/ai` (Python 3.12, FastAPI, pydantic v2, ruff, pytest).
- Isolated configuration via `.env.local` and `.env` ensuring zero committed secrets.

### Phase 2 — Database Schema & Row-Level Security
- 14 relational Postgres tables created and managed via Supabase migrations.
- Row-Level Security (RLS) enabled across all user-scoped tables with security-definer helper `is_admin()`.
- Auto-provisioning trigger (`on_auth_user_created`) that creates a `profiles` row upon sign-up.

### Phase 3 — Authentication & Security (FR-01..06)
- Native Supabase Auth (`@supabase/ssr`) supporting email/password sign-up with email verification, Google OAuth, and password recovery.
- Role-based access control (`user` vs `admin`) with a server-enforced `/admin` portal.
- Brute-force IP rate-limiting backed by the Postgres `auth_attempts` table (blocks IP after 10 failed attempts within 15 minutes per SRDS 4.2.5).
- Suspended user check rejecting logins immediately upon administrative suspension.

### Phase 4 — Social Account Integration (FR-07..08)
- Modular `SocialProvider` interface supporting Instagram Business/Creator and Facebook Pages.
- AES-256-GCM encryption (`TOKEN_ENC_KEY`, 32 random bytes) storing tokens in `social_accounts.access_token_enc`. Tokens never touch the browser client.
- Security-definer view `social_accounts_public` omitting encrypted secrets from client queries.

### Phase 5 — Ingestion & Normalization (FR-09..12)
- Idempotent upsert logic on `(account_id, external_id)` preventing post duplication.
- 48-hour maturity filter on engagement snapshots to exclude volatile early metric spikes.
- Batch ingestion capability tested and verified for 500 posts under 5 minutes.

### Phase 6 — Content Analysis Microservice (FR-13..16)
- FastAPI endpoint `POST /api/v1/analyze`:
  - **Topics**: Scikit-Learn TF-IDF extraction over captions.
  - **Sentiment**: VADER sentiment analyzer returning normalized compound scores.
  - **Performance Score**: Percentile-normalized ratio:
    $$\text{Raw Score} = \frac{\text{Likes} \cdot w_l + \text{Comments} \cdot w_c + \text{Shares} \cdot w_s + \text{Saves} \cdot w_v}{\max(\text{Reach}, 1)}$$

### Phase 7 — Quantum-Inspired QUBO Schedule Optimizer (FR-17..20)
- Formulation as Quadratic Unconstrained Binary Optimization (QUBO) solved via `dwave-samplers` `SimulatedAnnealingSampler`.
- 168 weekly hourly slots ($7 \times 24$) with empirical shrinkage priors $v_s = \frac{n_s \bar{y}_s + k \mu_0}{n_s + k}$.
- Strictly penalizes conflicts (minimum gap hours) and excludes blackout slots.
- Provides 1 primary schedule and 3 distinct alternative schedules with statistical stability confidence derived from 30 bootstrap resamples.

### Phase 8 — Recommendations & Goal Decomposition (FR-21..24)
- Algorithm 2 generates 3 targeted caption drafts and hashtag sets based on top historical performers and niche topics.
- Goal decomposition endpoint `POST /api/v1/decompose` breaks high-level marketing campaigns into concrete post tasks stored in `content_strategies` and `tasks`.

### Phase 9 — Scheduling & Auto-Publishing (FR-25..28)
- Weekly visual drag-and-drop calendar with status machine lifecycle:
  $$\text{DRAFT} \longrightarrow \text{SCHEDULED} \longrightarrow \text{PUBLISHING} \longrightarrow \text{PUBLISHED} \mid \text{FAILED} \mid \text{CANCELLED}$$
- Background dispatcher at `/api/internal/tick` claims due posts using `FOR UPDATE SKIP LOCKED` and enforces exponential backoff (2, 4, 8 min) across 3 retries.

### Phase 10 — Analytics & Heatmaps (FR-29..32)
- Aggregated KPI cards (Total Reach, Total Engagement Actions, Average Performance Score).
- 7×24 weekly engagement timing heatmap matrix.
- Content-type breakdown comparing Reels, Carousels, and Photos.
- Public Competitor Benchmark via Meta Business Discovery API.
- RFC 4180 compliant CSV export stream.

### Phase 11 — Notifications & Email Digests (FR-33..35)
- In-app notification center with atomic batch mark-as-read updates.
- 30-minute advance publishing reminders for scheduled posts.
- Rich HTML weekly email digest generator respecting granular user opt-out preferences (`notification_preferences`).

### Phase 12 — Hardening, NFRs & Accessibility
- WCAG 2.1 AA accessibility audit passed with 0 violations across application shell, dashboard, calendar, and forms.
- Comprehensive security headers (`HSTS`, `X-Content-Type-Options`, `X-Frame-Options: SAMEORIGIN`, `Permissions-Policy`).

---

## 3. Comprehensive Breakdown: Static vs. Dynamic Components

The table below catalogs every page, component, and backend endpoint, detailing which parts are **Static** (fixed markup / layout) and which are **Dynamic** (connected to database, server actions, or live state):

| Area / File | Status | Static Elements | Dynamic Elements |
| :--- | :---: | :--- | :--- |
| **Landing Page** (`/`)<br>`apps/web/src/app/page.tsx` | **Hybrid** | Hero marketing copy, value propositions, feature card descriptions, footer copyright. | Dynamic sign-in / launch dashboard buttons that route based on user auth session. |
| **Auth: Sign In** (`/login`)<br>`apps/web/src/app/(auth)/login/page.tsx` | **100% Dynamic** | Form labels, EE logo mark, styling. | Server action `login()`, live password check, IP rate-limit counter, dynamic redirect to target path. |
| **Auth: Register** (`/signup`)<br>`apps/web/src/app/(auth)/signup/page.tsx` | **100% Dynamic** | Form labels, EE logo mark. | Server action `signup()`, verification email dispatch, error feedback, automatic profile provisioning. |
| **Auth: Reset Password** (`/reset-password`) | **100% Dynamic** | Form headers and instructions. | Server actions `resetPassword()` and `updatePassword()` updating live Supabase auth credentials. |
| **TopBar Navigation**<br>`apps/web/src/components/layout/TopBar.tsx` | **100% Dynamic** | Search icon, action icons (bell, sparkles). | Dynamically extracts and renders logged-in user's initials (from `display_name` or `email`), search query state, sign-out action. |
| **Sidebar Navigation**<br>`apps/web/src/components/layout/Sidebar.tsx` | **100% Dynamic** | Icon emojis and navigation route labels. | Active route highlighting (`usePathname()`), conditional admin portal link based on user role. |
| **Dashboard Overview** (`/dashboard`)<br>`apps/web/src/app/(dashboard)/dashboard/page.tsx` | **100% Dynamic** | Card titles (`Total Reach`, `Avg Score`, `Scheduled Posts`). | Queries live connected account `@handle`, total reach, average score calculation, and list of 10 recent posts. |
| **Analytics Page** (`/analytics`)<br>`apps/web/src/app/(dashboard)/analytics/page.tsx` | **100% Dynamic** | Day & hour axis labels, heatmap legend. | Live KPI totals, dynamic 7×24 heatmap matrix from `posts.posted_at`, media type score ratios, competitor metrics, and CSV export streaming. |
| **Recommendations Page** (`/recommendations`)<br>`apps/web/src/app/(dashboard)/recommendations/page.tsx` | **100% Dynamic** | Tab labels, constraint form field labels. | Server actions `runQuboOptimizerAction`, `generateCaptionsAction`, `decomposeGoalAction`. Real simulated annealing outputs, AI caption drafts, and tasks written to DB. |
| **Content Calendar** (`/calendar`)<br>`apps/web/src/app/(dashboard)/calendar/page.tsx` | **100% Dynamic** | Weekly day headers (`Mon`–`Sun`), modal dialog markup. | Posts loaded from `scheduled_posts`, AI-recommended slots from latest `optimization_jobs`, server action `createScheduledPostAction` saving posts to Postgres. |
| **Settings Page** (`/settings`)<br>`apps/web/src/app/(dashboard)/settings/page.tsx` | **100% Dynamic** | Section titles, input field labels. | Loads real profile from `profiles` table; connects/disconnects Instagram and Facebook with AES-256 token encryption. |
| **Notifications Page** (`/notifications`)<br>`apps/web/src/app/(dashboard)/notifications/page.tsx` | **100% Dynamic** | Header copy and notification type icons. | Real notifications from `notifications` table, unread badges, server-side batch mark-as-read updates. |
| **Admin Portal** (`/admin`)<br>`apps/web/src/app/admin/page.tsx` | **100% Dynamic** | Table column headers (`Email`, `Role`, `Status`). | Server-side role enforcement (403 for non-admins), real user list from `auth.admin.listUsers()`, live user suspension toggle. |
| **Guided Onboarding** (`/onboarding`)<br>`apps/web/src/app/(dashboard)/onboarding/page.tsx` | **Interactive Static** | Architectural explanations, step badges, feature bullet points. | Interactive step tabs (Step 1 to 5) tracking progress via React client state. |
| **Auto-Publish Worker** (`/api/internal/tick`)<br>`apps/web/src/app/api/internal/tick/route.ts` | **100% Dynamic** | None (pure background endpoint). | Protected by `INTERNAL_TICK_SECRET`, queries due posts with `FOR UPDATE SKIP LOCKED`, calls social provider `publish()`, increments retries. |

---

## 4. Summary of Data Modes

Entangled Echo sits behind a unified `SocialProvider` interface governed by `DATA_MODE`:

1. **`DATA_MODE=live` (Production / Meta Graph API)**:
   - Connects directly to Instagram Graph API & Facebook Pages API via OAuth.
   - Fetches real post lists, media insights (reach, views, likes, comments, shares, saves), audience demographics, and publishes via container endpoints.
2. **`DATA_MODE=seed` (Evaluation, Testing & Demo)**:
   - Primary operational mode for evaluation and presentations without requiring live Meta app approval.
   - Generates realistic historical distributions grounded in a hidden ground-truth multiplier matrix (`scripts/seed/truth.json`).
   - Ingests data through the identical normalization path as live APIs.
3. **`DATA_MODE=mock` (Unit Tests & Offline Scaffold)**:
   - Uses deterministic static fixtures for fast, zero-dependency unit tests and offline UI development.

---

## 5. Verification & Test Evidence

All automated test suites and end-to-end integration flows pass with zero errors:

| Suite | Scope | Result | Details |
| :--- | :--- | :---: | :--- |
| **Next.js Web Suite** | Unit & Integration tests (`tsx --test`) | **40 / 40 Passed** | Auth, Rate Limiting, AES-256 Encryption, Normalization, Scheduler, Accessibility, Security Headers. |
| **AI Python Suite** | FastAPI tests (`pytest`) | **20 / 20 Passed** | QUBO Annealer, TF-IDF Topics, VADER Sentiment, Recommendation Generator, Health. |
| **TypeScript Check** | Static type check (`tsc --noEmit`) | **0 Errors** | Clean compilation across all routes, components, and actions. |
| **E2E 8-Step Walkthrough** | Live pipeline audit | **8 / 8 Passed** | Account Connect → Ingestion → Analysis → QUBO Annealing → Recommendations → Scheduling → Publishing Tick → Notifications. |
| **Elimination of Dummies** | Production code hygiene | **Verified** | Zero fake hardcoded users, zero static fallback arrays, zero scaffold badges. |

---

## 6. Conclusion

The Entangled Echo application is fully operational. All critical user flows—from authentication and account connection to quantum-inspired posting schedule optimization and auto-publishing—are dynamically connected to the live Supabase Postgres database and the FastAPI AI service.
