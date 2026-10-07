# Entangled Echo — Agent Build Plan

Audience: an AI coding agent (Antigravity / Claude). Source of truth for requirements: `srdsfyp.pdf` (the SRDS). This file tells you HOW to build it, in order, and where it deliberately deviates from the SRDS.

---

## 0. Operating rules (read first)

1. Work phase by phase (Section 5). Do not start phase N+1 until phase N's "Done when" checks pass. Run the checks, show the output.
2. Never hardcode secrets, URLs, or tokens. All config via env vars (Section 8). Commit `.env.example` only.
3. Every external provider (Instagram, Facebook, LLM, email) sits behind an interface with a `mock` implementation. The app must run fully offline in mock mode. This is non-negotiable: Meta app review may never happen for this project, and demos must not depend on live APIs.
4. Meta/Instagram APIs changed a lot after the SRDS was written (API versions, deprecated metrics, renamed permissions). Before writing any Graph API code, fetch the CURRENT official docs (developers.facebook.com) and follow them over this file and over the SRDS. If they conflict, log it in `docs/DEVIATIONS.md`.
5. Keep a running `docs/DEVIATIONS.md`: every place the implementation differs from the SRDS, with a one-line reason. The students will use it to update the SRDS.
6. Do not claim features that are not built. If the UI mentions a model (XGBoost, DistilBERT, LightGBM) that is not implemented, remove the label.
7. Do not scrape Instagram or Facebook. Official APIs, datasets, and synthetic data only.
8. If a human-only step is needed (Section 7), stop and ask. Do not fake credentials.
9. Small commits per task. Tests with each phase. No giant rewrites.

---

## 1. Product in one paragraph

Web app for creators/small businesses. Connects Instagram + Facebook accounts (OAuth), ingests engagement data, analyzes captions/hashtags/media types/timing, recommends posting schedules via a QUBO-based quantum-inspired optimizer, generates caption/hashtag drafts with an LLM, decomposes high-level goals into post tasks, schedules and auto-publishes posts, shows analytics, and sends notifications.

Out of scope (SRDS 2.2): TikTok, X, LinkedIn, YouTube, image/video generation, e-commerce, multi-tenant agency workflows, native mobile. NOTE: the UI mockups (Settings page) show YouTube/TikTok/X/LinkedIn. Do NOT build those. Show only Instagram and Facebook in the UI.

---

## 2. Decisions that override or sharpen the SRDS

| #   | SRDS says                                                                       | Do this instead                                                                                                                                                         | Why                                                                                                                |
| --- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| D1  | Custom `/auth/register`, `/auth/login` routes, bcrypt cost 12, own JWT handling | Use Supabase Auth (`@supabase/ssr`). Keep thin BFF wrappers only where the SRDS route names matter.                                                                     | Supabase Auth does hashing, verification emails, resets, JWT. Cost factor is not configurable; note in DEVIATIONS. |
| D2  | "Serverless functions for the backend" + Python FastAPI                         | Deploy FastAPI as a container on a long-running host (Render/Railway/Fly.io). Next.js on Vercel.                                                                        | Optimization jobs and ML models do not fit serverless limits. Free tiers sleep: add a `/health` ping.              |
| D3  | "Simulated annealing" pseudocode swapping random slots (Alg. 1)                 | Formulate scheduling as a QUBO and solve with simulated annealing (`dwave-samplers`). See Section 6.1.                                                                  | Makes "quantum-inspired" technically defensible: QUBO is the native input format of quantum annealers.             |
| D4  | Alternatives via "perturbing primary schedule"                                  | Take top-k DISTINCT low-energy samples from the sampler.                                                                                                                | More principled, free from the solver.                                                                             |
| D5  | Custom WebSocket push                                                           | Supabase Realtime subscriptions on `optimization_jobs`, `notifications`, `scheduled_posts` rows.                                                                        | Same effect, no custom server.                                                                                     |
| D6  | Cron "every 24 h" and publish within 60 s                                       | `pg_cron` every minute calling a protected internal endpoint (`/internal/tick`) for publishing + reminders; daily sync via the same tick.                               | Vercel free cron is too coarse for the 60 s requirement.                                                           |
| D7  | Competitor `reach` / likes via `/user/{handle}/media`                           | Use Business Discovery (public data only). Reach and impressions are NOT available for other accounts. Competitor view = followers, media count, public likes/comments. | API limitation. Verify against current docs.                                                                       |
| D8  | ERD missing tables                                                              | Add `audience_snapshots`, `competitors`, `notification_preferences`; add `topics`, `sentiment` to `posts`; add `feedback` to `recommendations`.                         | Referenced by sequence diagrams SD-03, SD-07, SD-08 but absent from the ERD.                                       |
| D9  | Malware scan of uploads                                                         | Validate magic bytes + size limit, re-encode images with `sharp` (strips payloads), optional ClamAV container.                                                          | Pragmatic equivalent.                                                                                              |
| D10 | Engagement/impressions fields                                                   | Store `views` AND `impressions` columns nullable; populate whichever the API currently returns.                                                                         | `impressions` was being replaced by `views` in newer Graph API versions (verify).                                  |

