import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { AnalyticsClient } from './AnalyticsClient';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const db = user ? supabase : createAdminClient();

  // Fetch accounts
  const { data: accounts } = await db
    .from('social_accounts')
    .select('id, platform, handle')
    .limit(5);

  const selectedAccount = accounts && accounts.length > 0 ? accounts[0] : null;

  let totalLikes = 0;
  let totalComments = 0;
  let totalReach = 0;
  let postsCount = 0;
  let avgScore = 0;
  const heatmap: Record<string, number> = {};
  const mediaPerformance: Record<string, { total: number; count: number }> = {};

  if (selectedAccount) {
    const { data: posts } = await db
      .from('posts')
      .select('id, posted_at, perf_score, media_type, engagement_metrics(likes, comments, reach)')
      .eq('account_id', selectedAccount.id)
      .limit(100);

    if (posts && posts.length > 0) {
      postsCount = posts.length;
      let scoreSum = 0;
      let scoreCount = 0;

      posts.forEach((p) => {
        const m =
          p.engagement_metrics && p.engagement_metrics.length > 0 ? p.engagement_metrics[0] : null;
        totalLikes += m?.likes || 0;
        totalComments += m?.comments || 0;
        totalReach += m?.reach || 0;

        if (p.perf_score !== null && p.perf_score !== undefined) {
          scoreSum += p.perf_score;
          scoreCount++;
        }

        // Heatmap
        const date = new Date(p.posted_at);
        const day = date.getDay(); // 0 is Sunday, map to 0-6
        const hour = date.getHours();
        const key = `${day}-${hour}`;
        heatmap[key] = (heatmap[key] || 0) + (p.perf_score || 0.1);

        // Media type
        const mType = p.media_type || 'image';
        if (!mediaPerformance[mType]) {
          mediaPerformance[mType] = { total: 0, count: 0 };
        }
        mediaPerformance[mType].total += p.perf_score || 0;
        mediaPerformance[mType].count += 1;
      });

      avgScore = scoreCount > 0 ? scoreSum / scoreCount : 0;
    }
  }

  // Fetch competitor if exists
  const { data: competitorRow } = await db
    .from('competitors')
    .select('handle, metrics')
    .limit(1)
    .maybeSingle();

  const contentPerformance = Object.entries(mediaPerformance).map(([type, stats]) => ({
    media_type: type,
    avg_score: stats.count > 0 ? stats.total / stats.count : 0,
    count: stats.count,
  }));

  const initialData = {
    accounts: accounts || [],
    kpis: {
      totalLikes,
      totalComments,
      totalReach,
      postsCount,
      avgScore,
    },
    heatmap,
    // contentPerformance: empty array when no posts yet; UI should handle empty state gracefully
    contentPerformance: contentPerformance.length > 0 ? contentPerformance : [],
    // competitor: null when no competitor row or when API metrics are missing — never fabricate numbers
    competitor: competitorRow
      ? {
          handle: competitorRow.handle,
          followersCount: competitorRow.metrics?.followers_count ?? null,
          mediaCount: competitorRow.metrics?.media_count ?? null,
          publicEngagementRate: competitorRow.metrics?.public_engagement_rate ?? null,
        }
      : undefined,
  };

  return <AnalyticsClient initialData={initialData} />;
}
