# DATA_SOURCES.md — Entangled Echo

Tracks every external dataset used in the project, per build plan rules.

## 1. Primary: Synthetic Data Generator

- **Location**: `scripts/seed/generate.ts` (Phase 5)
- **License**: N/A — generated internally
- **Schema**: Defined by the `posts` + `engagement_metrics` normalization path (Phase 5)
- **Purpose**: Development, testing, evaluation, and demos
- **Notes**: A hidden truth table (`scripts/seed/truth.json`) is planted for evaluating the optimizer

## 2. Live: Instagram/Facebook Graph API

- **Source**: Meta developer app (requires human setup — see Section 7 of build plan)
- **Data**: Post list, per-post insights (likes, comments, shares, saves, reach, views/impressions), audience demographics
- **License**: Subject to Meta Platform Terms
- **Consent**: Written consent required from any real account owner whose data is ingested

## 3. Competitor Data

- **Source**: Business Discovery API (Meta) — public metrics only
- **What is available**: followers, media count, public likes, public comments
- **What is NOT available**: reach, impressions of competitor posts
- **License**: Subject to Meta Platform Terms

## 4. Optional Supplementary Datasets (not yet used)

- Kaggle / Hugging Face: "Instagram posts engagement dataset"
- **Status**: Not yet inspected — do NOT assume schema or license
- **Instructions**: If used, inspect license first, record exact source here, note limitations
  (these datasets rarely contain posting-time ground truth tied to a single account)

---

_Last updated: Phase 1 scaffold. Update this file whenever a new dataset is introduced._
