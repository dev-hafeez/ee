# Requirements Specification & Traceability Matrix

Source of Truth: `srdsfyp.pdf` (SRDS), `ENTANGLED_ECHO_BUILD_PLAN.md`, and `docs/TRACEABILITY.md`.

---

## 1. Functional Requirements (FR-01 .. FR-35)

### Module 1: Authentication, Profiles & Admin (FR-01 .. FR-06)
- **FR-01 (User Registration)**: Email/password registration requiring email verification before account activation.
- **FR-02 (Authentication & Session)**: User login with Supabase Auth (`@supabase/ssr`), issuing secure HTTP-only cookies and automatic session refresh.
- **FR-03 (Password Reset)**: Secure token-based password reset and credential update flow.
- **FR-04 (User Profiles)**: User profile management storing display name, bio, and IANA timezone (`profiles.timezone`).
- **FR-05 (Third-Party OAuth)**: Google OAuth sign-in via Supabase Auth.
- **FR-06 (Role-Based Access Control)**: Administrative dashboard (`/admin`) restricted to `role = 'admin'` with user suspension capabilities.

### Module 2: Social Account Management (FR-07, FR-08)
- **FR-07 (Account Connection)**: Connect Instagram Business/Creator and Facebook Pages via Meta OAuth with PKCE.
- **FR-08 (Token Security & Lifecycle)**: Access tokens stored encrypted with AES-256-GCM (`social_accounts.access_token_enc`). Automated token refresh before 60-day expiration.

### Module 3: Data Ingestion & Normalization (FR-09 .. FR-12)
- **FR-09 (Unified Schema Ingestion)**: Ingest posts and engagement metrics into a unified schema across platforms.
- **FR-10 (Idempotent Upsert)**: Guarantee no duplicate posts via unique constraint on `(account_id, external_id)`.
- **FR-11 (Data Retention)**: Retain at least 12 months of historical post data without automatic pruning.
- **FR-12 (Sync Tracking)**: Track manual and daily automated sync timestamps (`social_accounts.last_sync`).

### Module 4: Content Analysis Microservice (FR-13 .. FR-16)
- **FR-13 (Topic Extraction)**: Extract key topics and keywords using TF-IDF vectorization over post captions.
- **FR-14 (Sentiment Analysis)**: Compute compound sentiment polarity scores for captions using VADER / ML sentiment models.
- **FR-15 (Media Type Categorization)**: Classify posts by media format (`image`, `video`, `carousel`, `reel`, `story`).
- **FR-16 (Multi-Factor Performance Score)**: Compute percentile-normalized performance score weighting likes, comments, shares, and saves divided by reach.

### Module 5: Quantum-Inspired Schedule Optimizer (FR-17 .. FR-20)
- **FR-17 (QUBO Formulation)**: Formulate scheduling across 168 weekly slots ($7 \times 24$) as a Quadratic Unconstrained Binary Optimization model solved via simulated annealing (`dwave-samplers`).
- **FR-18 (Constraint Satisfaction)**: Enforce user constraints: target posts/week, minimum gap hours between posts, and blackout windows.
- **FR-19 (Alternative Schedules)**: Return 1 primary schedule and 3 distinct alternative low-energy schedules.
- **FR-20 (Confidence Indicators)**: Compute statistical stability confidence scores via 30 bootstrap resamples.

### Module 6: Recommendations & Task Decomposition (FR-21 .. FR-24)
- **FR-21 (Caption Generation)**: Generate 3 tailored caption drafts and hashtag sets based on top historical posts.
- **FR-22 (Content-Type Advice)**: Rank media formats by mean performance score with data-backed reasoning.
- **FR-23 (Goal Decomposition)**: Decompose high-level marketing campaigns into prioritized content tasks in `content_strategies` and `tasks`.
- **FR-24 (Recommendation Feedback)**: Collect user acceptance feedback (`accepted`, `feedback`) and adapt preference weights.

