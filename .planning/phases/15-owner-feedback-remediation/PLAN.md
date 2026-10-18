# Phase 15 Plan: Elimination of Hollow Features — Real Data Ingestion, Contrast Fixes & Anonymous Benchmarks

## Executive Summary
This phase addresses critical Owner Feedback to eliminate any feeling of hollowness in Entangled Echo:
1. **Text Color & Contrast Bug Fix**: Remove destructive dark-mode media query overrides that turn text white on white backgrounds. Establish a unified, tokenized light theme (primary `#373E3E`, high-contrast typography) with WCAG 2.1 AA validation executed in real Chromium (not jsdom).
2. **Real Data Ingestion (Official & Honest)**:
   - Official Meta OAuth with "Last synced at [timestamp]" badges, a functional "Sync Now" button, API rate limit awareness, and explicit notices for Meta-delayed metrics (24–48h).
   - Interactive Instagram profile/link paste invoking Meta Business Discovery via connected accounts, returning public data only with transparent disclaimers and explicit error handling for personal/private accounts. Zero scraping.
   - Comprehensive CSV & Instagram Data Export upload enabling creators to ingest their post history through the standard normalization pipeline.
3. **Cross-User Benchmarks**:
   - $K$-anonymized aggregation ($K \ge 20$) with zero account identifiers.
   - Per-user opt-in control (`benchmark_opt_in`), privacy policy documentation, and strict fallback to "Not enough data yet" when under the 20-account threshold.
4. **Verifiable Evidence Gate**:
   - Every deliverable is gated by raw captured output: real browser contrast logs, API payloads with redacted keys, and screenshots.

---

## Plan Breakdown

### Plan 15-01: Text Color Bug Fix & Real Browser Contrast Pass (WCAG 2.1 AA)
- **Goal**: Fix the white-on-white text bug, establish a coherent CSS variable/token system, and audit every page in real Chromium.
- **Tasks**:
  1. `apps/web/src/app/globals.css`:
     - Eliminate the uncontrolled `@media (prefers-color-scheme: dark)` root override that forced `--foreground: #ededed` onto light backgrounds.
     - Define standardized CSS custom properties for light theme:
       - `--primary: #373E3E`
       - `--primary-hover: #262b2b`
       - `--background: #f8fafc`
       - `--surface: #ffffff`
       - `--surface-card: #ffffff`
       - `--foreground: #18181b` (high contrast, >7:1 on white)
       - `--foreground-muted: #52525b` (high contrast, >4.5:1 on white)
       - `--border: #e4e4e7`
     - Keep dark theme strictly scoped to tokenized attributes (`[data-theme="dark"]`) so both background and foreground shift together.
  2. UI Component Contrast Audit:
     - Audit all components (`Sidebar`, `TopBar`, `Dashboard`, `Analytics`, `Recommendations`, `Calendar`, `Notifications`, `Settings`, `Admin`) to ensure they use tokenized colors and adhere to the project conventions:
       - Buttons: dark border `#373E3E`, on hover black background with white text.
       - Cards: 3 per row on desktop, hover shadow and subtle scale.
  3. Real Chromium Contrast Script (`scripts/verify_real_browser_contrast.ts`):
     - Launch headless Chromium (`/snap/bin/chromium`).
     - Navigate through all 10 routes: `/`, `/login`, `/signup`, `/dashboard`, `/analytics`, `/recommendations`, `/calendar`, `/notifications`, `/settings`, `/admin`.
     - Inject and execute `axe-core` to verify 0 color-contrast violations.
     - Measure and log computed color contrast ratios for headings, body text, buttons, and badges.
  4. Capture visual snapshots and browser output logs.

---

