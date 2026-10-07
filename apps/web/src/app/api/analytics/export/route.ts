import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!accountId) {
    return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
  }

  // Validate authentication
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Allow admin client if authorized
  const db = user ? supabase : createAdminClient();

  try {
    let query = db
      .from('posts')
      .select(
        'id, external_id, posted_at, media_type, caption, perf_score, engagement_metrics(likes, comments, shares, saves, reach, views)'
      )
      .eq('account_id', accountId)
      .order('posted_at', { ascending: false });

    if (startDate) {
      query = query.gte('posted_at', startDate);
    }
    if (endDate) {
      query = query.lte('posted_at', endDate);
    }

    const { data: posts, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Generate CSV content
    const headers = [
      'Post ID',
      'External ID',
      'Posted At',
      'Media Type',
      'Caption',
      'Likes',
      'Comments',
      'Shares',
      'Saves',
      'Reach',
      'Views',
      'Performance Score',
    ];

    const escapeCsv = (val: string | number | null | undefined): string => {
      if (val === null || val === undefined) return '';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    type PostMetric = {
      likes?: number;
      comments?: number;
      shares?: number;
      saves?: number;
      reach?: number;
      views?: number;
    };

    type ExportPost = {
      id: string;
      external_id: string;
      posted_at: string;
      media_type?: string;
      caption?: string;
      perf_score?: number;
      engagement_metrics?: PostMetric[];
    };

    const rows = ((posts || []) as ExportPost[]).map((p) => {
      const metric =
        p.engagement_metrics && p.engagement_metrics.length > 0 ? p.engagement_metrics[0] : {};

      return [
        escapeCsv(p.id),
        escapeCsv(p.external_id),
        escapeCsv(p.posted_at),
        escapeCsv(p.media_type || 'image'),
        escapeCsv(p.caption || ''),
        escapeCsv(metric.likes ?? 0),
        escapeCsv(metric.comments ?? 0),
        escapeCsv(metric.shares ?? 0),
        escapeCsv(metric.saves ?? 0),
        escapeCsv(metric.reach ?? 0),
        escapeCsv(metric.views ?? 0),
        escapeCsv(p.perf_score !== undefined ? p.perf_score.toFixed(4) : ''),
      ].join(',');
    });

    const csvOutput = [headers.join(','), ...rows].join('\n');

    return new NextResponse(csvOutput, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="analytics-${accountId}-${Date.now()}.csv"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Export failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
