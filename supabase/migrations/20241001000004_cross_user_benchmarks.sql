-- ── 18. Cross-User Benchmarks & Opt-In (Phase 15) ───────────────────────────
-- Extends profiles with benchmark_opt_in flag for anonymous aggregated analytics
alter table profiles add column if not exists benchmark_opt_in boolean not null default false;

-- Create index to quickly count opted-in accounts
create index if not exists idx_profiles_benchmark_opt_in on profiles (benchmark_opt_in);
