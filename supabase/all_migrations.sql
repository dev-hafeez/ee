-- Entangled Echo — Initial Schema Migration
-- Matches Section 9 of AGENTS.md / Build Plan

-- Ensure pgcrypto / uuid extension exists
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";



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
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 'user')
  on conflict (id) do nothing;

  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Drop trigger if exists and recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Grant permissions to standard Supabase roles
grant usage on schema public to authenticated, anon;
grant all on all tables in schema public to authenticated, anon;
grant all on all sequences in schema public to authenticated, anon;
grant all on all routines in schema public to authenticated, anon;
-- Entangled Echo — Row Level Security (RLS) Migration
-- Enforces strict multi-tenant isolation across all user-scoped tables

-- ── 0. Helper Functions ───────────────────────────────────────────────────────
create or replace function is_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ── 1. profiles ───────────────────────────────────────────────────────────────
alter table profiles enable row level security;

create policy profiles_select on profiles
  for select using (id = auth.uid() or is_admin());

create policy profiles_update on profiles
  for update using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());

create policy profiles_insert on profiles
  for insert with check (id = auth.uid());

-- ── 2. social_accounts ────────────────────────────────────────────────────────
alter table social_accounts enable row level security;

create policy social_accounts_all on social_accounts
  for all using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());

-- ── 3. posts ──────────────────────────────────────────────────────────────────
alter table posts enable row level security;

create policy posts_all on posts
  for all using (
    exists (
      select 1 from social_accounts a
      where a.id = posts.account_id and (a.user_id = auth.uid() or is_admin())
    )
  )
  with check (
    exists (
      select 1 from social_accounts a
      where a.id = posts.account_id and (a.user_id = auth.uid() or is_admin())
    )
  );

-- ── 4. engagement_metrics ─────────────────────────────────────────────────────
alter table engagement_metrics enable row level security;

create policy engagement_metrics_all on engagement_metrics
  for all using (
    exists (
      select 1 from posts p
      join social_accounts a on a.id = p.account_id
      where p.id = engagement_metrics.post_id and (a.user_id = auth.uid() or is_admin())
    )
  )
  with check (
    exists (
      select 1 from posts p
      join social_accounts a on a.id = p.account_id
      where p.id = engagement_metrics.post_id and (a.user_id = auth.uid() or is_admin())
    )
  );

-- ── 5. audience_snapshots ─────────────────────────────────────────────────────
alter table audience_snapshots enable row level security;

create policy audience_snapshots_all on audience_snapshots
  for all using (
    exists (
      select 1 from social_accounts a
      where a.id = audience_snapshots.account_id and (a.user_id = auth.uid() or is_admin())
    )
  )
  with check (
    exists (
      select 1 from social_accounts a
      where a.id = audience_snapshots.account_id and (a.user_id = auth.uid() or is_admin())
    )
  );

-- ── 6. competitors ────────────────────────────────────────────────────────────
alter table competitors enable row level security;

create policy competitors_all on competitors
  for all using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());

-- ── 7. scheduled_posts ────────────────────────────────────────────────────────
alter table scheduled_posts enable row level security;

create policy scheduled_posts_all on scheduled_posts
  for all using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());

-- ── 8. optimization_jobs ──────────────────────────────────────────────────────
alter table optimization_jobs enable row level security;

create policy optimization_jobs_all on optimization_jobs
  for all using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());

-- ── 9. recommendations ────────────────────────────────────────────────────────
alter table recommendations enable row level security;

create policy recommendations_all on recommendations
  for all using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());

-- ── 10. content_strategies ────────────────────────────────────────────────────
alter table content_strategies enable row level security;

create policy content_strategies_all on content_strategies
  for all using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());

-- ── 11. tasks ─────────────────────────────────────────────────────────────────
alter table tasks enable row level security;

create policy tasks_all on tasks
  for all using (
    exists (
      select 1 from content_strategies s
      where s.id = tasks.strategy_id and (s.user_id = auth.uid() or is_admin())
    )
  )
  with check (
    exists (
      select 1 from content_strategies s
      where s.id = tasks.strategy_id and (s.user_id = auth.uid() or is_admin())
    )
  );

-- ── 12. notifications ─────────────────────────────────────────────────────────
alter table notifications enable row level security;

create policy notifications_all on notifications
  for all using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());

-- ── 13. notification_preferences ──────────────────────────────────────────────
alter table notification_preferences enable row level security;

create policy notification_preferences_all on notification_preferences
  for all using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());

-- ── 14. auth_attempts ────────────────────────────────────────────────────────
alter table auth_attempts enable row level security;

create policy auth_attempts_admin on auth_attempts
  for all using (is_admin())
  with check (is_admin());
-- Migration for publishing flow

create or replace function claim_due_posts()
returns table (
  id uuid,
  user_id uuid,
  account_id uuid,
  caption text,
  hashtags text[],
  media_path text,
  media_type text,
  platform text,
  external_id text,
  access_token_enc text
)
language plpgsql
as $$
begin
  return query
  with claimed as (
    select sp.id
    from scheduled_posts sp
    where (sp.status = 'SCHEDULED' and sp.scheduled_at <= now())
       or (sp.status = 'FAILED' and sp.next_retry_at <= now() and sp.retry_count < 3)
    order by sp.scheduled_at asc
    for update skip locked
  )
  update scheduled_posts target
  set status = 'PUBLISHING'
  from claimed
  join scheduled_posts sp on sp.id = claimed.id
  join social_accounts sa on sa.id = sp.account_id
  where target.id = claimed.id
  returning 
    target.id,
    target.user_id,
    target.account_id,
    target.caption,
    target.hashtags,
    target.media_path,
    target.media_type,
    sa.platform,
    sa.external_id,
    sa.access_token_enc;
end;
$$;