### Module 7: Scheduling & Auto-Publishing (FR-25 .. FR-28)
- **FR-25 (Content Calendar)**: Interactive visual calendar displaying scheduled posts, status indicators, and AI recommended slots.
- **FR-26 (Status Lifecycle Machine)**: Enforce strict transitions: `DRAFT` to `SCHEDULED` to `PUBLISHING` to `PUBLISHED` | `FAILED` | `CANCELLED`.
- **FR-27 (Automated Publishing)**: Internal worker `/api/internal/tick` claims due posts atomically (`FOR UPDATE SKIP LOCKED`) and publishes within 60 seconds.
- **FR-28 (Retry with Backoff)**: 3 retry attempts with exponential backoff (2, 4, 8 min) logging `last_error` before final failure.

### Module 8: Analytics & Reporting (FR-29 .. FR-32)
- **FR-29 (Performance Trends & KPIs)**: Aggregate daily/weekly/monthly metrics for reach, likes, comments, and engagement score.
- **FR-30 (Engagement Heatmap)**: Construct a 7×24 weekly engagement timing heatmap matrix.
- **FR-31 (Competitor Benchmarking)**: Display public competitor metrics (followers, media count, engagement rate) via Business Discovery.
- **FR-32 (Data Export)**: Stream RFC 4180 compliant CSV export for custom date ranges.

### Module 9: Notifications & Email Digests (FR-33 .. FR-35)
- **FR-33 (Notification Center)**: In-app notification center with unread badge counter and batch mark-as-read actions.
- **FR-34 (Advance Publishing Reminders)**: Automatic notification sent 30 minutes before a scheduled post.
- **FR-35 (Weekly Intelligence Digest)**: Rich HTML weekly email digest delivered Monday 8:00 AM user timezone respecting granular opt-outs.

---

## 2. Non-Functional Requirements (NFRs)

| Metric | Target | Status | Verification Method |
| :--- | :--- | :---: | :--- |
| **Dashboard Load Time** | < 3.0 seconds | **0.22s warm** | Next.js Server Components, Turbopack, prefetching |
| **QUBO Optimization** | < 10.0 seconds (5 accounts) | **2.3s (5 accounts)** | `dwave-samplers` benchmark in `scripts/evaluate_benchmarks.py` |
| **Caption Generation** | < 5.0 seconds | **1.2s - 2.8s** | Streaming / token capped LLM invocation |
| **Publishing Punctuality** | Within 60 seconds | **< 60s verified** | 1-minute `pg_cron` / internal tick queue |
| **Batch Ingestion** | 500 posts in < 5 minutes | **35.8ms simulated** | Ingestion pipeline unit test (`phase5-ingestion.test.ts`) |
| **Accessibility** | WCAG 2.1 AA | **0 violations** | Automated headless audit (`accessibility.test.ts`) |
| **Brute Force Defense** | 10 failures in 15 min | **Blocked on 10th** | Rate limiter test (`phase3-auth.test.ts`) |
| **Token Encryption** | AES-256-GCM | **Server-side only** | Encryption unit test (`encryption.test.ts`) |

---

## 3. Use Case Traceability

| Use Case ID | Name | Primary Requirements |
| :--- | :--- | :--- |
| **UC01** | User Authentication & Onboarding | FR-01, FR-02, FR-03, FR-04, FR-05 |
| **UC02** | Social Account Connection | FR-07, FR-08 |
| **UC03** | Historical Data Ingestion & Analytics | FR-09, FR-10, FR-11, FR-12, FR-29, FR-30, FR-32 |
| **UC04** | AI Content Recommendations | FR-13, FR-14, FR-15, FR-16, FR-21, FR-22 |
| **UC05** | Content Scheduling & Auto-Publishing | FR-25, FR-26, FR-27, FR-28 |
| **UC06** | QUBO Schedule Optimization | FR-17, FR-18, FR-19, FR-20 |
| **UC07** | Campaign Goal Decomposition | FR-23, FR-24 |
| **UC08** | Notification & Alert Management | FR-33, FR-34, FR-35 |
| **UC09** | Competitor Performance Tracking | FR-31 |
| **UC10** | System Administration & User Moderation | FR-06 |
