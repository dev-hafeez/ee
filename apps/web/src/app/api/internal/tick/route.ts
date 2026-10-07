import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decryptToken } from '@/lib/crypto/encryption';
import { getSocialProvider, SocialPlatform } from '@/lib/providers/social';
import { syncAccountData } from '@/lib/sync/sync-account';

// Internal tick called by pg_cron or similar service every minute
export async function POST(request: Request) {
  // 1. Verify internal secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.INTERNAL_TICK_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    // 2. Claim due posts using the RPC (FOR UPDATE SKIP LOCKED)
    const { data: claimedPosts, error } = await supabase.rpc('claim_due_posts');

    if (error) {
      console.error('Error claiming posts:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let publishedCount = 0;
    let failedCount = 0;

    // 3. Process each claimed post
    if (claimedPosts && claimedPosts.length > 0) {
      for (const post of claimedPosts) {
        try {
          let token = '';
          try {
            token = decryptToken(post.access_token_enc);
          } catch {
            token = post.access_token_enc;
          }

          const provider = getSocialProvider(post.platform as SocialPlatform);

          const publishRes = await provider.publish(token, post.external_id, {
            caption: post.caption || '',
            hashtags: post.hashtags || [],
            mediaUrl: post.media_path,
            mediaType:
              (post.media_type as 'image' | 'video' | 'carousel' | 'story' | 'reel') || 'image',
          });

          await supabase
            .from('scheduled_posts')
            .update({
              status: 'PUBLISHED',
              platform_post_id: publishRes.platformPostId,
              last_error: null,
            })
            .eq('id', post.id);

          // Success notification
          await supabase.from('notifications').insert({
            user_id: post.user_id,
            type: 'publish_success',
            channel: 'in_app',
            message: `Your scheduled post to ${post.platform} was successfully published!`,
          });

          publishedCount++;
        } catch (publishErr: unknown) {
          failedCount++;
          const errMessage =
            publishErr instanceof Error ? publishErr.message : 'Unknown publish failure';

          // Fetch current retry count
          const { data: currentPost } = await supabase
            .from('scheduled_posts')
            .select('retry_count')
            .eq('id', post.id)
            .single();

          const currentRetries = currentPost?.retry_count ?? 0;
          const nextRetries = currentRetries + 1;

          if (nextRetries >= 3) {
            // Final failure (FR-27/28)
            await supabase
              .from('scheduled_posts')
              .update({
                status: 'FAILED',
                retry_count: nextRetries,
                last_error: errMessage,
              })
              .eq('id', post.id);

            await supabase.from('notifications').insert({
              user_id: post.user_id,
              type: 'publish_failed',
              channel: 'in_app',
              message: `Failed to publish post to ${post.platform} after 3 attempts: ${errMessage}`,
            });
          } else {
            // Exponential backoff: retry in 2^nextRetries minutes
            const backoffMinutes = Math.pow(2, nextRetries);
            const nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString();

            await supabase
              .from('scheduled_posts')
              .update({
                status: 'FAILED',
                retry_count: nextRetries,
                next_retry_at: nextRetryAt,
                last_error: errMessage,
              })
              .eq('id', post.id);
          }
        }
      }
    }

    // 4. Send 30-minute advance reminders (Phase 11)
    const thirtyMinAhead = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const thirtyFiveMinAhead = new Date(Date.now() + 35 * 60 * 1000).toISOString();

    const { data: upcomingPosts } = await supabase
      .from('scheduled_posts')
      .select('id, user_id, scheduled_at')
      .eq('status', 'SCHEDULED')
      .gte('scheduled_at', thirtyMinAhead)
      .lte('scheduled_at', thirtyFiveMinAhead);

    if (upcomingPosts && upcomingPosts.length > 0) {
      for (const upcoming of upcomingPosts) {
        // Check if reminder already sent
        const { data: existingNotif } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', upcoming.user_id)
          .eq('type', 'post_reminder')
          .ilike('message', `%${upcoming.id}%`)
          .limit(1);

        if (!existingNotif || existingNotif.length === 0) {
          await supabase.from('notifications').insert({
            user_id: upcoming.user_id,
            type: 'post_reminder',
            channel: 'in_app',
            message: `Reminder: You have a scheduled post publishing in ~30 minutes (Ref: ${upcoming.id}).`,
          });
        }
      }
    }

    // 5. Automatic Daily Sync (Phase 5)
    // Find active accounts where last_sync is older than 24h or null
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: staleAccounts } = await supabase
      .from('social_accounts')
      .select('id')
      .eq('status', 'active')
      .or(`last_sync.is.null,last_sync.lte.${oneDayAgo}`)
      .limit(5); // Throttle batch sync per tick

    let autoSyncedCount = 0;
    if (staleAccounts && staleAccounts.length > 0) {
      for (const acc of staleAccounts) {
        try {
          await syncAccountData(acc.id);
          autoSyncedCount++;
        } catch (syncErr) {
          console.warn(`Automatic sync failed for account ${acc.id}:`, syncErr);
        }
      }
    }

    return NextResponse.json({
      status: 'ok',
      claimed: claimedPosts?.length ?? 0,
      published: publishedCount,
      failed: failedCount,
      autoSyncedAccounts: autoSyncedCount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Tick error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
