-- Entangled Echo — Initial Schema Migration
-- Matches Section 9 of AGENTS.md / Build Plan

-- Ensure pgcrypto / uuid extension exists
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Ensure standard Supabase roles exist (for standalone Postgres environments)
do $$
begin
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
end
$$;

-- Ensure auth schema exists (standard in Supabase; required for standalone Postgres test environments)
create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  encrypted_password text,
  email_confirmed_at timestamptz,
  raw_user_meta_data jsonb default '{}'::jsonb,
  raw_app_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Fallback auth.uid() helper (in Supabase this is provided; in standalone PG it reads request.jwt.claim.sub)
create or replace function auth.uid()
returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

-- ── 1. Profiles (Extends auth.users) ──────────────────────────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  bio text,
  role text not null default 'user' check (role in ('user', 'admin')),
  suspended boolean not null default false,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now()
);

-- ── 2. Social Accounts ────────────────────────────────────────────────────────
create table if not exists social_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  platform text not null check (platform in ('instagram', 'facebook')),
  external_id text not null,
  handle text,
  access_token_enc text not null,
  token_expiry timestamptz,
  last_sync timestamptz,
  status text not null default 'active' check (status in ('active', 'needs_reauth', 'disconnected')),
  is_synthetic boolean not null default false,
  unique (user_id, platform, external_id)
);

-- ── 3. Posts ──────────────────────────────────────────────────────────────────
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references social_accounts on delete cascade,
  external_id text not null,
  caption text,
  hashtags text[] default '{}',
  media_type text check (media_type in ('image', 'video', 'carousel', 'story', 'reel')),
  permalink text,
  posted_at timestamptz not null,
  perf_score real,
  topics text[] default '{}',
  sentiment real,
  unique (account_id, external_id)
);

-- ── 4. Engagement Metrics (Time-series snapshots) ─────────────────────────────
create table if not exists engagement_metrics (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts on delete cascade,
  likes int,
  comments int,
  shares int,
  saves int,
  reach int,
  views int,
  impressions int,
  collected_at timestamptz not null default now()
);

-- ── 5. Audience Snapshots ─────────────────────────────────────────────────────
create table if not exists audience_snapshots (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references social_accounts on delete cascade,
  captured_at timestamptz not null default now(),
  age jsonb,
  gender jsonb,
  location jsonb
);

-- ── 6. Competitors ────────────────────────────────────────────────────────────
create table if not exists competitors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  platform text not null check (platform in ('instagram', 'facebook')),
  handle text not null,
  metrics jsonb,
  last_fetched timestamptz,
  unique (user_id, platform, handle)
);

-- ── 7. Scheduled Posts ────────────────────────────────────────────────────────
create table if not exists scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  account_id uuid not null references social_accounts on delete cascade,
  caption text,
  hashtags text[] default '{}',
  media_path text,
  media_type text,
  scheduled_at timestamptz not null,
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'CANCELLED')),
  retry_count int not null default 0,
  next_retry_at timestamptz,
  platform_post_id text,
  last_error text,
  task_id uuid
);

-- ── 8. Optimization Jobs ──────────────────────────────────────────────────────
create table if not exists optimization_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  account_id uuid not null references social_accounts on delete cascade,
  horizon_days int not null,
  constraints jsonb not null default '{}',
  status text not null default 'PENDING'
    check (status in ('PENDING', 'RUNNING', 'DONE', 'FAILED')),
  result jsonb,
  error text,
  created_at timestamptz default now(),
  finished_at timestamptz
);

-- ── 9. Recommendations ────────────────────────────────────────────────────────
create table if not exists recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  account_id uuid references social_accounts on delete cascade,
  job_id uuid references optimization_jobs on delete set null,
  type text not null check (type in ('caption', 'schedule', 'content_type')),
  content jsonb not null,
  confidence real,
  accepted boolean,
  feedback text,
  created_at timestamptz default now()
);

-- ── 10. Content Strategies ────────────────────────────────────────────────────
create table if not exists content_strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  goal text not null,
  platform text,
  start_date date,
  end_date date,
  created_at timestamptz default now()
);

-- ── 11. Tasks ─────────────────────────────────────────────────────────────────
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid not null references content_strategies on delete cascade,
  description text not null,
  media_type text,
  due_date timestamptz,
  priority int default 0,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  scheduled_post_id uuid references scheduled_posts on delete set null
);

-- ── 12. Notifications ─────────────────────────────────────────────────────────
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  type text not null,
  channel text not null default 'in_app' check (channel in ('in_app', 'email')),
  message text not null,
  is_read boolean not null default false,
  sent_at timestamptz not null default now()
);

-- ── 13. Notification Preferences ──────────────────────────────────────────────
create table if not exists notification_preferences (
  user_id uuid primary key references profiles on delete cascade,
  in_app boolean default true,
  email_digest boolean default true,
  milestones boolean default true,
  post_reminders boolean default true
);

-- ── 14. Auth Attempts (Brute-force rate limiting) ─────────────────────────────
create table if not exists auth_attempts (
  ip inet not null,
  at timestamptz not null default now()
);

-- ── Indexes (Indexes on user_id, account_id, posted_at, etc.) ─────────────────
create index if not exists idx_social_accounts_user_id on social_accounts (user_id);
create index if not exists idx_competitors_user_id on competitors (user_id);
create index if not exists idx_scheduled_posts_user_id on scheduled_posts (user_id);
create index if not exists idx_optimization_jobs_user_id on optimization_jobs (user_id);
create index if not exists idx_recommendations_user_id on recommendations (user_id);
create index if not exists idx_content_strategies_user_id on content_strategies (user_id);
create index if not exists idx_notifications_user_id on notifications (user_id);

create index if not exists idx_posts_account_id on posts (account_id);
create index if not exists idx_audience_snapshots_account_id on audience_snapshots (account_id);
create index if not exists idx_scheduled_posts_account_id on scheduled_posts (account_id);
create index if not exists idx_optimization_jobs_account_id on optimization_jobs (account_id);
create index if not exists idx_recommendations_account_id on recommendations (account_id);

create index if not exists idx_posts_posted_at on posts (posted_at);
create index if not exists idx_engagement_metrics_post_id on engagement_metrics (post_id);
create index if not exists idx_tasks_strategy_id on tasks (strategy_id);
create index if not exists idx_auth_attempts_ip_at on auth_attempts (ip, at);
create index if not exists idx_scheduled_posts_status_time on scheduled_posts (status, scheduled_at);

-- ── Safe Client View for Social Accounts ──────────────────────────────────────
create or replace view social_accounts_public as
select
  id,
  user_id,
  platform,
  external_id,
  handle,
  token_expiry,
  last_sync,
  status,
  is_synthetic
from social_accounts;

-- ── Profiles & Preferences auto-provisioning trigger ─────────────────────────
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, display_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 'user')
  on conflict (id) do nothing;

  insert into notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Drop trigger if exists and recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Grant permissions to standard Supabase roles
grant usage on schema public to authenticated, anon;
grant all on all tables in schema public to authenticated, anon;
grant all on all sequences in schema public to authenticated, anon;
grant all on all routines in schema public to authenticated, anon;
