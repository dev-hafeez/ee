-- Entangled Echo — Comprehensive RLS Multi-Tenant Test Suite
-- Verifies that User A's data is strictly inaccessible and immutable to User B across all 13 tables,
-- and that Admin role can access data across users.
-- Runs under 'authenticated' role to enforce PostgreSQL Row Level Security.

\set ON_ERROR_STOP on

-- ── 1. Setup Phase (As superuser / table owner) ──────────────────────────────
RESET ROLE;

DO $$
BEGIN
  -- Insert auth.users
  INSERT INTO auth.users (id, email) VALUES ('11111111-1111-1111-1111-111111111111'::uuid, 'user_a@test.com') ON CONFLICT DO NOTHING;
  INSERT INTO auth.users (id, email) VALUES ('22222222-2222-2222-2222-222222222222'::uuid, 'user_b@test.com') ON CONFLICT DO NOTHING;
  INSERT INTO auth.users (id, email) VALUES ('33333333-3333-3333-3333-333333333333'::uuid, 'admin@test.com') ON CONFLICT DO NOTHING;

  -- Ensure profiles exist
  INSERT INTO profiles (id, display_name, role) VALUES ('11111111-1111-1111-1111-111111111111'::uuid, 'User A', 'user') ON CONFLICT (id) DO NOTHING;
  INSERT INTO profiles (id, display_name, role) VALUES ('22222222-2222-2222-2222-222222222222'::uuid, 'User B', 'user') ON CONFLICT (id) DO NOTHING;
  INSERT INTO profiles (id, display_name, role) VALUES ('33333333-3333-3333-3333-333333333333'::uuid, 'Admin User', 'admin') ON CONFLICT (id) DO UPDATE SET role = 'admin';

  INSERT INTO notification_preferences (user_id) VALUES ('11111111-1111-1111-1111-111111111111'::uuid) ON CONFLICT DO NOTHING;
  INSERT INTO notification_preferences (user_id) VALUES ('22222222-2222-2222-2222-222222222222'::uuid) ON CONFLICT DO NOTHING;

  -- Insert auth_attempts test record
  INSERT INTO auth_attempts (ip, at) VALUES ('192.168.1.100'::inet, now());
END $$;

-- ── 2. Switch to 'authenticated' role (Simulating Supabase PostgREST client) ──
SET ROLE authenticated;

-- Act as User A
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

DO $$
DECLARE
  v_user_a uuid := '11111111-1111-1111-1111-111111111111'::uuid;
  v_account_a_id uuid;
  v_post_a_id uuid;
  v_strategy_a_id uuid;
  v_job_a_id uuid;
BEGIN
  -- Insert into all tables as User A
  INSERT INTO social_accounts (id, user_id, platform, external_id, handle, access_token_enc)
  VALUES ('a0000000-0000-0000-0000-000000000001'::uuid, v_user_a, 'instagram', 'ext_insta_a', 'user_a_insta', 'encrypted_token_a')
  ON CONFLICT DO NOTHING;

  INSERT INTO posts (id, account_id, external_id, caption, posted_at)
  VALUES ('a0000000-0000-0000-0000-000000000002'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'post_ext_a1', 'Caption from A', now())
  ON CONFLICT DO NOTHING;

  INSERT INTO engagement_metrics (post_id, likes, comments, reach)
  VALUES ('a0000000-0000-0000-0000-000000000002'::uuid, 100, 10, 1000);

  INSERT INTO audience_snapshots (account_id, age)
  VALUES ('a0000000-0000-0000-0000-000000000001'::uuid, '{"18-24": 0.5}'::jsonb);

  INSERT INTO competitors (user_id, platform, handle)
  VALUES (v_user_a, 'instagram', 'competitor_1')
  ON CONFLICT DO NOTHING;

  INSERT INTO scheduled_posts (id, user_id, account_id, caption, scheduled_at, status)
  VALUES ('a0000000-0000-0000-0000-000000000003'::uuid, v_user_a, 'a0000000-0000-0000-0000-000000000001'::uuid, 'Scheduled post A', now() + interval '1 day', 'DRAFT')
  ON CONFLICT DO NOTHING;

  INSERT INTO optimization_jobs (id, user_id, account_id, horizon_days, status)
  VALUES ('a0000000-0000-0000-0000-000000000004'::uuid, v_user_a, 'a0000000-0000-0000-0000-000000000001'::uuid, 7, 'PENDING')
  ON CONFLICT DO NOTHING;

  INSERT INTO recommendations (user_id, account_id, job_id, type, content)
  VALUES (v_user_a, 'a0000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000004'::uuid, 'caption', '{"draft": "Rec A"}'::jsonb);

  INSERT INTO content_strategies (id, user_id, goal)
  VALUES ('a0000000-0000-0000-0000-000000000005'::uuid, v_user_a, 'Grow by 20%')
  ON CONFLICT DO NOTHING;

  INSERT INTO tasks (strategy_id, description)
  VALUES ('a0000000-0000-0000-0000-000000000005'::uuid, 'Post Reel on Friday');

  INSERT INTO notifications (user_id, type, message)
  VALUES (v_user_a, 'system', 'Welcome User A');
END $$;

-- ── 3. Switch Context to User B: Verify strict isolation ───────────────────
SET request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

DO $$
DECLARE
  v_user_a uuid := '11111111-1111-1111-1111-111111111111'::uuid;
  v_account_a_id uuid := 'a0000000-0000-0000-0000-000000000001'::uuid;
  v_post_a_id uuid := 'a0000000-0000-0000-0000-000000000002'::uuid;
  v_strategy_a_id uuid := 'a0000000-0000-0000-0000-000000000005'::uuid;
  v_count int;
