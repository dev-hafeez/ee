# DEFENSE_QA.md — Entangled Echo FYP Defense Preparation

**Source**: Generated from real results in `docs/EVALUATION.md` and `docs/VERIFICATION.md`.  
**Date**: 2026-10-07  
**Rule**: Every answer is backed by evidence. No invented or assumed results.

---

## Q1: What is "quantum-inspired" here, and what is NOT quantum?

**Honest answer**:

The scheduling problem is formulated as a **QUBO (Quadratic Unconstrained Binary Optimization)** using the `dimod` library from D-Wave. QUBO is the native input format of actual D-Wave quantum annealers (Advantage QPU series).

The **solver** in this implementation is `dwave.samplers.SimulatedAnnealingSampler` — a **classical** CPU-based simulated annealing algorithm. It approximates the QUBO ground state stochastically. No quantum hardware or QPU is used.

"Quantum-inspired" means:
- The problem is formulated in a quantum-annealing-compatible representation (QUBO/BQM).
- The same formulation can be submitted to a D-Wave QPU without algorithmic reformulation (only a hardware adapter would need to change).
- The solver mimics the annealing process classically.

"Not quantum" means:
- No qubits, superposition, entanglement, or tunneling is involved.
- Execution is on a standard CPU.
- The SRDS term "variational optimization" was **not implemented** and is not claimed anywhere.

**Evidence**: `services/ai/app/optimizer/qubo_solver.py`, `docs/EVALUATION.md` Section 2, `docs/DEVIATIONS.md` D3/D13.

---

## Q2: Why QUBO for a 168-slot problem? Does it beat greedy?

**Honest answer**:

On the representative weekly grid (168 slots, K=5, min_gap=4 h), the empirical results are:

| Method | Score | Time |
|--------|-------|------|
| Greedy Top-K | 4.13 | 0.08 ms |
| QUBO + SA | 3.34 | 561 ms |
| Exact | 4.13 | 803 ms |

**Greedy matches the exact optimum on this instance.** QUBO+SA scores lower and is slower.

**Why QUBO is still justified:**

1. **FR-19 compliance**: The SRDS requires 3 alternative schedules. Greedy outputs a single deterministic schedule. The SA sampler returns multiple distinct low-energy states from one call, naturally providing diverse alternatives with different trade-offs.
2. **Formulation portability**: QUBO BQM is the input format of D-Wave QPUs. If the account history grows very large, slots become correlated, or constraints become dense (tight blackouts, multiple platforms), the QUBO formulation scales to quantum hardware without reimplementation.
3. **Under tight constraints**: When the feasible set is small (many blackouts, short gaps), greedy may fail to find K feasible slots; SA's stochastic search continues to explore. This is not yet measured empirically on tight-constraint instances — it is a theoretical property.

**What we do NOT claim**: That QUBO+SA produces better schedules than greedy on the current instance. The data say otherwise. This is documented plainly.

**Evidence**: `docs/EVALUATION.md` Section 2, `scripts/evaluate_benchmarks.py`.

---

## Q3: How do you know recommendations improve engagement?

**Honest answer**: We do not have causal evidence.

The backtest in `docs/EVALUATION.md` Section 3 shows an 80/20 temporal train/test split on historical synthetic posts: posts landing in recommended slots scored 0.72 vs 0.46 in other slots (normalized performance score). This is **observational correlation on synthetic data**, not proof of causal uplift.

**What would be needed for causal evidence**:
- A live multi-week A/B experiment
- Post content held constant between test and control conditions
- Publishing times randomized by group
- Engagement measured after ≥ 48 hours per post

None of this was done — the app is not yet in production with real users. The backtest is the best evidence available within the scope of an FYP prototype.

**Evidence**: `docs/EVALUATION.md` Section 3 (causal disclaimer explicitly stated).

---

## Q4: Cold start, sparse data, and how shrinkage handles it

**Honest answer**:

When an account has fewer than 20 historical posts (configurable), the optimizer returns a `low_data: true` flag and a prior-based schedule.

For accounts with more posts but sparse slot coverage, shrinkage is applied:

```
v_s = (n_s × mean_s + k × prior_s) / (n_s + k)
```

- `n_s` = number of posts observed in slot s
- `mean_s` = mean performance score in slot s
- `prior_s` = average of the day-of-week marginal mean and hour-of-day marginal mean (falls back to global mean if those are also empty)
- `k = 3` (config constant — heavier weight on prior when n_s is small)

This is a Bayesian shrinkage estimator. When `n_s = 0` (no observations), `v_s = prior_s`. When `n_s >> k`, `v_s ≈ mean_s`. The prior prevents over-confidence in lucky outlier slots.

**Ablation**: Shrinkage vs no-shrinkage was not empirically run in this FYP cycle. It is a documented future experiment.

**Evidence**: `services/ai/app/optimizer/qubo_solver.py::compute_slot_scores`, `docs/EVALUATION.md` Section 1.

---

## Q5: Meta API limits and why live access is development-mode only

**Honest answer**:

Meta's developer program distinguishes between:
- **Development mode**: The app can access data from accounts that hold a role on the app (admin, developer, tester). No App Review needed. This is sufficient for the FYP demo.
- **Live mode / App Review**: Required to access data from any public user. Requires Meta to review the app, privacy policy, and business verification.

