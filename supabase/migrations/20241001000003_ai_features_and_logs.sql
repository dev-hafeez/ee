-- ── 15. LLM Token Logs (Tracking token usage per user & endpoint) ───────────
create table if not exists llm_token_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  endpoint text not null,
  tokens integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_llm_token_logs_user_id on llm_token_logs (user_id);
create index if not exists idx_llm_token_logs_created_at on llm_token_logs (created_at);

alter table llm_token_logs enable row level security;

create policy llm_token_logs_select on llm_token_logs
  for select using (user_id = auth.uid() or is_admin());

create policy llm_token_logs_insert on llm_token_logs
  for insert with check (user_id = auth.uid() or is_admin());

-- ── 16. Image Generation Logs (Tracking prompts, storage & caps) ────────────
create table if not exists image_generation_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  prompt text not null,
  storage_path text not null,
  provider text not null default 'mock',
  created_at timestamptz not null default now()
);

create index if not exists idx_image_generation_logs_user_id on image_generation_logs (user_id);
create index if not exists idx_image_generation_logs_created_at on image_generation_logs (created_at);

alter table image_generation_logs enable row level security;

create policy image_generation_logs_select on image_generation_logs
  for select using (user_id = auth.uid() or is_admin());

create policy image_generation_logs_insert on image_generation_logs
  for insert with check (user_id = auth.uid() or is_admin());

-- ── 17. Assistant Conversations (Grounded in user context) ──────────────────
create table if not exists assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_assistant_conversations_user_id on assistant_conversations (user_id);
create index if not exists idx_assistant_conversations_created_at on assistant_conversations (created_at);

alter table assistant_conversations enable row level security;

create policy assistant_conversations_all on assistant_conversations
  for all using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());

-- Grant permissions to standard Supabase roles
grant usage on schema public to authenticated, anon;
grant all on all tables in schema public to authenticated, anon;
grant all on all sequences in schema public to authenticated, anon;
grant all on all routines in schema public to authenticated, anon;
