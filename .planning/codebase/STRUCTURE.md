# Repository Structure & File Organization

## Monorepo Directory Overview

```
EntangledEcho/
├── apps/
│   └── web/                   # Next.js 16 Web Application & BFF
├── services/
│   └── ai/                    # Python 3.12 FastAPI Analytical Microservice
├── supabase/
│   └── migrations/            # Versioned SQL migrations & RLS policies
├── scripts/                   # Evaluation, synthetic seed generation, & admin tools
├── docs/                      # Architectural reports, evaluation benchmarks, deviations
├── .planning/                 # Project planning, codebase maps, and state management
├── docker-compose.yml         # Container orchestration for AI service & local setup
├── package.json               # Root workspace script runner
├── pnpm-workspace.yaml        # pnpm workspace definition
└── .env.example               # Reference manifest of environment variables
```

---

## 1. Web Application (`apps/web`)

```
apps/web/
├── package.json               # Next.js, React, Tailwind, Supabase dependencies
├── next.config.ts             # Next.js 16 config (Turbopack, staleTimes, security headers)
├── tsconfig.json              # TypeScript strict configuration
├── src/
│   ├── middleware.ts          # Edge entry point delegating to Supabase session updater
│   ├── app/
│   │   ├── layout.tsx         # Root HTML layout with font declarations
│   │   ├── page.tsx           # Public marketing landing page
│   │   ├── globals.css        # Tailwind CSS import tokens
│   │   ├── (auth)/            # Authentication route group
│   │   │   ├── login/         # Sign-in page with rate-limiting & error handling
│   │   │   ├── signup/        # Registration page with email verification
│   │   │   ├── reset-password/# Password recovery flow
│   │   │   └── actions.ts     # Server actions: login, signup, resetPassword, logout
│   │   ├── (dashboard)/       # Authenticated app shell route group
│   │   │   ├── layout.tsx     # App shell with Sidebar, TopBar, and RealtimeListener
│   │   │   ├── loading.tsx    # Instant pulse skeleton fallback for route transitions
│   │   │   ├── dashboard/     # /dashboard overview page (KPIs, recent activity)
│   │   │   ├── analytics/     # /analytics page (heatmap, media performance, export)
│   │   │   │   ├── page.tsx
│   │   │   │   └── AnalyticsClient.tsx
│   │   │   ├── recommendations/# /recommendations page (QUBO run, caption recs)
│   │   │   │   ├── page.tsx
│   │   │   │   ├── RecommendationsClient.tsx
│   │   │   │   └── recommendation-actions.ts
│   │   │   ├── calendar/      # /calendar visual scheduling page
│   │   │   │   ├── page.tsx
│   │   │   │   ├── CalendarClient.tsx
│   │   │   │   └── calendar-actions.ts
│   │   │   ├── notifications/ # /notifications in-app center
│   │   │   │   ├── page.tsx
│   │   │   │   └── NotificationsClient.tsx
│   │   │   ├── settings/      # /settings (OAuth connect/disconnect, profile)
│   │   │   │   ├── page.tsx
│   │   │   │   ├── SettingsClient.tsx
│   │   │   │   └── settings-actions.ts
│   │   │   └── onboarding/    # /onboarding interactive walkthrough
│   │   ├── admin/             # /admin protected administrator portal
│   │   │   ├── page.tsx       # User management, role inspection, suspension toggles
│   │   │   └── actions.ts     # Admin actions: toggleSuspension, deleteUser
│   │   └── api/               # BFF Route Handlers
│   │       ├── analytics/export/ # Streamed RFC 4180 CSV export
│   │       ├── auth/callback/    # OAuth code exchange handler
│   │       ├── data/sync/        # Manual social ingestion trigger
│   │       └── internal/tick/    # Background publishing worker & reminder queue
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx    # Collapsible sidebar with instant prefetch links
│   │   │   └── TopBar.tsx     # Top navigation with user badge, search, and modals
│   │   ├── ai/
│   │   │   ├── AssistantModal.tsx    # Grounded interactive AI chat assistant modal
│   │   │   └── ImageGeneratorModal.tsx# AI image generation & watermark studio modal
│   │   ├── realtime/
│   │   │   └── RealtimeListener.tsx  # Global Supabase CDC change subscriber & toaster
│   │   └── ui/                # Reusable UI primitives (Buttons, Cards, Badges)
│   └── lib/
│       ├── auth/
│       │   └── rate-limiter.ts# PostgreSQL-backed IP brute force rate limiting
│       ├── crypto/
│       │   └── token.ts       # AES-256-GCM encryption & decryption functions
│       ├── providers/
│       │   ├── social.ts      # SocialProvider interface + Live, Seed, Mock classes
│       │   └── email.ts       # EmailProvider interface + Resend, SMTP, Mock classes
│       ├── publishing/
│       │   └── scheduler.ts   # Publishing status machine transitions & validation
│       └── supabase/
│           ├── client.ts      # Browser Supabase client
│           ├── server.ts      # Server Component Supabase client
│           ├── middleware.ts  # Middleware session updater & cached session check
│           ├── cached.ts      # React cache() deduplicated user & profile getters
│           └── config.ts      # Safe URL and key resolution helpers
└── tests/                     # 9 web test suites (tsx --test)
    ├── accessibility.test.ts
    ├── encryption.test.ts
    ├── phase3-auth.test.ts
    ├── phase4-social.test.ts
    ├── phase5-ingestion.test.ts
    ├── phase9-publishing.test.ts
    ├── phase10-analytics.test.ts
    ├── phase11-notifications.test.ts
    └── security.test.ts
```