### Plan 15-02: Real Data Ingestion & Profile Link Paste (Business Discovery)
- **Goal**: Enable honest, live data sync with rate limiting and Meta Business Discovery lookup for public creator accounts.
- **Tasks**:
  1. Data Sync & Latency Indicators:
     - Add `last_synced_at` indicator to `TopBar`, `Dashboard`, and `Analytics`.
     - Implement "Sync Now" button calling `syncSocialAccountAction`.
     - Add 5-minute client/server throttle to protect Meta API rate limits.
     - Add persistent banner/badge labeling Meta insights delay:
       `"Note: Meta delays reach and impression insights by 24-48 hours. Recent metrics reflect real-time likes/comments only."`
  2. Instagram Profile Link / Handle Paste:
     - Build `CompetitorDiscoveryCard.tsx` on Analytics page.
     - Handle parsing: supports full URLs (`https://instagram.com/handle`, `https://www.instagram.com/handle/`), `@handle`, or plain `handle`.
     - Call `instagramProvider.businessDiscovery(token, ownAccountId, cleanHandle)`.
     - Clear disclaimers: `"Public data only; reach/impressions unavailable for external accounts."`
     - Graceful error states: detect personal accounts, private accounts, or invalid handles and display specific diagnostic guidance.
     - Zero scraping, zero third-party scrapers, zero browser automation.
  3. Unit & Integration Tests:
     - Test handle extraction regex with various URL formats.
     - Test Business Discovery query formation and error mapping.

---

### Plan 15-03: Post History CSV & Instagram Data Export Import
- **Goal**: Allow creators to upload their historical posts via CSV or Instagram Data Export and ingest them through the official normalization pipeline.
- **Tasks**:
  1. Importer Service (`apps/web/src/lib/providers/social/csv-importer.ts`):
     - Support CSV format with standard headers (`caption`, `media_type`, `posted_at`, `likes`, `comments`, `shares`, `saves`, `views`, `reach`).
     - Support Instagram JSON export structure (`posts_1.json` or `media.json`).
     - Pass parsed items directly through `normalizePost()`.
     - Upsert idempotently into `posts` and `engagement_metrics` with `source = 'csv_import'`.
  2. UI Upload Component (`apps/web/src/components/social/DataExportUploadModal.tsx`):
     - Accessible drag-and-drop modal on Settings and Analytics.
     - File validation (magic bytes / MIME type / extension `.csv`, `.json`).
     - Progress indicator, summary of imported posts, and instant refresh of analytics.
  3. Tests:
     - Test CSV parser with valid and malformed rows.
     - Verify idempotent DB insertion.

---

### Plan 15-04: Cross-User Aggregated Anonymous Benchmarks ($K \ge 20$)
- **Goal**: Implement privacy-preserving cross-user benchmarks with a 20-account threshold, user opt-in, and clear privacy documentation.
- **Tasks**:
  1. Schema & Migration:
     - Add `benchmark_opt_in boolean not null default false` to `profiles` (with fallback in code if migration pending).
  2. Benchmark Aggregator (`apps/web/src/lib/analytics/benchmarks.ts`):
     - Constant `MIN_BENCHMARK_ACCOUNTS = 20`.
     - Query count of opted-in accounts with post metrics.
     - If count $< 20$: return `{ available: false, count, required: 20 }`.
     - If count $\ge 20$: compute anonymized percentiles (median engagement rate, avg posts/week, format split) without any user/account identifiers.
  3. UI Card (`apps/web/src/components/analytics/CrossUserBenchmarkCard.tsx`):
     - On Analytics page:
       - Below threshold: render clean empty state: *"Not enough data yet (requires at least 20 opted-in accounts to compute anonymous benchmarks; currently {count} contributing)."*
       - Above threshold: render comparative percentile bars.
  4. Privacy Policy & Settings:
     - Add opt-in toggle on Settings (`/settings`).
     - Create `/privacy` page detailing benchmark aggregation methodology and $K$-anonymity guarantees.
  5. Document change in `docs/DEVIATIONS.md`.

---

## Verification & Done Criteria
- [ ] No white-on-white text across any page; real Chromium `axe-core` scan outputs 0 color-contrast violations.
- [ ] Sync Now button works, displays "last synced at", and throttle prevents rapid hammering.
- [ ] Profile link paste extracts handle and queries Business Discovery via Meta API; shows "public data only" and clear error on personal accounts.
- [ ] CSV/Instagram export file upload parses and ingests posts through normal normalization pipeline.
- [ ] Cross-user benchmarks strictly enforce $K \ge 20$ and show "Not enough data yet" when below threshold.
- [ ] Opt-in toggle works and `/privacy` page documents the benchmark policy.
- [ ] Raw outputs (axe logs, screenshots, API responses) captured and recorded.
- [ ] All web tests (40+) and AI tests (26+) pass.
