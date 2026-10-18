# Current Project State & Operational Context

**Project**: Entangled Echo  
**Last Updated**: October 2026  
**Current Milestone**: Milestone 2.0 In Progress  
**Active Phase**: Phase 15 — Production Authenticity & High-Contrast Design (Owner Feedback Remediation)  
**Status**: Completed & Verified (Evidence Captured)

---

## 1. System Health & Verification Status

| Dimension | Metric | Status | Evidence |
| :--- | :--- | :---: | :--- |
| **Web Test Suite** | 45 / 45 passing | **100% Pass** | `tsx --test tests/*.test.ts` (Phase 3..15 + NFRs) |
| **AI Python Suite**| 26 / 26 passing | **100% Pass** | `pytest tests/` (QUBO, NLP, LLM, anti-hallucination) |
| **Type Integrity** | TypeScript strict | **0 Errors** | `tsc --noEmit` across all apps |
| **Real Browser Contrast** | WCAG 2.1 AA | **0 Violations (12/12 pages)** | Playwright + Chromium (`/snap/bin/chromium`) + `axe-core` |
| **Solver Benchmark**| Optimality vs Ground Truth | **92.4%** | `scripts/evaluate_benchmarks.py` |
| **Sentiment Accuracy**| Sanders Twitter Corpus | **74.31%** | `scripts/train_sentiment.py` (vs VADER 51.82%) |
| **Warm Page Load** | Local dev latency | **0.22s** | Turbopack + React `cache()` + staleTimes |

---

## 2. Locked Architecture Decisions (D1 .. D28)

| ID | Decision Summary | Rationale |
| :--- | :--- | :--- |
| **D1** | Supabase Auth (`@supabase/ssr`) instead of custom JWT handling | Native password resets, email verification, session refresh. |
| **D2** | Long-running container (FastAPI) instead of serverless functions | ML models and QUBO annealer exceed serverless execution limits. |
| **D3** | QUBO formulation solved via `dwave-samplers` `SimulatedAnnealingSampler` | Native input format of quantum annealers makes "quantum-inspired" technically defensible. |
| **D4** | Top-K distinct low-energy samples for alternative schedules | Principled selection without arbitrary perturbation heuristics. |
| **D5** | Supabase Realtime CDC push instead of custom WebSocket server | Subscriptions on `optimization_jobs`, `notifications`, `scheduled_posts`. |
| **D6** | Protected `/api/internal/tick` queue instead of coarse cron | Sub-minute publishing punctuality requirement (< 60s). |
| **D7** | Public Business Discovery API only for competitor benchmarking | Competitor private reach/impressions are unavailable per Meta policy. |
| **D8** | Expanded schema (14 tables vs SRDS 7 tables) | Added `audience_snapshots`, `competitors`, `tasks`, etc. to support sequence diagrams. |
| **D9** | Magic-byte upload validation and size limits | Pragmatic open-source equivalent for media upload security. |
| **D10**| Nullable `views` and `impressions` columns | Accommodates evolving Meta Graph API metric deprecations. |
| **D11-D15** | Supabase `auth.users` + `profiles` extension model | Clean BaaS tenancy without duplicating auth tables. |
| **D16**| Restrict UI strictly to Instagram and Facebook | Out-of-scope platforms (TikTok, X, YouTube, LinkedIn) omitted. |
| **D17-D19**| Transparent NFR evaluation logging | Measurements recorded honestly in `docs/EVALUATION.md`. |
| **D20**| "Preference re-ranking" label instead of "model retraining" | Honest technical attribution for user feedback weighting. |
| **D21**| Empirical Bayesian shrinkage with fallback priors | Robust performance scoring even on sparse or new creator accounts. |
| **D22**| Always return alternative schedules | Superior UX for creator schedule flexibility. |
| **D23**| Honest NLP labeling (TF-IDF + VADER/SGD) | No claiming unsupported models (DistilBERT/XGBoost). |
| **D24**| Calibrated penalty weights ($A = 1.25 \max(v)$, $B = 2.0 \max(v)$) | Prevents freezing into suboptimal local minima during simulated annealing. |
| **D25**| Watermarked AI Image Studio with 10 image/day rate limit | Supplemental creative studio for social media post previews. |
| **D26**| Grounded AI Assistant with Unseen Numbers Validator | Grounded exclusively in user analytics with strict anti-hallucination checks. |
| **D27**| Sanders Sentiment Model ($N=3,424$) | Trained on public hand-labeled social sentiment corpus. |
| **D28**| Cross-User Anonymized Benchmarks Guardrail ($K \ge 20$) | Real aggregation only; strictly displays "Not enough data yet" when under 20 accounts. Opt-in toggle in Settings. |

---

## 3. Active Runtime Environment

- **Next.js Web App**: Turbopack dev server on `http://localhost:3000`.
- **FastAPI AI Service**: Uvicorn on `http://localhost:8000`.
- **Database**: Hosted Supabase PostgreSQL 15+ (`fqcbhmkcannaqdwarbel.supabase.co`).
- **Data Mode**: Configured via `DATA_MODE=seed` (default) with toggle to `live` or `mock`.
- **LLM Provider**: Configured via `LLM_PROVIDER=mock|gemini|anthropic`.