---

## 3. Data sources (where the data comes from)

Build the data layer around a `SocialProvider` interface with three implementations, selected by `DATA_MODE=live|seed|mock`:

1. **`live` — Instagram/Facebook Graph API** (real data)
   - Requires: Instagram Business or Creator account linked to a Facebook Page; a Meta developer app.
   - Development mode works without app review for accounts that hold a role on the app (admin/developer/tester). That is enough for the FYP demo. Do not plan for public users.
   - Data: post list, per-post insights (likes, comments, shares, saves, reach, views/impressions), audience demographics (age, gender, location; only available above a minimum follower count, verify threshold), publishing.
   - Realistic account sources: the team's own accounts, the founders' agency client accounts (only with written consent), friendly test accounts.
2. **`seed` — synthetic data generator** (`scripts/seed/generate.ts` or Python). Primary source for development, tests, evaluation, and demo. See Section 6.4.
3. **`mock` — static fixtures** for unit tests and offline UI work.

Supplementary public datasets (optional, for sanity-checking the analysis pipeline only): search Kaggle and Hugging Face for "Instagram posts engagement dataset". Do not assume schema or license; inspect before use, and record the source in `docs/DATA_SOURCES.md`. These datasets rarely contain posting-time ground truth tied to one account, so they cannot validate the optimizer.

Competitor data: Business Discovery only (public metrics). No scraping.

---

## 4. Stack and repo layout

- Web: Next.js 14+ App Router, TypeScript, Tailwind CSS, shadcn/ui. No Bootstrap.
- AI service: Python 3.10+, FastAPI, pydantic v2, pandas, scikit-learn (TF-IDF), `dwave-samplers` (simulated annealing sampler) + `dimod`, a sentiment model (VADER for MVP; optionally a Hugging Face sentiment model).
- DB/Auth/Storage/Realtime: Supabase (Postgres 14+), migrations via Supabase CLI.
- LLM: provider-abstracted (`LLM_PROVIDER=anthropic|gemini|mock`), JSON-structured outputs validated with pydantic.
- Email: Resend or SMTP (abstracted; `mock` logs to console).

```
/apps/web                 Next.js app (UI, BFF route handlers)
  /src/app/(auth) (dashboard) analytics recommendations calendar notifications settings admin
  /src/app/api/...        BFF routes
  /src/lib/providers      social, email interfaces + live/mock impls
  /src/lib/crypto         AES-256-GCM token encryption
/services/ai              FastAPI app
  /app/api/v1/...         routers
  /app/analysis /optimizer /recommender /decomposer /llm
  /tests
/supabase/migrations      SQL migrations (schema + RLS)
/scripts/seed             synthetic data generator
/docs                     DEVIATIONS.md, DATA_SOURCES.md, EVALUATION.md
```

