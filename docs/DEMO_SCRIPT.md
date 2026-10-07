# DEMO_SCRIPT.md — Entangled Echo 8-Minute Demo

**Version**: 1.0 (2026-10-07)  
**Demo mode**: `DATA_MODE=seed`, `LLM_PROVIDER=mock` — fully offline, no external credentials needed.  
**Failure plan**: If live Meta fails mid-demo, nothing changes — the app is already in seed mode. If LLM fails, mock/template captions display automatically.

---

## Pre-Demo Checklist (10 minutes before)

```bash
# 1. Start AI service
cd /path/to/EntangledEcho
./services/ai/.venv/bin/uvicorn app.main:app --app-dir services/ai --port 8000 &

# 2. Start web app
pnpm --filter @ee/web dev &

# 3. Confirm both are up
curl http://localhost:8000/health    # → {"status":"ok"}
curl http://localhost:3000           # → HTML page

# 4. One-command demo reset (wipe + re-seed demo account deterministically)
./services/ai/.venv/bin/python scripts/seed/generate.py \
  --account-id acc_synthetic_01 --months 12 --posts-per-week 4 --seed 42
```

Verify the dashboard at `http://localhost:3000/dashboard` shows the seeded data (look for "Demo Data" badge on the account).

---

## Step 1 — Signup & Email Verification (0:00–0:45)

1. Navigate to `http://localhost:3000/signup`
2. Enter: name, email, password. Click **Create Account**.
3. **Expected**: "Check your email" confirmation screen appears.
4. In mock/seed mode, the email is logged to the AI service console — show the console output.
5. Confirm the verification link (or in demo: use the pre-verified demo account).

> **Demo data path**: Log in with the pre-seeded account at `/login` to skip email verification wait.

---

## Step 2 — Connect Account (0:45–1:30)

1. Navigate to **Settings → Social Accounts**.
2. Click **Connect Instagram**.
3. **Expected in seed mode**: A synthetic account `@echo_demo` with "Demo Data" badge connects instantly (no OAuth redirect).
4. Show the badge label: "Synthetic account — engagement patterns are simulated."

> **If using live mode (N2)**: Real OAuth redirect to Meta → authorize → returns to callback → account appears with real handle.

---

## Step 3 — Sync & Dashboard (1:30–2:30)

1. Click **Sync Now** on the connected account.
2. **Expected**: Toast "Sync complete — 287 posts ingested". Last sync timestamp updates.
3. Navigate to **Dashboard**.
4. **Expected**: KPI cards show total likes, comments, reach pulled from DB (not hardcoded numbers). Performance trend chart and engagement breakdown render from real DB queries.
5. Point out the "Demo Data" badge is visible throughout.

---

## Step 4 — Analytics Deep Dive (2:30–3:30)

1. Navigate to **Analytics**.
2. Show:
   - **KPI Cards**: total likes, comments, reach, average performance score — all from the seeded 287 posts.
   - **Engagement Heatmap** (7×24 grid): highest slots are Tuesday/Thursday evenings — matching the planted ground truth in `scripts/seed/truth.json`.
   - **Content Type Performance**: Reels > Carousel > Image (planted multipliers).
3. Click **Export CSV** → file downloads with correct columns (post_id, caption, likes, comments, reach, perf_score, posted_at).

---

## Step 5 — QUBO Optimizer (3:30–4:30)

1. Navigate to **Recommendations**.
2. Click **Optimize Schedule** (or equivalent generate button).
3. **Expected**: Loading state → result in ~2–4 seconds (benchmarked 2.21 s).
4. Show:
   - **Primary schedule**: 5 slots per week, respecting gap constraints and blackouts.
   - **3 Alternative schedules** with confidence percentages.
   - **Confidence disclaimer**: "Confidence reflects stability under data resampling, not guaranteed engagement lift."
   - **"low_data" flag** is absent (287 posts > 20 threshold).
5. Explain: "This is QUBO + classical simulated annealing — quantum-inspired, not a QPU run. QUBO format makes it portable to D-Wave hardware."

---

## Step 6 — Caption Recommendations (4:30–5:15)

1. On the Recommendations page, select **Caption** tab.
2. **Expected**: 3 caption drafts with hashtag sets based on top posts' topics and sentiment.
3. Point out:
   - Confidence shown as "based on 287 posts" — not a fabricated percentage.
   - Captions are editable drafts.
4. Click thumbs-up on one → feedback recorded → preference weight updated for next run.

---

## Step 7 — Calendar & Drag-and-Drop (5:15–6:00)

1. Navigate to **Calendar**.
2. **Expected**: Weekly view showing AI-recommended slots (colored by confidence tier: green/amber/red).
3. Drag an AI-recommended slot to a different time.
4. Click a slot → fill in caption, hashtags → **Schedule Post**.
5. **Expected**: Post appears in the calendar with status `SCHEDULED`.

---

## Step 8 — Auto-Publish & Notification (6:00–7:00)

1. Create a post scheduled 2 minutes from now (or use a pre-created one).
2. **Wait for `/internal/tick`** (fires every minute in production; in dev, call manually):
   ```bash
   curl -X POST http://localhost:3000/api/internal/tick \
     -H "Authorization: Bearer $INTERNAL_TICK_SECRET"
   ```
3. **Expected**: Post status changes `SCHEDULED → PUBLISHING → PUBLISHED`.
4. Navigate to **Notifications** → in-app notification: "Your post 'X' was published successfully."
5. Bell badge count increments.
6. Click **Mark all read** → badge clears.

---

## Step 9 — Admin Panel (7:00–7:45)

1. Log in with the admin account (pre-seeded).
2. Navigate to `/admin`.
3. Show user list.
4. Click **Suspend** on a test user → password re-authentication modal appears (SRDS 4.2.8).
5. Enter password → user suspended.
6. Log out → try to log in as suspended user → **Expected**: "Account suspended" error.

---

## Step 10 — CSV Export Wrap-up (7:45–8:00)

1. Return to **Analytics → Export CSV**.
2. Show the downloaded file opening in a spreadsheet — columns: post_id, platform, caption, media_type, likes, comments, shares, saves, reach, perf_score, posted_at.
3. Confirm no hardcoded numbers — all values are from the seeded DB.

---

## Failure Contingencies

| Failure | Recovery |
|---------|---------|
| Live Meta OAuth fails | Already in seed mode — no change needed |
| LLM API timeout | Mock provider auto-activates; template captions appear |
| AI service crash | Restart: `uvicorn app.main:app --app-dir services/ai --port 8000` |
| Web app crash | Restart: `pnpm --filter @ee/web dev` |
| DB connection lost | Supabase local: `npx supabase start` (if stopped) |

---

## One-Command Demo Reset

```bash
# Wipes the synthetic demo account data and re-seeds deterministically (seed=42)
./services/ai/.venv/bin/python scripts/seed/generate.py \
  --account-id acc_synthetic_01 --months 12 --posts-per-week 4 --seed 42
```

Run this before each demo to ensure a consistent starting state.

---

*Demo script version 1.0 — 2026-10-07. Tested in seed mode with DATA_MODE=seed, LLM_PROVIDER=mock.*
