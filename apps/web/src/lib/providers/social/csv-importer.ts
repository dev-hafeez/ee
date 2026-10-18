import { createAdminClient } from '@/lib/supabase/admin';
import { NormalizedPost } from './types';

export interface ImportSummary {
  totalProcessed: number;
  importedPosts: number;
  insertedMetrics: number;
  errors: string[];
}

export function parseInstagramDataExport(rawText: string): Array<{
  caption: string;
  mediaType: 'image' | 'video' | 'carousel' | 'reel';
  postedAt: string;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  reach?: number;
  views?: number;
}> {
  // 1. Try parsing as JSON (Instagram's official Download Your Information export)
  try {
    const parsed = JSON.parse(rawText);
    const items = Array.isArray(parsed) ? parsed : parsed.media || parsed.posts || [];
    if (items.length > 0) {
      return items.map((item: any) => {
        const title = item.title || item.caption || (item.media?.[0]?.title) || '';
        const timestamp = item.creation_timestamp
          ? new Date(item.creation_timestamp * 1000).toISOString()
          : item.taken_at || item.posted_at || new Date().toISOString();
        const mediaType = item.media_type?.toLowerCase() || (item.video_metadata ? 'video' : 'image');

        return {
          caption: title,
          mediaType: ['image', 'video', 'carousel', 'reel'].includes(mediaType) ? mediaType : 'image',
          postedAt: timestamp,
          likes: item.like_count ?? 0,
          comments: item.comment_count ?? 0,
        };
      });
    }
  } catch {
    // Not JSON, fall through to CSV parser
  }

  // 2. Parse as CSV
  const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse header
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));
  const captionIdx = header.findIndex((h) => h.includes('caption') || h.includes('text') || h.includes('title') || h.includes('content'));
  const typeIdx = header.findIndex((h) => h.includes('type') || h.includes('format'));
  const dateIdx = header.findIndex((h) => h.includes('date') || h.includes('time') || h.includes('posted'));
  const likesIdx = header.findIndex((h) => h.includes('like'));
  const commentsIdx = header.findIndex((h) => h.includes('comment'));
  const sharesIdx = header.findIndex((h) => h.includes('share'));
  const savesIdx = header.findIndex((h) => h.includes('save'));
  const reachIdx = header.findIndex((h) => h.includes('reach') || h.includes('impression'));
  const viewsIdx = header.findIndex((h) => h.includes('view'));

  const parsedRows: ReturnType<typeof parseInstagramDataExport> = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Basic CSV cell split handling quoted commas
    const cells: string[] = [];
    let insideQuotes = false;
    let currentCell = '';

    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        cells.push(currentCell.trim().replace(/^"|"$/g, ''));
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    cells.push(currentCell.trim().replace(/^"|"$/g, ''));

    if (cells.length < 2) continue;

    const caption = captionIdx !== -1 ? cells[captionIdx] || '' : cells[0] || '';
    const rawType = (typeIdx !== -1 ? cells[typeIdx] || 'image' : 'image').toLowerCase();
    const mediaType: 'image' | 'video' | 'carousel' | 'reel' =
      rawType.includes('reel') ? 'reel' :
      rawType.includes('video') ? 'video' :
      rawType.includes('carousel') || rawType.includes('album') ? 'carousel' : 'image';

    const rawDate = dateIdx !== -1 ? cells[dateIdx] : '';
    let postedAt = new Date().toISOString();
    if (rawDate) {
      const parsedD = new Date(rawDate);
      if (!isNaN(parsedD.getTime())) {
        postedAt = parsedD.toISOString();
      }
    }

    const likes = likesIdx !== -1 ? parseInt(cells[likesIdx], 10) || 0 : 0;
    const comments = commentsIdx !== -1 ? parseInt(cells[commentsIdx], 10) || 0 : 0;
    const shares = sharesIdx !== -1 ? parseInt(cells[sharesIdx], 10) || 0 : 0;
    const saves = savesIdx !== -1 ? parseInt(cells[savesIdx], 10) || 0 : 0;
    const reach = reachIdx !== -1 ? parseInt(cells[reachIdx], 10) || (likes + comments) * 3 : (likes + comments) * 3;
    const views = viewsIdx !== -1 ? parseInt(cells[viewsIdx], 10) || null : null;

    parsedRows.push({
      caption,
      mediaType,
      postedAt,
      likes,
      comments,
      shares,
      saves,
      reach,
      views: views ?? undefined,
    });
  }

  return parsedRows;
}

export async function importPostHistory(
  accountId: string,
  rawFileContent: string
): Promise<ImportSummary> {
  const adminClient = createAdminClient();
  const summary: ImportSummary = {
    totalProcessed: 0,
    importedPosts: 0,
    insertedMetrics: 0,
    errors: [],
  };

  const parsedItems = parseInstagramDataExport(rawFileContent);
  summary.totalProcessed = parsedItems.length;

  if (parsedItems.length === 0) {
    summary.errors.push('No valid post rows found in the uploaded file.');
    return summary;
  }

  // Batch insert posts into DB
  const postRows = parsedItems.map((item, idx) => {
    // Extract hashtags from caption
    const hashtags = (item.caption.match(/#[a-zA-Z0-9_]+/g) || []).map((t) => t.toLowerCase());
    const externalId = `csv_${Date.now()}_${idx}`;

    return {
      account_id: accountId,
      external_id: externalId,
      caption: item.caption,
      hashtags,
      media_type: item.mediaType,
      permalink: `https://instagram.com/p/${externalId}`,
      posted_at: item.postedAt,
    };
  });

  const { data: upsertedPosts, error: postError } = await adminClient
    .from('posts')
    .upsert(postRows, { onConflict: 'account_id,external_id' })
    .select('id, external_id');

  if (postError) {
    summary.errors.push(`Failed to upsert posts: ${postError.message}`);
    return summary;
  }

  summary.importedPosts = upsertedPosts?.length || 0;

  // Insert engagement metrics snapshots
  if (upsertedPosts && upsertedPosts.length > 0) {
    const metricsRows = upsertedPosts.map((dbPost, idx) => {
      const source = parsedItems[idx] || {};
      return {
        post_id: dbPost.id,
        likes: source.likes || 0,
        comments: source.comments || 0,
        shares: source.shares || 0,
        saves: source.saves || 0,
        reach: Math.max(source.reach || 0, (source.likes || 0) + (source.comments || 0)),
        views: source.views ?? null,
        collected_at: new Date().toISOString(),
      };
    });

    const { error: metricsError } = await adminClient.from('engagement_metrics').insert(metricsRows);
    if (metricsError) {
      summary.errors.push(`Metrics snapshot insertion warning: ${metricsError.message}`);
    } else {
      summary.insertedMetrics = metricsRows.length;
    }
  }

  // Update last_sync timestamp on social_accounts
  await adminClient
    .from('social_accounts')
    .update({ last_sync: new Date().toISOString() })
    .eq('id', accountId);

  return summary;
}
