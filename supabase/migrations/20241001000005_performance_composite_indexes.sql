-- Performance Composite Indexes
-- Speeds up queries on posts, accounts, and optimization jobs by eliminating in-memory sorting

create index if not exists idx_posts_account_posted_at on posts (account_id, posted_at desc);
create index if not exists idx_posts_account_perf_score on posts (account_id, perf_score desc);
create index if not exists idx_social_accounts_user_platform on social_accounts (user_id, platform);
create index if not exists idx_optimization_jobs_account_status on optimization_jobs (account_id, status, created_at desc);
create index if not exists idx_tasks_strategy_status on tasks (strategy_id, status);
create index if not exists idx_recommendations_account_type on recommendations (account_id, type, created_at desc);
