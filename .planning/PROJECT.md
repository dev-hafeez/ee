# Entangled Echo

**Status**: Operational / Completed Phase 12 Hardening  
**Target Audience**: Digital creators, agencies, and small businesses on Instagram & Facebook  
**Source of Truth Requirements**: `srdsfyp.pdf` (SRDS) & `ENTANGLED_ECHO_BUILD_PLAN.md`

---

## 1. Executive Overview

**Entangled Echo** is an enterprise-grade social media intelligence and posting optimization platform designed specifically for Instagram and Facebook. It eliminates arbitrary guesswork and crude rule-of-thumb heuristics by formulating content scheduling as a **Quadratic Unconstrained Binary Optimization (QUBO)** problem solved using **quantum-inspired Simulated Annealing** (`dwave-samplers`).

Complementing the quantum-inspired scheduler, the system provides:
- **Audience-Grounded LLM Caption & Hashtag Generation** with strict anti-hallucination validation.
- **Campaign Goal Decomposition** translating high-level marketing objectives into concrete, prioritized content tasks.
- **Visual Drag-and-Drop Content Calendar** with an atomic status lifecycle machine (`DRAFT` to `SCHEDULED` to `PUBLISHING` to `PUBLISHED`).
- **Automated Background Publisher** executing within 60 seconds of scheduled times with exponential backoff retries.
- **Multi-Factor Performance Scoring & Analytics** aggregating historical reach, likes, comments, shares, and saves into a 7×24 weekly engagement heatmap.
- **Enterprise Security**: PostgreSQL Row-Level Security (RLS) across all user tables and AES-256-GCM token encryption.

---

## 2. Core Architecture

The repository is organized as a monorepo with clean separation of concerns:

- **Web Frontend & BFF (`apps/web`)**: Next.js 16.4 App Router, React 19, TypeScript strict mode, and Tailwind CSS. Employs React Server Components, Server Actions, React `cache()` request deduplication, and prefetching with Next.js `staleTimes: { dynamic: 30 }`.
- **Analytical & AI Microservice (`services/ai`)**: Python 3.12 FastAPI microservice hosting D-Wave `dimod` and `dwave-samplers` for QUBO solving, Scikit-learn for TF-IDF keyword extraction, VADER for sentiment analysis, and structured LLM integrations (Gemini, Claude, Mock).
- **Backend-as-a-Service (`supabase/migrations`)**: Hosted Supabase PostgreSQL 15+ database with 14 relational tables, Row-Level Security policies, Supabase Auth (`@supabase/ssr`), and Realtime CDC subscriptions.

---

## 3. Scope Boundaries

### In Scope
- Instagram Business & Creator accounts.
- Facebook Pages.
- QUBO-formulated posting schedule optimization with 168 weekly slots ($7 \times 24$).
- Bootstrap stability confidence scoring (30 resamples).
- Content analysis (TF-IDF topics, sentiment, percentile-normalized performance scoring).
- LLM caption generation, hashtag clustering, and campaign task decomposition.
- Auto-publishing queue (`/api/internal/tick`) claiming posts with `FOR UPDATE SKIP LOCKED`.
- Realtime UI updates via Supabase Realtime subscriptions.
- Offline and local evaluation via `DATA_MODE=seed` and `DATA_MODE=mock`.

### Out of Scope (SRDS 2.2)
- TikTok, X (Twitter), LinkedIn, YouTube, Pinterest.
- AI image/video generation as core publishing requirements (only supplementary studio).
- E-commerce / storefront transactions.
- Multi-tenant enterprise agency team hierarchies.
- Native mobile applications (iOS/Android) — responsive web only.

---

## 4. Operating Rules & Guardrails

1. **Zero Secret Leakage**: No hardcoded secrets, API tokens, or URLs. All configuration is loaded from environment variables (`apps/web/.env.local`, `services/ai/.env`).
2. **Offline-First Modality**: All external integrations (Instagram, Facebook, LLM, email) implement `mock` or `seed` providers. Demos, unit tests, and CI runs never depend on live external APIs.
3. **No Web Scraping**: All data is ingested via official Meta Graph APIs, synthetic seed generators, or public datasets.
4. **Honest Attribution**: AI-generated content is clearly labeled with its originating model or fallback indicator. Simulated annealing on QUBO is described strictly as "quantum-inspired" and never "quantum".
5. **Human Gates**: Live Meta App registration, real account OAuth credentials, and third-party API keys require explicit developer input.
