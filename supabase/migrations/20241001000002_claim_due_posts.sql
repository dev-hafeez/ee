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
