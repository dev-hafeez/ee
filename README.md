# Entangled Echo

AI-powered social media content optimizer and scheduling system. Built with Next.js (App Router, Tailwind CSS, TypeScript), Python FastAPI (QUBO quantum-inspired optimizer via Simulated Annealing, NLP content analysis), and Supabase (PostgreSQL, Auth, Realtime, Storage).

---

## Architecture Overview

```
EntangledEcho/
├── apps/
│   └── web/                   # Next.js 16 (React 19, TypeScript, Tailwind CSS)
│       ├── src/app/           # App router: (auth), (dashboard), admin, api
│       └── src/lib/           # Providers (social, email), crypto, Supabase
├── services/
│   └── ai/                    # FastAPI microservice (Python 3.12)
│       ├── app/api/v1/        # Endpoints: analyze, optimize, recommend, decompose
│       ├── app/optimizer/     # QUBO quantum-inspired scheduler (dimod + dwave-samplers)
│       ├── app/analysis/      # TF-IDF topics, sentiment (VADER), performance scoring
│       └── tests/             # Pytest test suite
├── supabase/
│   └── migrations/            # PostgreSQL migrations + Row Level Security (RLS)
├── scripts/
│   └── seed/                  # Synthetic ground-truth data generator
└── docs/                      # DEVIATIONS.md, DATA_SOURCES.md, EVALUATION.md
```

---

## Getting Started

### Prerequisites

- **Node.js**: >= 20.x
- **pnpm**: >= 9.x
- **Python**: >= 3.10 (3.12 recommended)
- **uv** or **pip** / **venv**
- **Docker** and **docker-compose** (optional, for containerized AI service)
- **Supabase CLI**: for local database and auth (`npx supabase`)

---

### 1. Environment Setup

Copy `.env.example` to `.env.local` for the web app and `.env` for the AI service:

```bash
cp .env.example apps/web/.env.local
cp .env.example services/ai/.env
```

Review and adjust variables according to your environment. By default, `DATA_MODE=seed` and `LLM_PROVIDER=mock`, allowing full offline execution without external API keys.

---

### 2. Web App Setup (Next.js)

```bash
# Install monorepo dependencies
pnpm install

# Run type check and lint
pnpm run typecheck
pnpm run lint

# Start Next.js development server
pnpm run dev
```

The web dashboard is served at `http://localhost:3000`.

---

### 3. AI Service Setup (Python FastAPI)

#### Option A: Local Virtual Environment

```bash
cd services/ai
uv venv .venv --python python3.12
source .venv/bin/activate
uv pip install -r requirements-dev.txt ruff

# Run tests
pytest

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```

#### Option B: Docker Compose

```bash
docker compose up ai --build
```

Health check endpoint: `http://localhost:8000/health`.

---

### 4. Supabase Setup (Local Development)

To run Supabase locally using the Supabase CLI:

```bash
# Initialize and start local Supabase containers (Postgres, Auth, Storage, Realtime)
npx supabase start

# Apply database migrations
npx supabase db reset
```

This will output the local API URL, anon key, and service role key to put into your `.env.local`.

---

## Quickstart: Run End-to-End in Seed Mode (Single Sequence)

Entangled Echo can run completely offline in `seed` mode with zero external credentials or cloud dependencies:

```bash
# 1. Setup environment configurations
cp .env.example apps/web/.env.local
cp .env.example services/ai/.env

# 2. Install workspace dependencies
pnpm install

# 3. Generate synthetic ground-truth dataset (Section 6.4)
./services/ai/.venv/bin/python scripts/seed/generate.py --account-id acc_synthetic_01 --months 12 --posts-per-week 4 --seed 42

# 4. Launch AI Microservice (port 8000) and Next.js Web App (port 3000)
./services/ai/.venv/bin/uvicorn app.main:app --app-dir services/ai --port 8000 &
pnpm --filter @ee/web dev
```

Visit `http://localhost:3000` to access the interactive dashboard, explore the 5-step guided onboarding at `/onboarding`, launch the QUBO scheduler at `/recommendations`, or manage scheduled posts at `/calendar`.

---

## Operating Modes

Entangled Echo uses a decoupled multi-provider architecture selectable via `DATA_MODE`:

1. **`seed` (Default)**: Uses synthetic accounts with planted ground-truth engagement patterns (`scripts/seed/truth.json`) for realistic development, evaluation, and demonstrations.
2. **`mock`**: In-memory static fixtures for fast, deterministic unit testing and offline UI work.
3. **`live`**: Direct integration with official Meta Instagram Graph API and Facebook Pages via OAuth 2.0 with AES-256-GCM token encryption.

---

## Verification & Testing Suites

All 35 Functional Requirements (FR-01 through FR-35) are backed by automated tests:

```bash
# Run Web Application Test Suite (23 automated unit/integration tests)
pnpm --filter @ee/web test

# Run Python AI Service Test Suite (18 automated tests: analysis, QUBO, recommender)
./services/ai/.venv/bin/pytest services/ai/tests

# Run Comprehensive Evaluation Benchmark Suite (QUBO vs Baselines & NFRs)
./services/ai/.venv/bin/python scripts/evaluate_benchmarks.py

# Run k6 Concurrency Load Test (100 VUs)
k6 run tests/load/k6_load_test.js
```

---

## Development Scripts

| Command                 | Description                           |
| ----------------------- | ------------------------------------- |
| `pnpm run dev`          | Start Next.js web application         |
| `pnpm run build`        | Build Next.js production bundle       |
| `pnpm run lint`         | Run ESLint across monorepo            |
| `pnpm run typecheck`    | Run TypeScript check (`tsc --noEmit`) |
| `pnpm run test`         | Run all web and security test suites  |
| `pnpm run format`       | Format code with Prettier             |
| `pnpm run format:check` | Verify formatting with Prettier       |

---

## Documentation

- [`docs/TRACEABILITY.md`](docs/TRACEABILITY.md): Full Requirements Traceability Matrix mapping FR-01 through FR-35 to code files and test suites.
- [`docs/EVALUATION.md`](docs/EVALUATION.md): Empirical evaluation report (synthetic ground truth overlap, solver vs baselines, and NFR latencies).
- [`docs/DEVIATIONS.md`](docs/DEVIATIONS.md): Comprehensive justification for architectural enhancements (D1 through D23).
- [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md): Data provenance and privacy guidelines.
