# Technology Stack & Dependencies

## Overview
**Entangled Echo** is structured as a monorepo containing a modern Next.js 16 web application / BFF and a Python 3.12 FastAPI microservice hosting quantum-inspired optimization and ML routines, backed by Supabase (PostgreSQL 15+, Auth, Storage, and Realtime).

---

## 1. Web Application (`apps/web`)

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js (App Router, Turbopack) | `16.4.0` | Server Components, BFF Route Handlers, Server Actions |
| **Runtime / UI** | React / React DOM | `19.3.0` | Concurrent rendering, Server Actions, React `cache()` |
| **Language** | TypeScript | `^5.6.3` | Strict type safety, shared interfaces |
| **Styling** | Tailwind CSS / Turbopack | `^4.0.0` | Utility CSS, CSS variables, zero runtime styling |
| **Backend Integration** | `@supabase/ssr` | `^0.5.2` | Cookie-based SSR session management, middleware auth |
| **Client Database** | `@supabase/supabase-js` | `^2.46.1` | PostgREST queries, Realtime subscriptions, Storage |
| **Icons / UI** | Native Unicode & SVG | Custom | Ultra-lightweight, zero dependency icon design |
| **Drag & Drop** | Native HTML5 Drag/Drop | Browser | Visual content calendar slot scheduling |

### Web Dev Dependencies & Tooling
- `typescript` (`^5.6.3`) — Strict mode type checking (`tsc --noEmit`)
- `eslint` (`^9.0.0`) & `eslint-config-next` (`16.4.0`) — Code linting
- `prettier` (`^3.3.3`) & `prettier-plugin-tailwindcss` (`^0.6.9`) — Formatting
- `tsx` (`^4.23.15`) — Fast TypeScript execution for unit test runner
- `axe-core` (`^4.14.0`) & `jsdom` (`^30.1.2`) — Headless automated WCAG 2.1 AA accessibility testing

---

## 2. AI Microservice (`services/ai`)

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework** | FastAPI | `0.115.4` | High-performance asynchronous REST API (`/api/v1`) |
| **ASGI Server** | Uvicorn (standard) | `0.32.0` | Production HTTP server with uvloop and httptools |
| **Language** | Python | `3.12+` | Modern type hints, pattern matching, async/await |
| **Data Validation** | Pydantic / Pydantic Settings | `2.9.2` / `2.6.1` | Schema validation, env loading, unseen numbers validator |
| **HTTP Client** | HTTPX | `0.27.2` | Async external provider calls (Anthropic, Gemini, Meta) |
| **Quantum Formulation**| `dimod` | `0.12.17` | Binary Quadratic Model (BQM / QUBO) construction |
| **QUBO Solver** | `dwave-samplers` | `1.3.0` | Classical Simulated Annealing solver (`SimulatedAnnealingSampler`) |
| **Machine Learning** | Scikit-learn | `1.5.2` | TF-IDF vectorization, feature extraction, linear classifiers |
| **Data Analysis** | Pandas | `2.2.3` | Historical metrics aggregation, time-series transformations |
| **Sentiment Analysis** | VADER Sentiment | `3.3.2` | Rule-based social sentiment scoring compound metrics |
| **Database Client** | `supabase-py` | `2.9.1` | Server-to-server operations and background job state updates |

### AI Service Tooling
- `pytest` (`8.3.3`) & `pytest-asyncio` (`0.24.0`) — Test suite runner
- `pytest-cov` (`6.0.0`) — Code coverage tracking
- `ruff` — Blazingly fast Python linter and code formatter
- Docker container based on `python:3.12-slim`

---

## 3. Database & Cloud Infrastructure

| Component | Technology | Version / Specification | Details |
| :--- | :--- | :--- | :--- |
| **Database** | PostgreSQL | `15+` (Hosted Supabase) | 14 relational tables, triggers, indexes, JSONB fields |
| **Security Layer** | Row-Level Security (RLS) | PostgreSQL Native | User tenancy isolation with `is_admin()` definer function |
| **Token Encryption** | AES-256-GCM | Node.js `crypto` | 32-byte authenticated token encryption for Meta OAuth |
| **Authentication** | Supabase Auth | Native GoTrue | Email/password, verification workflows, Google OAuth |
| **File Storage** | Supabase Storage | S3-compatible | Media asset storage for scheduled posts |
| **Realtime Push** | Supabase Realtime | PostgreSQL CDC | Webhook/WebSocket push on `optimization_jobs` & `notifications` |
| **Background Tick** | Next.js API Route | `/api/internal/tick` | Atomic `FOR UPDATE SKIP LOCKED` publisher & reminder queue |

---

## 4. Monorepo Management & Environment

- **Workspace Manager**: `pnpm@12.9.1` workspaces (`pnpm-workspace.yaml`)
- **Package Hoisting**: Isolated sub-project node modules with shared root configs
- **Configuration Hygiene**: Strict separation of public and secret env variables:
  - `apps/web/.env.local` — Next.js client and server environment
  - `services/ai/.env` — AI microservice runtime configuration
  - `.env.example` — Committed reference manifest of all required variables