For the FYP, Meta App Review was not pursued because:
1. The demo uses a test account added as a tester on the Meta developer app.
2. The app runs in `DATA_MODE=seed` for all non-live demonstrations.
3. App Review requires a production deployment, privacy policy, and business registration — post-graduation concerns.

**What this means**: The live OAuth path is implemented and works for the team's test accounts. It is not available to arbitrary public users. This is documented in `docs/DEVIATIONS.md` and `docs/VERIFICATION.md`.

**Evidence**: `docs/DEVIATIONS.md` D2, `docs/VERIFICATION.md` Section 12 Limitation #4.

---

## Q6: Privacy and consent — what data is stored, how tokens are protected, how a user deletes their data

**Data stored**:
- `profiles`: display_name, bio, timezone, role (from `auth.users`)
- `social_accounts`: platform, handle, encrypted token (`access_token_enc` — AES-256-GCM), token expiry
- `posts` + `engagement_metrics`: post captions, hashtags, performance metrics — only for accounts the user connected
- `audience_snapshots`: aggregated demographic distributions (no individual user data)
- `scheduled_posts`, `optimization_jobs`, `recommendations`, `tasks`, `notifications`: all scoped to user_id

**Token protection**:
- Tokens are encrypted with AES-256-GCM before DB storage (`TOKEN_ENC_KEY` env var, 32 bytes)
- Plaintext tokens never reach the browser, never appear in logs, never stored unencrypted
- Ciphertext includes a fresh random IV per encryption — identical tokens produce different ciphertexts

**Disconnect / delete**:
- Disconnect: removes `social_accounts` row (and cascades to posts/metrics via FK)
- Delete account: requires re-authentication (SRDS 4.2.8), then deletes `auth.users` row which cascades via trigger to `profiles` and all user-scoped data

> **Known gap**: A formal "delete my data" user-facing flow (e.g., a Settings button that triggers cascade deletion) was not explicitly implemented as a UI feature. The DB cascade is wired, but the UI flow is not verified by a test. This should be built before any production launch.

**Evidence**: `supabase/migrations/20241001000000_initial_schema.sql` (ON DELETE CASCADE), `apps/web/src/lib/crypto/encryption.ts`, `docs/VERIFICATION.md` Section 4.

---

## Q7: What was built with an AI agent, what was verified by the team?

**Built by Antigravity agent (AI)**:
- All source code (Next.js web app, FastAPI AI service, SQL migrations, test files, documentation)
- The entire monorepo structure, CI configuration, Docker setup

**Verified by the team (humans)**:
- Code review of generated code (the team should review all files)
- The demo run itself (humans operate the app)
- Any live Meta API testing (requires human Meta account setup)

**Verified independently (by this audit)**:
- Test suites re-run with real output (not copy-pasted): 36/36 web, 20/20 AI
- RLS isolation: `bash scripts/test_rls.sh` → 13/13 tables PASS
- Benchmark re-run: `python scripts/evaluate_benchmarks.py` → output captured
- Secret scan: grep on source tree and build output
- Hardcoded data scan: found and fixed one instance

**What the agent cannot verify**: live Meta API behavior, actual end-user engagement outcomes, subjective caption quality.

---

## Q8: Future work (parked commercial milestones)

The following are **intentionally deferred** until after the FYP defense. They are architecturally possible but not started:

1. **Multi-platform expansion**: TikTok, X, LinkedIn, YouTube — out of scope per SRDS §2.2. The `SocialProvider` interface is designed for extension.
2. **SaaS billing & subscriptions**: Stripe integration, usage tiers, team workspaces.
3. **D-Wave QPU adapter**: A `DWaveSampler` + `EmbeddingComposite` implementation to submit BQMs to actual quantum hardware (D-Wave Leap free tier). See stretch goal in Phase N plan.
4. **Production Meta App Review**: Needed for public user access. Requires business registration and privacy policy review.
5. **Real A/B engagement testing**: Causal validation of recommendation quality with live users.
6. **Model retraining**: Upgrade from preference re-ranking to actual LLM fine-tuning on accepted/rejected feedback.

---

## One-Page Results Summary

| Category | Result |
|----------|--------|
| FRs implemented | 35/35 |
| Web tests | 36/36 PASS |
| AI service tests | 20/20 PASS |
| Python coverage | 74% (business logic 83–100%) |
| RLS isolation | 13/13 tables PASS |
| Secret leaks | 0 (scan clean) |
| Hardcoded demo data | Found 1 instance → FIXED |
| Dashboard load | 0.45 s (target < 3 s) |
| REST p95 @ 100 VUs | 185 ms (target < 500 ms) |
| Optimizer (30-day) | 2.21 s (target < 10 s) |
| 500-post sync | 0.055 s (target < 5 min) |
| QUBO vs Greedy | Greedy matches exact on 168-slot loose-constraint instance; QUBO provides alternatives (FR-19) |
| Ground-truth recovery | Mean 61% of theoretical optimum across 5 seeds |
| Live Meta integration | Development-mode only (no App Review) |
| Caption confidence | Stated as "based on N posts" — no fabricated % |

---

*This document was generated from real audit results on 2026-10-07. Answers are honest; limitations are stated without softening.*
