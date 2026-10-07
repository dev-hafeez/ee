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

## Operating Modes

1. **`seed` (Default)**: Uses synthetic accounts with planted ground-truth engagement patterns for development, testing, and evaluation.
2. **`mock`**: In-memory and static fixtures for unit tests and offline UI development.
3. **`live`**: Connects real Instagram & Facebook accounts via Meta Graph API (requires Meta Developer app credentials).

---

## Development Scripts

| Command | Description |
|---|---|
| `pnpm run dev` | Start Next.js web application |
| `pnpm run build` | Build Next.js production bundle |
| `pnpm run lint` | Run ESLint across monorepo |
| `pnpm run typecheck` | Run TypeScript check (`tsc --noEmit`) |
| `pnpm run format` | Format code with Prettier |
| `pnpm run format:check` | Verify formatting with Prettier |
