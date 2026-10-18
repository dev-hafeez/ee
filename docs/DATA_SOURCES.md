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

## 4. Public Sentiment Training Benchmark Dataset

- **Dataset**: Sanders Twitter Sentiment Corpus (Niek Sanders)
- **Source**: `https://raw.githubusercontent.com/zfz/twitter_corpus/master/full-corpus.csv`
- **Cached Location**: `services/ai/data/sanders_twitter_sentiment.csv`
- **Trained Model Artifact**: `services/ai/app/analysis/sentiment_classifier.joblib`
- **Size & Distribution**: 5,113 total tweets; 3,424 valid sentiment-labeled texts (519 positive, 572 negative, 2,333 neutral). Discarded 1,689 'irrelevant' non-sentiment rows.
- **Split**: 80% stratified training split ($N = 2,739$), 20% held-out test split ($N = 685$).
- **License**: Public academic / open research benchmark license.
- **Methodological Integrity**: Trained strictly on real, hand-labeled human tweets. **Not** trained on the synthetic generator's data, strictly avoiding circular evaluation.
- **Evaluation**: Evaluated on the held-out test set against the rule-based VADER baseline; full accuracy and macro F1 numbers recorded in `docs/EVALUATION.md`.

---

_Last updated: Scope addition reconciliation (2026-10-17)._
