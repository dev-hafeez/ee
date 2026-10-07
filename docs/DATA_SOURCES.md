# DATA_SOURCES.md — Entangled Echo

Tracks every external dataset used in the project, per build plan rules.

## 1. Primary: Synthetic Data Generator

- **Location**: `scripts/seed/generate.py`
- **Output**: `scripts/seed/dataset.json` (500 historical posts), `scripts/seed/truth.json` (ground truth multipliers)
- **License**: N/A — generated internally
- **Schema**: Defined by the `posts` + `engagement_metrics` normalization path
- **Purpose**: Development, automated testing, benchmark evaluation, and offline demo
- **Notes**: A hidden ground-truth multiplier table (`scripts/seed/truth.json`) is planted with day/hour multipliers and content-type biases for evaluating optimizer recovery against known ground truth.

## 2. Live: Instagram/Facebook Graph API

- **Source**: Meta developer app (requires human setup — see Section 7 of build plan)
- **Data**: Post list, per-post insights (likes, comments, shares, saves, reach, views/impressions), audience demographics
- **License**: Subject to Meta Platform Terms
- **Consent**: Written consent required from any real account owner whose data is ingested
- **Current Status**: Development mode ready; live human credential handoff documented in `docs/DEVIATIONS.md`

## 3. Competitor Data

- **Source**: Business Discovery API (Meta) — public metrics only
- **What is available**: followers, media count, public likes, public comments
- **What is NOT available**: reach, impressions of competitor posts
- **License**: Subject to Meta Platform Terms

## 4. Supplementary Datasets

- **Status**: None ingested. External Kaggle / Hugging Face datasets were examined but excluded because none contain single-account posting-time ground truth with complete engagement snapshots necessary to validate the QUBO optimizer.

---

_Last updated: Phase N4 documentation reconciliation (2026-10-07)._
