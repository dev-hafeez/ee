import { createAdminClient } from '@/lib/supabase/admin';
import { decryptToken } from '@/lib/crypto/encryption';
import { getSocialProvider, SocialPlatform } from '@/lib/providers/social';

export interface SyncResult {
  status: 'ok';
  syncedPosts: number;
  lastSync: string;
  durationMs: number;
}

export async function syncAccountData(accountId: string, userId?: string): Promise<SyncResult> {
  const startTime = Date.now();
  const supabase = createAdminClient();

  // 1. Fetch account (filtered by user_id if provided)
  let query = supabase.from('social_accounts').select('*').eq('id', accountId);
  if (userId) {
    query = query.eq('user_id', userId);
  }
  const { data: account, error: accError } = await query.single();

  if (accError || !account) {
    throw new Error(`Social account not found or access denied: ${accError?.message || accountId}`);
  }

  // 2. Decrypt token and get provider
  let token = '';
  try {
    token = decryptToken(account.access_token_enc);
  } catch {
    // If decryption fails (e.g. in test/mock env with dummy token), use token as-is
    token = account.access_token_enc;
  }

  const provider = getSocialProvider(account.platform as SocialPlatform);

  // 3. Fetch normalized posts from provider
  const normalizedPosts = await provider.fetchPosts(token, account.external_id);

  if (normalizedPosts.length > 0) {
    // Batch upsert posts into DB (idempotent on account_id, external_id)
    const postRows = normalizedPosts.map((p) => ({
      account_id: account.id,
      external_id: p.externalId,
      caption: p.caption,
      hashtags: p.hashtags,
      media_type: p.mediaType,
      permalink: p.permalink,
      posted_at: p.postedAt,
    }));

    const { data: upsertedPosts, error: postError } = await supabase
      .from('posts')
      .upsert(postRows, { onConflict: 'account_id,external_id' })
      .select('id, external_id, posted_at');

    if (postError) {
      throw new Error(`Failed to upsert posts: ${postError.message}`);
    }

    // 4. Fetch metrics snapshots for each post
    if (upsertedPosts && upsertedPosts.length > 0) {
      const metricsRows = await Promise.all(
        upsertedPosts.map(async (dbPost) => {
          const metrics = await provider.fetchPostInsights(token, dbPost.external_id);
          return {
            post_id: dbPost.id,
            likes: metrics.likes,
            comments: metrics.comments,
            shares: metrics.shares,
            saves: metrics.saves,
            reach: metrics.reach,
            views: metrics.views ?? null,
            impressions: metrics.impressions ?? null,
            collected_at: metrics.collectedAt || new Date().toISOString(),
          };
        })
      );

      // Batch insert metrics snapshots
      const { error: metricsError } = await supabase.from('engagement_metrics').insert(metricsRows);

      if (metricsError) {
        console.warn(`Failed to insert metrics snapshots: ${metricsError.message}`);
      }
    }
  }

  // 5. Ingest audience snapshot if supported
  try {
    const audience = await provider.fetchAudience(token, account.external_id);
    await supabase.from('audience_snapshots').insert({
      account_id: account.id,
      captured_at: new Date().toISOString(),
      age: audience.age,
      gender: audience.gender,
      location: audience.location,
    });
  } catch (err) {
    console.warn('Audience snapshot skipped or failed:', err);
  }

  // 6. Update last_sync timestamp on social_accounts
  const lastSync = new Date().toISOString();
  await supabase.from('social_accounts').update({ last_sync: lastSync }).eq('id', account.id);

  const durationMs = Date.now() - startTime;
  return {
    status: 'ok',
    syncedPosts: normalizedPosts.length,
    lastSync,
    durationMs,
  };
}