UI conventions (from the owner's preferences):

- Layout reference: SRDS Figures 3-2 to 3-7 (sidebar nav: Dashboard, Analytics, Recommendations, Calendar, Notifications, Settings; top bar with search, Generate button, notification bell, avatar).
- Card grids: 3 per row on desktop, responsive down to 1. Cards scale slightly with a shadow on hover.
- Buttons: black border; on hover black background with white text.
- Primary color `#373E3E`, defined as a CSS variable/Tailwind token. The mockups are dark-themed with purple accents; keep their layout, but check contrast (WCAG 2.1 AA is an SRDS requirement). `#373E3E` works as a primary on light surfaces; it is too low-contrast as an accent on a dark background. Build light theme first; add dark via tokens.

---

## 5. Phases

Each phase: Goal, Tasks, Done when. FR/UC IDs reference the SRDS.

### Phase 1 — Scaffold

Goal: empty but runnable monorepo.

- Create layout from Section 4. Set up ESLint, Prettier, TypeScript strict, `ruff` + `pytest` for Python.
- `docker-compose.yml` for the AI service (+ local Supabase via CLI documented in README).
- `.env.example` with every variable from Section 8.
- GitHub Actions: lint + test for both apps.
  Done when: `pnpm dev` serves a blank page, `uvicorn` serves `/health`, CI is green.

### Phase 2 — Database, RLS, seed hook

Goal: schema from Section 9, migration-controlled.

- Write migrations for all tables in Section 9, indexes on `(user_id)`, `(account_id)`, `(posted_at)`.
- RLS on every user-scoped table (pattern in Section 9). Add `is_admin()` security-definer function.
- Write RLS tests (SQL or pgTAP): user A cannot read or write user B's rows on every table.
  Done when: all migrations apply from scratch; RLS test suite passes.

### Phase 3 — Auth, profiles, admin (FR-01..06, UC01, UC10)

- Email/password signup with required email verification; Google OAuth login via Supabase; password reset.
- `profiles` row auto-created by trigger on `auth.users` insert. Roles: `user`, `admin`.
- Profile page (display name, bio).
- Admin panel `/admin`: list users, suspend, delete. Destructive actions require re-authentication (re-enter password) per SRDS 4.2.8.
- Auth rate limiting: Postgres table `auth_attempts(ip, at)`; block an IP after 10 failures in 15 min (SRDS 4.2.5). Supabase's built-in limits stay on as well.
- Middleware protects all app routes; admin routes check role server-side.
  Done when: signup→verify→login→logout works; non-admin gets 403 on `/admin`; suspended user cannot log in; rate limit test passes.

### Phase 4 — Social account connection (FR-07, FR-08, UC02)

- `SocialProvider` interface: `getAuthUrl`, `exchangeCode`, `refreshToken`, `fetchPosts`, `fetchPostInsights`, `fetchAudience`, `publish`, `businessDiscovery`.
- `MockProvider` and `LiveInstagramProvider` / `LiveFacebookProvider` (live follows current Meta docs; OAuth with PKCE where supported).
- Callback route stores tokens encrypted with AES-256-GCM (`TOKEN_ENC_KEY`, 32 bytes) in `social_accounts.access_token_enc`. Tokens never reach the browser.
- Token refresh job (long-lived Instagram tokens expire and must be refreshed before expiry; verify rules in docs). Mark account `status='needs_reauth'` and notify on failure.
- Settings page: connect/disconnect Instagram and Facebook only.
  Done when: in `mock` mode connecting creates an account row; in `live` mode (human-assisted) a real test account connects; DB inspection shows encrypted token; unit test proves decrypt(encrypt(x)) = x and that ciphertext differs per call.

### Phase 5 — Data ingestion and normalization (FR-09..12)

- Normalize provider payloads into `posts` + `engagement_metrics` (unified schema). Idempotent upserts on `(account_id, external_id)`.
- Metrics are stored as time-series snapshots (`collected_at`), because engagement grows over time; analysis uses the latest snapshot at least 48h after posting (document the window as a config constant).
- Manual sync: `POST /api/data/sync {accountId}`. Automatic: daily via `/internal/tick`.
- Dashboard shows `last_sync` (FR-12). Retain at least 12 months (FR-11): no deletion jobs.
- Seed generator (Section 6.4) writes through the same normalization path so it exercises real code.
- Performance: sync of 500 posts under 5 minutes (SRDS 4.1.6). Batch inserts.
  Done when: seeded account of 500 posts loads; re-sync creates no duplicates; sync timing test recorded in `docs/EVALUATION.md`.

### Phase 6 — Content analysis service (FR-13..16, UC03 backing)

FastAPI `POST /api/v1/analyze`:

- Topics: TF-IDF over captions (top terms per post and per account). Sentiment: VADER (or HF model). Media type classification: from API field (Image/Video/Carousel/Story/Reel); Stories are not retrievable after expiry, so only store what the API gives.
- Hashtag clusters: co-occurrence counts; cluster by simple community detection or top co-occurring sets.
- Performance score (FR-16): see Section 6.2. Weights are config, not hardcoded.
- Persist `perf_score`, `topics`, `sentiment` on `posts`.
- Insights endpoint: top posts, top hashtags, best slots (raw, before optimization).
  Done when: analysis of the seeded account returns insights; unit tests cover score function and edge cases (zero reach, null metrics).

### Phase 7 — Quantum-inspired optimizer (FR-17..20, UC06)

Implement exactly per Section 6.1.

- `POST /api/v1/optimize` creates/uses an `optimization_jobs` row, runs in a background task, writes `result`, sets status. Frontend subscribes via Realtime.
- Constraints: blackout windows, platforms, max posts/week, minimum gap hours (FR-18).
- Output: primary schedule + 3 alternatives + confidence per slot and per schedule (FR-19, FR-20).
- 30-day horizon, 5 accounts in under 10 s (SRDS 4.1.3): measure and record.
  Done when: unit tests pass (constraint satisfaction always holds; blackout slots never chosen); benchmark vs exact/greedy recorded (Section 10).

### Phase 8 — Recommendations and task decomposition (FR-21..24, UC04, UC07)

- `POST /api/v1/recommend {type: caption|schedule|content_type}` per Algorithm 2: top 20 posts → patterns → LLM prompt (topics + niche + top hashtag clusters) → 3 caption drafts + hashtag sets. `schedule` reads the latest finished optimization job. `content_type` ranks media types by mean perf score with the underlying numbers as reasoning.
- LLM output must be JSON validated by pydantic; on invalid output retry once, then fall back to template captions built from top topics. Captions are drafts only, always editable.
- Feedback loop (FR-24): `PATCH /recommendations/:id {accepted, feedback}`. Learning mechanism for MVP: maintain per-account preference weights (hashtag clusters, media types, tone tags) updated from accepted/rejected items and applied as a re-ranking factor and as prompt hints. Document honestly as "preference re-ranking", not model retraining.
- `POST /api/v1/decompose {goal, platform, dateRange}` → list of tasks (`type`, `description`, `media_type`, `due_date`, `priority`). Validate dates inside range, cap task count, bulk insert into `tasks`, link to a `content_strategies` row. A task can convert to a `scheduled_posts` draft.
- Confidence scores shown with every recommendation; define how they are computed (Section 6.3).
- Response time under 5 s for captions (SRDS 4.1.4): stream or cap tokens.
  Done when: mock LLM run produces valid objects for all three types; real LLM run works with a key; feedback changes ranking in a test.

### Phase 9 — Scheduling and auto-publishing (FR-25..28, UC05)

- Calendar page: weekly view, drag-and-drop (use `@dnd-kit`), existing slots + AI-recommended slots (colored by confidence).
- Create scheduled post: caption, hashtags, media upload to Supabase Storage (validated per D9), time. Status machine: `DRAFT → SCHEDULED → PUBLISHING → PUBLISHED | FAILED | CANCELLED` (SRDS 5.5). Enforce transitions in one function; reject illegal ones.
- Publisher in `/internal/tick` (every minute): select due posts with `FOR UPDATE SKIP LOCKED`, set `PUBLISHING`, call provider `publish`. Instagram publishing is container-create then publish and needs a publicly reachable media URL; the app holds the schedule itself because the API has no native scheduling for Instagram. Facebook Page posts can use native `scheduled_publish_time`; simplest is to use the same internal publisher for both. Verify limits (daily publish cap) in current docs.
- Retry: 3 attempts, exponential back-off, store `last_error`, final failure → `FAILED` + notification (FR-27/28).
- Publishing triggered within 60 s of scheduled time (SRDS 4.1.5): test with fake clock.
  Done when: in mock mode a post scheduled 2 minutes ahead publishes; forced provider failure retries 3 times then notifies; double-tick does not publish twice (idempotency test).

### Phase 10 — Analytics and reporting (FR-29..32, UC03, UC09)

- Trends: daily/weekly/monthly aggregation via SQL views or RPC. Charts with Recharts. KPI cards, engagement heatmap (day × hour), content type performance, age/gender/country panels.
- Audience: `fetchAudience` → `audience_snapshots`.
- Competitor view: Business Discovery data per D7. Show clearly what is public-only.
- CSV export: stream from server for a date range.
- Dashboard load under 3 s on seeded data (SRDS 4.1.1).
  Done when: every chart renders from DB data (no hardcoded numbers anywhere in components; grep for literals like `284,750`), CSV opens in a spreadsheet with correct columns.

### Phase 11 — Notifications (FR-33..35, UC08)

- In-app: `notifications` rows + Realtime toast + bell badge + page with mark-read.
- Reminder 30 min before a scheduled post; publish success/failure; milestone detection (define thresholds in config: e.g. follower or per-post reach thresholds); AI insight notifications after an optimization finishes.
- Weekly email digest, Monday 8:00 in user's timezone (store `profiles.timezone`). Users may opt out per type (`notification_preferences`).
  Done when: preferences are respected in tests (opted-out type produces no row/email); digest renders in mock email.

### Phase 12 — Hardening, NFRs, evaluation, docs

- Security checklist from SRDS 4.2: confirm each item with a test or a written justification. HTTPS only, security headers, no secrets in client bundle (grep build output), server-side-only provider calls.
- Accessibility pass (keyboard nav, contrast, labels). Run axe on main pages.
- Load test REST CRUD at 100 concurrent users, target p95 < 500 ms (k6). Record results; if the free-tier host cannot meet it, say so in `docs/EVALUATION.md` rather than hiding it.
- Onboarding flow: connect accounts and explain features.
- Dockerfile for AI service (SRDS 4.3.3); `/api/v1` versioned routes.
- Write `README.md` (setup, modes, env), `docs/EVALUATION.md` (Section 10 results), update `docs/DEVIATIONS.md`.
  Done when: all items above have recorded evidence.

---

## 6. Algorithms

### 6.1 Schedule optimizer (QUBO)

Time grid: slots `s = (day_of_week, hour)` for 7 × 24 = 168 per platform. For multi-week horizons, either optimize one representative week and repeat/adjust by blackout dates, or index slots by date (default: representative week, then expand to dates and drop blackouts, then re-solve only if blackouts removed chosen slots).

Slot score `v_s` (estimated expected performance if posting in slot s):

- Compute mean `perf_score` of historical posts in slot s (use the account's last 90 days, fall back to 12 months if sparse).
- Apply shrinkage because data are sparse: `v_s = (n_s * mean_s + k * prior_s) / (n_s + k)`, where `prior_s` = average of the day-of-week marginal mean and the hour-of-day marginal mean (or the global mean if those are also empty), and `k` is a config constant (start with 3). Slots with no data get the prior.
- Normalize `v` to [0, 1].

Binary variables `x_s ∈ {0,1}` (and per platform if multiple platforms: `x_{p,s}`).

Minimize: `E(x) = -Σ v_s x_s + A (Σ x_s - K)^2 + B Σ_{(i,j) conflict} x_i x_j`

- `K` = posts per week target (user constraint or default).
- Conflict pairs = slots on the same day closer than `min_gap_hours` (and optionally same-hour across platforms if configured).
- Blackout slots: fix `x_s = 0` (remove variable).
- Choose `A` and `B` larger than the largest possible score gain from violating them (e.g. `A = B = 2 * max(v) * K`); unit-test that returned solutions are feasible.

Solve: `dimod.BinaryQuadraticModel` + `dwave.samplers.SimulatedAnnealingSampler`, `num_reads=200`, fixed seed in tests. Post-filter infeasible samples. Take top-4 distinct feasible samples by energy: first = primary schedule, rest = alternatives (FR-19).

Confidence (FR-20): bootstrap. Resample historical posts with replacement 30 times, recompute `v`, re-solve, then

- slot confidence = fraction of bootstraps that selected that slot;
- schedule confidence = mean of its slots' confidence.
  State in the UI that confidence reflects stability of the recommendation under data resampling, not a probability of success.

Cold start: if the account has fewer than a configurable minimum of posts (e.g. 20), return the prior-based schedule with a clearly labeled "low data" flag.

Naming honesty: this is a classical simulated-annealing solver on a quantum-annealing-compatible formulation. Call it "quantum-inspired" (as the SRDS does) and never "quantum". The SRDS mention of "variational optimization" is not implemented; do not claim it.

### 6.2 Performance score (FR-16)

`engagement = likes*w_l + comments*w_c + shares*w_sh + saves*w_sv` (defaults e.g. 1, 3, 5, 4; config, labeled as assumptions).
`perf_score_raw = engagement / max(reach, 1)` (fall back to followers at post time if reach missing).
Then percentile-normalize within the account (0–1) so scores are comparable across accounts and platforms. Null-safe for every field.

### 6.3 Recommendation confidence

- Schedule recs: Section 6.1 bootstrap confidence.
- Content-type recs: 1 − normalized width of the bootstrap 80% interval of the mean score difference vs. account average; show sample size `n` next to it.
- Caption recs: no statistical confidence exists. Show "based on N top posts" instead of a fake percentage. If the UI needs a number, derive it only from data volume and say so.

### 6.4 Synthetic data generator

Purpose: development data AND a ground-truth test bed.

- Parameters: account id, start date, months (default 12), posts/week, seed.
- Plant a hidden "truth" table: per `(day, hour)` multiplier (a few peak slots, e.g. weekday evening), per media type multiplier (Reels > Carousel > Image), hashtag-cluster multiplier, slow follower growth, noise (log-normal).
- Generate posts at times drawn from a mix of the account's habitual times, so not all slots have data (realistic sparsity).
- Output goes through the Phase 5 normalization path.
- Save the truth table in `/scripts/seed/truth.json`. Evaluation compares optimizer output to it (Section 10).
- Mark synthetic accounts (`social_accounts.is_synthetic = true`) and show a "demo data" badge in the UI.

---

## 7. Human-only tasks (stop and ask)

1. Create Meta developer app; add Instagram + Facebook Login products; set redirect URIs; add test users/roles.
2. Convert test Instagram account to Business/Creator and link to a Facebook Page.
3. Create Supabase project; supply URL, anon key, service role key.
4. Provide LLM API key.
5. Choose hosting; create Vercel project and the AI service host.
6. Obtain written consent from any real account owner whose data is ingested.
7. Provide email provider key (or accept `mock`).

---

## 8. Environment variables (`.env.example`)

```
DATA_MODE=seed                # live | seed | mock
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=    # server only
TOKEN_ENC_KEY=                # 32 random bytes, base64
INTERNAL_TICK_SECRET=         # shared secret for /internal/tick
AI_SERVICE_URL=
AI_SERVICE_SECRET=            # BFF -> FastAPI auth header
META_APP_ID=
META_APP_SECRET=
META_REDIRECT_URI=
META_GRAPH_VERSION=           # set from current docs, never hardcode in code
LLM_PROVIDER=mock             # anthropic | gemini | mock
LLM_API_KEY=
EMAIL_PROVIDER=mock
EMAIL_API_KEY=
EMAIL_FROM=
```

---

## 9. Database

Auth users live in `auth.users`; `profiles` extends them (replaces the SRDS `users` table).

```sql
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text, bio text,
  role text not null default 'user' check (role in ('user','admin')),
  suspended boolean not null default false,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now()
);

create table social_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  platform text not null check (platform in ('instagram','facebook')),
  external_id text not null, handle text,
  access_token_enc text not null, token_expiry timestamptz,
  last_sync timestamptz, status text not null default 'active',
  is_synthetic boolean not null default false,
  unique (user_id, platform, external_id)
);

create table posts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references social_accounts on delete cascade,
  external_id text not null, caption text, hashtags text[] default '{}',
  media_type text check (media_type in ('image','video','carousel','story','reel')),
  permalink text, posted_at timestamptz not null,
  perf_score real, topics text[] default '{}', sentiment real,
  unique (account_id, external_id)
);

create table engagement_metrics (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts on delete cascade,
  likes int, comments int, shares int, saves int, reach int,
  views int, impressions int,
  collected_at timestamptz not null default now()
);

create table audience_snapshots (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references social_accounts on delete cascade,
  captured_at timestamptz not null default now(),
  age jsonb, gender jsonb, location jsonb
);

create table competitors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  platform text not null, handle text not null,
  metrics jsonb, last_fetched timestamptz,
  unique (user_id, platform, handle)
);

create table scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  account_id uuid not null references social_accounts on delete cascade,
  caption text, hashtags text[] default '{}',
  media_path text, media_type text,
  scheduled_at timestamptz not null,
  status text not null default 'DRAFT'
    check (status in ('DRAFT','SCHEDULED','PUBLISHING','PUBLISHED','FAILED','CANCELLED')),
  retry_count int not null default 0, next_retry_at timestamptz,
  platform_post_id text, last_error text, task_id uuid
);

create table optimization_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  account_id uuid not null references social_accounts on delete cascade,
  horizon_days int not null, constraints jsonb not null default '{}',
  status text not null default 'PENDING'
    check (status in ('PENDING','RUNNING','DONE','FAILED')),
  result jsonb, error text,
  created_at timestamptz default now(), finished_at timestamptz
);

create table recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  account_id uuid references social_accounts on delete cascade,
  job_id uuid references optimization_jobs,
  type text not null check (type in ('caption','schedule','content_type')),
  content jsonb not null, confidence real,
  accepted boolean, feedback text, created_at timestamptz default now()
);

create table content_strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  goal text not null, platform text, start_date date, end_date date
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid not null references content_strategies on delete cascade,
  description text not null, media_type text, due_date timestamptz,
  priority int default 0, status text not null default 'todo',
  scheduled_post_id uuid references scheduled_posts
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  type text not null, channel text not null default 'in_app',
  message text not null, is_read boolean not null default false,
  sent_at timestamptz not null default now()
);

create table notification_preferences (
  user_id uuid primary key references profiles on delete cascade,
  in_app boolean default true, email_digest boolean default true,
  milestones boolean default true, post_reminders boolean default true
);

create table auth_attempts (ip inet not null, at timestamptz not null default now());
```

RLS pattern (generate the equivalent for every table):

```sql
alter table scheduled_posts enable row level security;
create policy own_rows on scheduled_posts
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- tables scoped via account:
alter table posts enable row level security;
create policy own_posts on posts using (
  exists (select 1 from social_accounts a
          where a.id = posts.account_id and a.user_id = auth.uid()));

create function is_admin() returns boolean language sql security definer as
$$ select exists (select 1 from profiles where id = auth.uid() and role = 'admin') $$;
```

Admin actions that need cross-user access go through server-side code with the service role, never through client RLS bypass. Never expose `access_token_enc` to the client: create a view without it for client queries, or revoke column select.

---

## 10. Evaluation (required deliverable, `docs/EVALUATION.md`)

Report results honestly, including negative ones.

1. **Optimizer correctness on synthetic ground truth**: run on seeded accounts with several random seeds; measure overlap between chosen slots and the planted top-K slots, and the ratio of achieved true-multiplier sum to the optimum.
2. **Solver vs baselines**: compare QUBO+SA against (a) random feasible schedule, (b) greedy top-K with gap constraint, (c) exact solution by brute force/ILP on a reduced instance. Report score, time. If greedy matches SA on the unconstrained problem (plausible: the search space of 168 slots is small), say so and show the cases with tight constraints where SA helps or does not. Do not tune the experiment until SA wins.
3. **Backtest on real data** (if any real account): train on the earliest ~80% of history, check whether posts that landed in recommended slots in the held-out 20% performed better than the rest. This is correlation on small samples, not proof of causal uplift; state that. A causal claim would need a live A/B comparison over several weeks.
4. **NFR measurements** with numbers: dashboard load, API p95, optimization time, caption latency, sync time, publish punctuality.
5. **Limitations section**: cold start, API restrictions (competitor reach, demographics threshold), development-mode Meta access, LLM output variability.

---

## 11. Global definition of done

- All FR-01..FR-35 mapped to code and tests in a table (`docs/TRACEABILITY.md`: FR id → file(s) → test).
- Runs end-to-end in `seed` mode with one command sequence in the README.
- No hardcoded demo numbers in UI components. No secrets in repo or client bundle.
- `docs/DEVIATIONS.md` complete and each deviation justified.