---

## 2. AI Microservice (`services/ai`)

```
services/ai/
├── Dockerfile                 # Container packaging (python:3.12-slim)
├── requirements.txt           # Production dependencies (FastAPI, dimod, dwave, etc.)
├── pyproject.toml             # Ruff and pytest tool configurations
├── app/
│   ├── main.py                # FastAPI initialization, CORS, router mounting, healthcheck
│   ├── config.py              # Pydantic BaseSettings environment model
│   ├── auth.py                # Service-to-service Bearer secret verification dependency
│   ├── db.py                  # Server-side Supabase client singleton
│   ├── analysis/
│   │   └── analyzer.py        # TF-IDF topic extraction, VADER sentiment, perf score
│   ├── optimizer/
│   │   └── qubo.py            # QUBO formulation & D-Wave simulated annealing solver
│   ├── recommender/
│   │   └── generator.py       # Algorithm 2 caption & content-type recommendation engine
│   ├── decomposer/
│   │   └── planner.py         # Campaign goal decomposition into prioritized tasks
│   ├── llm/
│   │   ├── provider.py        # Anthropic, Gemini, and Mock LLM abstractions
│   │   └── validator.py       # Unseen numbers anti-hallucination validation
│   ├── assistant/
│   │   └── chat.py            # RAG-grounded conversational assistant logic
│   ├── image/
│   │   └── generator.py       # AI synthetic image studio & watermark pipeline
│   └── api/
│       └── v1/
│           ├── analyze.py     # POST /api/v1/analyze
│           ├── optimize.py    # POST /api/v1/optimize
│           ├── recommend.py   # POST /api/v1/recommend
│           ├── decompose.py   # POST /api/v1/decompose
│           ├── assistant.py   # POST /api/v1/assistant/chat
│           └── image.py       # POST /api/v1/image/generate
└── tests/                     # 9 pytest test suites
    ├── test_health.py
    ├── test_auth.py
    ├── test_config.py
    ├── test_analysis.py
    ├── test_optimizer.py
    ├── test_recommendations.py
    ├── test_unseen_numbers_validator.py
    └── test_assistant_and_image.py
```

---

## 3. Database Migrations (`supabase/migrations`)

```
supabase/migrations/
├── 20241001000000_initial_schema.sql      # 14 core relational tables, foreign keys, triggers
├── 20241001000001_rls_policies.sql        # Row-Level Security policies & is_admin() function
├── 20241001000002_claim_due_posts.sql     # Atomic FOR UPDATE SKIP LOCKED publishing queue RPC
└── 20241001000003_ai_features_and_logs.sql# Token logging, image logs, & assistant conversation tables
```

---

## 4. Scripts & Documentation

```
scripts/
├── evaluate_benchmarks.py     # Rigorous evaluation against truth matrix & baselines
├── train_sentiment.py         # Trains and benchmarks ML classifier on Sanders corpus
├── verify_real_ai_features.py # End-to-end audit of real LLM, QUBO, and image pipelines
├── test_rls.sh                # RLS multi-tenant boundary automated testing
└── demo_reset.sh              # Reset database to clean demo state

docs/
├── APP_STATUS_AND_ARCHITECTURE_REPORT.md  # Comprehensive static vs dynamic system status
├── DATA_SOURCES.md            # Data provenance, API versions, and synthetic generation specs
├── DEVIATIONS.md              # Running log of intentional deviations from SRDS (D1-D27)
├── EVALUATION.md              # Benchmark evaluation results, QUBO optimality, ML accuracy
├── TRACEABILITY.md            # Requirements traceability matrix (FR-01..35, UC01..10)
├── VERIFICATION.md            # Step-by-step test evidence and reproduction instructions
└── DEFENSE_QA.md              # Final Year Project defense preparation & technical Q&A
```
