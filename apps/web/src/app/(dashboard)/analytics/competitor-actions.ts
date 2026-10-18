'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decryptToken } from '@/lib/crypto/encryption';
import { getSocialProvider, SocialPlatform } from '@/lib/providers/social';
import { revalidatePath } from 'next/cache';

import { extractInstagramHandle } from '@/lib/social/handle-utils';

export interface CompetitorDiscoveryResult {
  success: boolean;
  handle?: string;
  followersCount?: number;
  mediaCount?: number;
  publicEngagementRate?: number;
  recentPosts?: Array<{
    externalId: string;
    caption: string;
    likes: number;
    comments: number;
  }>;
  error?: string;
}

export async function discoverCompetitorProfile(
  rawInput: string,
  preferredAccountId?: string
): Promise<CompetitorDiscoveryResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized: Please log in' };
  }

  const handle = extractInstagramHandle(rawInput);
  if (!handle || !/^[a-zA-Z0-9._]{1,30}$/.test(handle)) {
    return {
      success: false,
      error: 'Invalid Instagram handle format. Please enter a valid username or profile URL.',
    };
  }

  // Find user's connected Instagram account to make the Business Discovery call
  let accountQuery = supabase
    .from('social_accounts')
    .select('id, platform, external_id, access_token_enc')
    .eq('user_id', user.id)
    .eq('platform', 'instagram');

  if (preferredAccountId) {
    accountQuery = accountQuery.eq('id', preferredAccountId);
  }

  const { data: accounts } = await accountQuery.limit(1);
  const ownAccount = accounts && accounts.length > 0 ? accounts[0] : null;

  if (!ownAccount) {
    return {
      success: false,
      error:
        'To discover competitor public data, you must first connect your own Instagram Business or Creator account in Settings.',
    };
  }

  let token = '';
  try {
    token = decryptToken(ownAccount.access_token_enc);
  } catch {
    token = ownAccount.access_token_enc;
  }

  const provider = getSocialProvider(ownAccount.platform as SocialPlatform);

  try {
    const publicData = await provider.businessDiscovery(token, ownAccount.external_id, handle);

    // Compute public engagement rate based on recent public posts
    let totalPublicEngagements = 0;
    if (publicData.recentPosts && publicData.recentPosts.length > 0) {
      totalPublicEngagements = publicData.recentPosts.reduce(
        (acc, p) => acc + (p.likes || 0) + (p.comments || 0),
        0
      );
    }
    const publicEngagementRate =
      publicData.followersCount > 0 && publicData.recentPosts && publicData.recentPosts.length > 0
        ? totalPublicEngagements / (publicData.recentPosts.length * publicData.followersCount)
        : 0;

    const metricsPayload = {
      followers_count: publicData.followersCount,
      media_count: publicData.mediaCount,
      public_engagement_rate: publicEngagementRate,
      recent_posts: publicData.recentPosts,
    };

    // Save to competitors table
    const adminClient = createAdminClient();
    await adminClient
      .from('competitors')
      .upsert(
        {
          user_id: user.id,
          platform: 'instagram',
          handle: publicData.handle,
          metrics: metricsPayload,
          last_fetched: new Date().toISOString(),
        },
        { onConflict: 'user_id,platform,handle' }
      );

    revalidatePath('/analytics');

    return {
      success: true,
      handle: publicData.handle,
      followersCount: publicData.followersCount,
      mediaCount: publicData.mediaCount,
      publicEngagementRate,
      recentPosts: publicData.recentPosts,
    };
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : String(err);

    // Check for Meta's specific Business Discovery failure messages
    if (
      rawMsg.includes('not an Instagram Business') ||
      rawMsg.includes('Unsupported request') ||
      rawMsg.includes('OAuthException') ||
      rawMsg.includes('does not exist')
    ) {
      return {
        success: false,
        error: `Unable to discover @${handle}: This profile is either a personal account, private, or does not have Business/Creator features enabled. Meta Business Discovery exclusively supports public Business or Creator accounts.`,
      };
    }

    return {
      success: false,
      error: `Discovery query failed: ${rawMsg}`,
    };
  }
}
