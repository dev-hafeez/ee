import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function DashboardOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is logged in, query user's accounts; otherwise fallback to admin for local dev demo
  const db = user ? supabase : createAdminClient();

  const { data: accounts } = await db
    .from('social_accounts')
    .select('id, platform, handle, last_sync, is_synthetic, status')
    .limit(5);

  const primaryAccount = accounts && accounts.length > 0 ? accounts[0] : null;

  // Fetch posts metrics for primary account
  let totalReach = 0;
  let totalLikes = 0;
  let avgPerfScore = 0;
  let recentPosts: Array<{
    id: string;
    caption: string;
    media_type: string;
    posted_at: string;
    perf_score: number | null;
  }> = [];

  if (primaryAccount) {
    const { data: posts } = await db
      .from('posts')
      .select('id, caption, media_type, posted_at, perf_score, engagement_metrics(reach, likes)')
      .eq('account_id', primaryAccount.id)
      .order('posted_at', { ascending: false })
      .limit(10);

    if (posts && posts.length > 0) {
      recentPosts = posts.map((p) => ({
        id: p.id,
        caption: p.caption || 'No caption',
        media_type: p.media_type || 'image',
        posted_at: p.posted_at,
        perf_score: p.perf_score,
      }));

      let scoreSum = 0;
      let scoreCount = 0;

      posts.forEach((p) => {
        const m =
          p.engagement_metrics && p.engagement_metrics.length > 0 ? p.engagement_metrics[0] : null;
        totalReach += m?.reach || 0;
        totalLikes += m?.likes || 0;
        if (p.perf_score !== null && p.perf_score !== undefined) {
          scoreSum += p.perf_score;
          scoreCount++;
        }
      });

      avgPerfScore = scoreCount > 0 ? scoreSum / scoreCount : 0;
    }
  }

  // Fetch scheduled posts
  const { data: scheduled } = await db
    .from('scheduled_posts')
    .select('id, caption, scheduled_at, status')
    .in('status', ['SCHEDULED', 'PUBLISHING'])
    .order('scheduled_at', { ascending: true })
    .limit(5);

  const scheduledCount = scheduled?.length || 0;
  const nextScheduled = scheduled && scheduled.length > 0 ? scheduled[0] : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#373E3E]">Dashboard Overview</h1>
            {primaryAccount?.is_synthetic && (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                ⚡ Demo Data
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            {primaryAccount ? (
              <>
                Connected to{' '}
                <span className="font-semibold text-zinc-800">@{primaryAccount.handle}</span> (
                {primaryAccount.platform})
                {primaryAccount.last_sync && (
                  <> &bull; Last synced: {new Date(primaryAccount.last_sync).toLocaleString()}</>
                )}
              </>
            ) : (
              'Connect an Instagram or Facebook account in Settings to start tracking engagement.'
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/onboarding"
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            🧭 Onboarding
          </Link>
          <Link
            href="/recommendations"
            className="rounded-lg border border-black bg-transparent px-4 py-2 text-xs font-semibold text-black transition-colors hover:bg-black hover:text-white"
          >
            Run Optimizer
          </Link>
          <Link
            href="/calendar"
            className="rounded-lg border border-black bg-transparent px-4 py-2 text-xs font-semibold text-black transition-colors hover:bg-black hover:text-white"
          >
            Content Calendar
          </Link>
        </div>
      </div>

      {/* 3-column card grid per owner layout preferences */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-transform hover:scale-[1.01] hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase">Total Reach</span>
            <span className="text-base">📈</span>
          </div>
          <div className="mt-4 text-3xl font-extrabold text-[#373E3E]">
            {totalReach > 0 ? totalReach.toLocaleString() : '—'}
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {totalLikes > 0
              ? `${totalLikes.toLocaleString()} total likes tracked`
              : 'Awaiting sync'}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-transform hover:scale-[1.01] hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase">
              Avg Performance Score
            </span>
            <span className="text-base">⚡</span>
          </div>
          <div className="mt-4 text-3xl font-extrabold text-[#373E3E]">
            {avgPerfScore > 0 ? avgPerfScore.toFixed(3) : '—'}
          </div>
          <p className="mt-1 text-xs text-zinc-500">Engagement-weighted / reach ratio</p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-transform hover:scale-[1.01] hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase">Scheduled Posts</span>
            <span className="text-base">📅</span>
          </div>
          <div className="mt-4 text-3xl font-extrabold text-[#373E3E]">{scheduledCount}</div>
          <p className="mt-1 text-xs text-indigo-600">
            {nextScheduled
              ? `Next publish: ${new Date(nextScheduled.scheduled_at).toLocaleDateString()} at ${new Date(nextScheduled.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'No posts currently queued'}
          </p>
        </div>
      </div>

      {/* Recent Posts Section */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
          <h2 className="text-base font-bold text-[#373E3E]">Recent Account Activity</h2>
          <Link href="/analytics" className="text-xs font-semibold text-indigo-600 hover:underline">
            View Analytics &rarr;
          </Link>
        </div>
        {recentPosts.length > 0 ? (
          <div className="divide-y divide-zinc-100">
            {recentPosts.map((post) => (
              <div key={post.id} className="flex items-center justify-between py-3.5">
                <div className="flex items-center gap-3">
                  <span className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-600 uppercase">
                    {post.media_type}
                  </span>
                  <p className="max-w-md truncate text-xs font-medium text-zinc-800">
                    {post.caption}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs text-zinc-400">
                  {post.perf_score !== null && (
                    <span className="font-semibold text-zinc-700">
                      Score: {post.perf_score.toFixed(2)}
                    </span>
                  )}
                  <span>{new Date(post.posted_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-zinc-400">
            No posts found for this account. Run data sync from Settings to populate data.
          </div>
        )}
      </div>
    </div>
  );
}
