# EVALUATION.md — Entangled Echo

Results are recorded honestly, including negative ones. Populated as each phase completes.

---

## 1. Optimizer Correctness on Synthetic Ground Truth

_Status: Pending — Phase 7_

Methodology:

- Run optimizer on seeded accounts with several random seeds
- Measure overlap between chosen slots and planted top-K slots
- Measure ratio of achieved true-multiplier sum to optimum

Results: _To be filled in Phase 7_

---

## 2. Solver vs Baselines

_Status: Pending — Phase 7_

Baselines:

- (a) Random feasible schedule
- (b) Greedy top-K with gap constraint
- (c) Exact solution (brute force/ILP) on reduced instance

Metric: score, time, constraint satisfaction rate

Results: _To be filled in Phase 7_

---

## 3. Backtest on Real Data

_Status: Pending — Phase 10 (only if real account available)_

Note: This is correlation on small samples, not proof of causal uplift. A causal claim would require a live A/B comparison over several weeks.

Results: _To be filled if real data is available_

---

## 4. NFR Measurements

_Status: Pending — Phase 12_

| NFR                                                  | Target   | Actual | Notes |
| ---------------------------------------------------- | -------- | ------ | ----- |
| Dashboard load (SRDS 4.1.1)                          | < 3 s    | _TBD_  |       |
| REST API p95 under 100 concurrent users (SRDS 4.1.2) | < 500 ms | _TBD_  |       |
| Optimizer: 30-day horizon, 5 accounts (SRDS 4.1.3)   | < 10 s   | _TBD_  |       |
| Caption recommendation (SRDS 4.1.4)                  | < 5 s    | _TBD_  |       |
| Publish within scheduled time (SRDS 4.1.5)           | < 60 s   | _TBD_  |       |
| Sync 500 posts (SRDS 4.1.6)                          | < 5 min  | _TBD_  |       |

---

## 5. Limitations

- **Cold start**: Accounts with fewer than 20 posts get prior-based schedules with a "low data" warning
- **API restrictions**: Competitor reach/impressions unavailable via Meta API (Business Discovery only)
- **Demographics threshold**: Instagram audience demographics require a minimum follower count (verify at Phase 4)
- **Development-mode Meta access**: Demo runs with development-mode tokens; no Meta app review planned
- **LLM output variability**: Caption generation depends on external LLM; mock fallback available
- **Free-tier hosting**: AI service on free-tier containers may have cold-start latency exceeding NFR targets

---

_Last updated: Phase 1 scaffold. Update with actual measurements each phase._
