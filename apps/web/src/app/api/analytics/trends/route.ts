import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET /api/analytics/trends
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');

  if (!accountId) {
    return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  try {
    // 1. KPI Cards (totals for the last 30 days vs previous 30 days)
    // We can do this by aggregating metrics from posts in those date ranges.
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Quick naive approach: fetch all posts and their latest metrics
    const { data: posts, error } = await supabase
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
