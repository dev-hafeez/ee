import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/analytics/trends
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');

  if (!accountId) {
    return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
  }

  // 1. Authenticate user session
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Support internal tick or admin requests via secret header
  const authHeader = request.headers.get('authorization');
  const tickSecret = process.env.INTERNAL_TICK_SECRET;
  const isInternal = tickSecret && authHeader === `Bearer ${tickSecret}`;

  if (!user && !isInternal) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Multi-tenant authorization check: verify user owns the requested account
  let queryClient = supabase;
  if (user) {
    const { data: account, error: accError } = await supabase
      .from('social_accounts')
      .select('id, user_id')
      .eq('id', accountId)
      .single();

    if (accError || !account || account.user_id !== user.id) {
      return NextResponse.json({ error: 'Account not found or access denied' }, { status: 403 });
    }
  } else if (isInternal) {
    // Internal administrative task uses admin client
    queryClient = createAdminClient() as any;
  }

  try {
    // 1. KPI Cards (totals for the last 30 days vs previous 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Query posts scoped to the verified account
    const { data: posts, error } = await queryClient
      .from('posts')
      .select(
        'id, posted_at, perf_score, media_type, engagement_metrics(likes, comments, shares, saves, reach, views)'
      )
      .eq('account_id', accountId)
      .gte('posted_at', thirtyDaysAgo.toISOString());

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Process posts into trends
    let totalLikes = 0;
    let totalComments = 0;

    const heatmap: Record<string, number> = {};
    const mediaPerformance: Record<string, number> = {};
    const mediaCounts: Record<string, number> = {};

    type MetricRecord = {
      likes?: number;
      comments?: number;
      shares?: number;
      saves?: number;
      reach?: number;
      views?: number;
    };

    type PostRecord = {
      id: string;
      posted_at: string;
      perf_score?: number | null;
      media_type?: string | null;
      engagement_metrics?: MetricRecord[];
    };

    (posts as PostRecord[]).forEach((post) => {
      // Latest metrics (assuming the relation returns an array, we take the most recent or the first)
      const metrics =
        post.engagement_metrics && post.engagement_metrics.length > 0
          ? post.engagement_metrics[0]
          : { likes: 0, comments: 0, reach: 0 };

      totalLikes += metrics.likes || 0;
      totalComments += metrics.comments || 0;

      // Heatmap (day-of-week - hour)
      const date = new Date(post.posted_at);
      const day = date.getDay();
      const hour = date.getHours();
      const key = `${day}-${hour}`;
      heatmap[key] = (heatmap[key] || 0) + (post.perf_score || 0);

      // Content type performance
      const mType = post.media_type || 'unknown';
      mediaPerformance[mType] = (mediaPerformance[mType] || 0) + (post.perf_score || 0);
      mediaCounts[mType] = (mediaCounts[mType] || 0) + 1;
    });

    const contentPerformance = Object.keys(mediaPerformance).map((type) => ({
      media_type: type,
      avg_score: mediaCounts[type] > 0 ? mediaPerformance[type] / mediaCounts[type] : 0,
      count: mediaCounts[type],
    }));

    return NextResponse.json({
      kpis: {
        totalLikes,
        totalComments,
        postsCount: posts.length,
      },
      heatmap, // client can process into a 7x24 grid
      contentPerformance,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
