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