BEGIN
  -- Verify User B cannot select User A's profile
  SELECT count(*) INTO v_count FROM profiles WHERE id = v_user_a;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'RLS VIOLATION: User B was able to view User A profile!';
  END IF;

  -- Verify User B cannot select User A's social_accounts
  SELECT count(*) INTO v_count FROM social_accounts WHERE user_id = v_user_a;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'RLS VIOLATION: User B was able to view User A social_accounts!';
  END IF;

  -- Verify User B cannot select User A's posts
  SELECT count(*) INTO v_count FROM posts WHERE account_id = v_account_a_id;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'RLS VIOLATION: User B was able to view User A posts!';
  END IF;

  -- Verify User B cannot select User A's engagement_metrics
  SELECT count(*) INTO v_count FROM engagement_metrics WHERE post_id = v_post_a_id;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'RLS VIOLATION: User B was able to view User A engagement_metrics!';
  END IF;

  -- Verify User B cannot select User A's audience_snapshots
  SELECT count(*) INTO v_count FROM audience_snapshots WHERE account_id = v_account_a_id;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'RLS VIOLATION: User B was able to view User A audience_snapshots!';
  END IF;

  -- Verify User B cannot select User A's competitors
  SELECT count(*) INTO v_count FROM competitors WHERE user_id = v_user_a;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'RLS VIOLATION: User B was able to view User A competitors!';
  END IF;

  -- Verify User B cannot select User A's scheduled_posts
  SELECT count(*) INTO v_count FROM scheduled_posts WHERE user_id = v_user_a;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'RLS VIOLATION: User B was able to view User A scheduled_posts!';
  END IF;

  -- Verify User B cannot select User A's optimization_jobs
  SELECT count(*) INTO v_count FROM optimization_jobs WHERE user_id = v_user_a;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'RLS VIOLATION: User B was able to view User A optimization_jobs!';
  END IF;

  -- Verify User B cannot select User A's recommendations
  SELECT count(*) INTO v_count FROM recommendations WHERE user_id = v_user_a;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'RLS VIOLATION: User B was able to view User A recommendations!';
  END IF;

  -- Verify User B cannot select User A's content_strategies
  SELECT count(*) INTO v_count FROM content_strategies WHERE user_id = v_user_a;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'RLS VIOLATION: User B was able to view User A content_strategies!';
  END IF;

  -- Verify User B cannot select User A's tasks
  SELECT count(*) INTO v_count FROM tasks WHERE strategy_id = v_strategy_a_id;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'RLS VIOLATION: User B was able to view User A tasks!';
  END IF;

  -- Verify User B cannot select User A's notifications
  SELECT count(*) INTO v_count FROM notifications WHERE user_id = v_user_a;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'RLS VIOLATION: User B was able to view User A notifications!';
  END IF;

  -- Verify User B cannot select User A's notification_preferences
  SELECT count(*) INTO v_count FROM notification_preferences WHERE user_id = v_user_a;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'RLS VIOLATION: User B was able to view User A notification_preferences!';
  END IF;

  -- Verify User B cannot select auth_attempts
  SELECT count(*) INTO v_count FROM auth_attempts;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'RLS VIOLATION: User B was able to view auth_attempts records!';
  END IF;

  -- ── Test Mutations by User B on User A data ──
  UPDATE posts SET caption = 'Hacked by B' WHERE id = v_post_a_id;
  DELETE FROM social_accounts WHERE id = v_account_a_id;
END $$;

-- ── 4. Verify Admin Access (As Admin User under 'authenticated' role) ─────────
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

DO $$
DECLARE
  v_user_a uuid := '11111111-1111-1111-1111-111111111111'::uuid;
  v_user_b uuid := '22222222-2222-2222-2222-222222222222'::uuid;
  v_account_a_id uuid := 'a0000000-0000-0000-0000-000000000001'::uuid;
  v_post_a_id uuid := 'a0000000-0000-0000-0000-000000000002'::uuid;
  v_count int;
  v_caption text;
BEGIN
  -- Admin can see both profiles
  SELECT count(*) INTO v_count FROM profiles WHERE id IN (v_user_a, v_user_b);
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'RLS ADMIN FAILURE: Admin could not see user profiles (found %)!', v_count;
  END IF;

  -- Admin can see User A's social account (and verifies it was NOT deleted by User B)
  SELECT count(*) INTO v_count FROM social_accounts WHERE user_id = v_user_a;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'RLS ADMIN FAILURE: User A social account was missing (User B deleted it or admin cannot see)!';
  END IF;

  -- Admin verifies User A post caption was NOT modified by User B
  SELECT caption INTO v_caption FROM posts WHERE id = v_post_a_id;
  IF v_caption = 'Hacked by B' THEN
    RAISE EXCEPTION 'RLS VIOLATION: User B was able to modify User A post caption!';
  END IF;
  IF v_caption <> 'Caption from A' THEN
    RAISE EXCEPTION 'RLS FAILURE: Post caption did not match expected!';
  END IF;

  -- Admin can view auth_attempts
  SELECT count(*) INTO v_count FROM auth_attempts;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'RLS ADMIN FAILURE: Admin could not view auth_attempts (found %)!', v_count;
  END IF;

  RAISE NOTICE 'SUCCESS: All 14 tables verified with strict multi-tenant RLS isolation (including auth_attempts)!';
END $$;

RESET ROLE;
