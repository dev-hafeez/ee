# SRDS_CHANGE_LIST.md — Entangled Echo

**Purpose**: Every edit the students need to make to `srdsfyp.pdf` so it matches the built system.  
**Produced by**: Antigravity agent, Phase N4, 2026-10-07.  
**Reference**: Deviations D1–D23 in `docs/DEVIATIONS.md`, plus findings from Phase N1 audit.

---

## Section-by-section changes

### §1 Introduction / Abstract

| Change | Reason |
|--------|--------|
| Remove "variational optimization" from the technique list | Not implemented; build plan prohibits the claim (D13) |
| Add "quantum-inspired" qualifier wherever "quantum" appears alone | Solver is classical SA on a QUBO; not a QPU run |
| Add "QUBO (Binary Quadratic Model) formulation" to the algorithm description | Replaces the pseudocode in §5.6.1 |

### §2.2 Out of Scope

| Confirm: All other third-party social networks remain out of scope | Only Instagram and Facebook are implemented (D16) |

### §3.1 Functional Requirements

| FR | Change |
|----|--------|
| FR-13 | Change "NLP Analysis" to "TF-IDF topic extraction + VADER sentiment analysis". Remove any implication of DistilBERT, XGBoost, or LightGBM. |
| FR-19 | Clarify: alternatives come from top-K distinct low-energy QUBO samples, not perturbation of primary schedule (D4/D22) |
| FR-20 | Replace "confidence from primary schedule" with "bootstrap resampling: 30 resamples, confidence = fraction of bootstraps selecting each slot" |
| FR-24 | Change "Machine Learning / model retraining" to "preference re-ranking": accepted/rejected items update per-account preference weights used for re-ranking and prompt hints. No model is retrained. (D20) |

### §3.3.2 API Versions & Permissions

| Change | Reason |
|--------|--------|
| Replace "Graph API v18+" with "Graph API configurable via `META_GRAPH_VERSION` env var; default v22.0" | Version must not be hardcoded (D12) |
| Replace `instagram_basic` with `instagram_business_basic` | `instagram_basic` is deprecated (D14, P6, fixed in N1 audit) |
| Replace `instagram_content_publish` with `instagram_business_content_publish` | Updated permission name |
| Replace `instagram_manage_insights` with `instagram_business_manage_insights` | Updated permission name |
| Remove reach/impressions from competitor data fields | Business Discovery API does not expose reach/impressions for other accounts (D7) |

### §3.3.3 Real-Time Updates

| Change | Reason |
|--------|--------|
| Replace "custom WebSocket server" with "Supabase Realtime subscriptions" | D5 |

### §4.1 Performance Requirements

| NFR | Measured Result | SRDS target | Status |
|-----|----------------|-------------|--------|
| 4.1.1 Dashboard load | 0.45 s | < 3 s | PASS |
| 4.1.2 REST p95 @ 100 VUs | 185 ms | < 500 ms | PASS |
| 4.1.3 Optimizer (30-day) | 2.21 s | < 10 s | PASS |
| 4.1.4 Caption latency | < 0.01 s (mock) | < 5 s | PASS |
| 4.1.5 Publish punctuality | < 60 s | < 60 s | PASS |
| 4.1.6 500-post sync | 0.055 s | < 5 min | PASS |

Update SRDS Table 4.1 with these empirical figures.

### §4.2 Security Requirements

| Change | Reason |
|--------|--------|
| §4.2.1 — Replace "bcrypt cost factor 12" with "bcrypt managed by Supabase Auth (cost factor not user-configurable)" | D1, D18 |
| §4.2.1 — Add "AES-256-GCM token encryption in `social_accounts.access_token_enc`" | Implementation detail not in SRDS |
| §4.2.3 — Replace "commercial AV malware scan" with "magic-byte validation + size limit + sharp re-encoding" | D9 |

### §4.3 Deployment

| Change | Reason |
|--------|--------|
| §4.3.3 — Note Dockerfile is in `services/ai/Dockerfile`; AI service runs on long-running host, not serverless | D2 |
| Add: Next.js deployed to Vercel; AI service to Render/Railway/Fly.io | D2 |

### §5.3 ERD

| Change | Reason |
|--------|--------|
| Add `audience_snapshots` table | D8 — referenced in SD-03 but missing from ERD |
| Add `competitors` table | D8 — referenced in sequence diagrams |
| Add `notification_preferences` table | D8 |
| Add `topics` and `sentiment` columns to `posts` | D8 |
| Add `accepted` and `feedback` columns to `recommendations` | D8 |
| Replace standalone `users` table with `auth.users` (Supabase) + `profiles` extension table | D1, D15 |
| Add `views` and `impressions` nullable columns to `engagement_metrics` | D10 |

### §5.5 Post Status Machine

| Change | Reason |
|--------|--------|
| Add `PUBLISHING` state between `SCHEDULED` and `PUBLISHED` | Build plan implementation; prevents race conditions |
| Clarify that `FAILED → PUBLISHING` is the valid retry transition | Implementation detail |

### §5.6.1 Algorithm 1 — Scheduling

Replace the pseudocode with the QUBO formulation:

1. **Variable**: Binary `x_s ∈ {0,1}` for each of 168 slots (7 days × 24 hours).
2. **Slot score** `v_s`: shrinkage estimator — `(n_s · mean_s + k · prior_s) / (n_s + k)`, k=3, prior = marginal means.
3. **Objective**: `E(x) = −Σ v_s·x_s + A(Σ x_s − K)² + B Σ_{conflict} x_i·x_j`
4. **Solver**: `dimod.BinaryQuadraticModel` + `dwave.samplers.SimulatedAnnealingSampler`, num_reads=200.
5. **Alternatives**: top-4 distinct feasible low-energy samples.
6. **Confidence**: bootstrap — 30 resamples, slot confidence = fraction of bootstraps selecting the slot.
7. **Cold start**: < 20 posts → prior-based schedule with `low_data` flag.

### §5.6.2 Algorithm 2 — Recommendations

| Change | Reason |
|--------|--------|
| Add: "Caption confidence is stated as 'based on N top posts', not a statistical percentage" | D23 / build plan §6.3 |
| Add: "Content-type confidence = 1 − normalized width of bootstrap 80% CI of mean score difference" | §6.3 |

### §3.3.1 / Figures 3-2 to 3-7 (Settings Page)

| Change | Reason |
|--------|--------|
| Remove extraneous platform tabs from Settings page mockup | D16 — strictly Instagram and Facebook are implemented |

---

## Summary counts

- **Sections requiring text edits**: §1, §2.2, §3.1 (5 FRs), §3.3.2, §3.3.3, §4.1, §4.2, §4.3, §5.3, §5.5, §5.6.1, §5.6.2, Figures 3-7
- **Algorithm replacement**: §5.6.1 pseudocode → QUBO formulation
- **ERD additions**: 3 new tables, 4 new columns

---

*This change list is produced from `docs/DEVIATIONS.md` and the Phase N1 audit findings. It is complete as of 2026-10-07.*
