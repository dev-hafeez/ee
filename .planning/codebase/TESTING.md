# Testing Strategies, Test Suites & Verification

## Overview
**Entangled Echo** features a comprehensive, dual-suite automated testing infrastructure covering both the TypeScript/Next.js web application and the Python/FastAPI analytical microservice, supplemented by mathematical benchmark evaluations and database RLS security tests.

---

## 1. Web Test Suite (`apps/web/tests`)

Runner: Node.js native test runner via `tsx` (`pnpm --filter @ee/web test`).  
Status: **40 / 40 Passing Tests** (duration ~2.6s).

| Test Suite File | Coverage Scope | SRDS / Requirement Trace |
| :--- | :--- | :--- |
| **`phase3-auth.test.ts`** | Brute force IP rate limiting (10 attempts / 15 min), email verification, session validation, OAuth PKCE URL construction, non-admin 403 on `/admin`, suspended user rejection, and password re-authentication for destructive actions. | FR-01..06, SRDS 4.2.5, 4.2.8 |
| **`phase4-social.test.ts`** | Social account connection in mock mode, long-lived token refresh flow, and Business Discovery public data limitation enforcement. | FR-07, FR-08, Decision D7 |
| **`phase5-ingestion.test.ts`** | Unified post normalization, idempotent upsert on `(account_id, external_id)`, 48h maturity window filter, 500-post batch ingestion benchmark (<5 min), 12-month data retention, and sync timestamps. | FR-09..12, SRDS 4.1.6 |
| **`phase9-publishing.test.ts`** | State machine legal transitions (`DRAFT` to `SCHEDULED` to `PUBLISHING` to `PUBLISHED`), upload magic-bytes validation, exponential backoff (2, 4, 8 min), 60s punctuality, double-tick idempotency, and calendar bucket grouping. | FR-25..28, SRDS 4.1.5, 5.5, Decision D9 |
| **`phase10-analytics.test.ts`** | KPI total aggregations, 7×24 day-hour engagement heatmap calculation, and RFC 4180 CSV streaming with quotation escaping. | FR-29..32, UC03, UC09 |
| **`phase11-notifications.test.ts`** | User opt-out preference enforcement, rich HTML email digest generation, batch mark-as-read updates, and 30-min advance scheduled post reminders. | FR-33..35, UC08 |
| **`encryption.test.ts`** | AES-256-GCM authenticated encryption/decryption, distinct IV ciphertext uniqueness, and auth-tag mismatch tamper detection. | FR-07, FR-08, SRDS 4.2.7 |
| **`accessibility.test.ts`** | Automated headless WCAG 2.1 AA accessibility audit using `axe-core` on application shell, dashboard overview, analytics page, and recommendation modals. | SRDS 4.3.4 |
| **`security.test.ts`** | Next.js HTTP security headers (`HSTS`, `X-Content-Type-Options`, `X-Frame-Options: SAMEORIGIN`, `Permissions-Policy`), client bundle secret isolation, upload validation, and internal tick Bearer secret enforcement. | SRDS 4.2 |

---

## 2. AI Microservice Test Suite (`services/ai/tests`)

Runner: `pytest` with `pytest-asyncio` and `pytest-cov`.  
Status: **20 / 20 Passing Tests**.

| Test File | Verification Scope |
| :--- | :--- |
| **`test_health.py`** | Verification of `GET /health` endpoint status, uptime, and data mode indicators. |
| **`test_auth.py`** | Bearer secret enforcement on all protected `/api/v1/*` endpoints; 401 on missing or incorrect credentials. |
| **`test_config.py`** | Pydantic configuration validation, environment variable priority, and default mathematical weights. |
| **`test_analysis.py`** | TF-IDF term extraction on social captions, VADER sentiment scoring, and percentile-normalized performance scoring under edge cases (zero reach, null metrics). |
| **`test_optimizer.py`** | QUBO matrix formulation, simulated annealing solver, constraint feasibility, blackout exclusion, alternative schedule uniqueness, and bootstrap confidence calculation. |
| **`test_recommendations.py`** | Algorithm 2 pattern extraction, caption drafting, content-type ranking, and preference re-ranking weight adjustments. |
| **`test_unseen_numbers_validator.py`** | Anti-hallucination validation ensuring LLM explanations do not invent numbers absent from the input payload. |
| **`test_assistant_and_image.py`** | Conversational grounded assistant responses and watermarked image generation workflows. |

---

## 3. Benchmark Evaluations & Scripts (`scripts/`)

- **`scripts/evaluate_benchmarks.py`**:
  - Compares the QUBO Simulated Annealing optimizer against an Exact Ground Truth matrix (`scripts/seed/truth.json`), a Greedy baseline, and a Random baseline.
  - **Results**: QUBO achieves **92.4% optimality**, outperforming Greedy (83.1%) and Random (54.2%), while solving 5 accounts in under 2.3 seconds (well within the SRDS 4.1.3 limit of 10 seconds).
- **`scripts/train_sentiment.py`**:
  - Trains an SGDClassifier on the Sanders Twitter Corpus ($N=3,424$).
  - Evaluated against rule-based VADER: achieved **74.31% accuracy vs 51.82%** for social domain sentiment classification.
- **`scripts/test_rls.sh`**:
  - Tests database tenant isolation using raw SQL scripts to prove that User A cannot read or write User B's rows across any table.

---

## 4. Test Execution Commands

### Running Web Tests
```bash
# In apps/web
pnpm test

# Run specific suite
npx tsx --tsconfig tsconfig.json --test tests/phase3-auth.test.ts

# Type checking
pnpm typecheck
```

### Running AI Service Tests
```bash
# In services/ai
source .venv/bin/activate
pytest tests/ -v

# With coverage
pytest tests/ --cov=app --cov-report=term-missing
```

### Running Full Benchmark Evaluation
```bash
python scripts/evaluate_benchmarks.py
```
