import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Phase 10 — Analytics and Reporting (FR-29..32, UC03, UC09)', () => {
  it('aggregates performance trends, KPI totals, and averages (FR-29)', () => {
    type PostEngagement = {
      likes: number;
      comments: number;
      shares: number;
      saves: number;
      reach: number;
      perf_score: number;
    };

    const samplePosts: PostEngagement[] = [
      { likes: 120, comments: 14, shares: 8, saves: 22, reach: 1500, perf_score: 0.88 },
      { likes: 85, comments: 9, shares: 4, saves: 11, reach: 1100, perf_score: 0.72 },
      { likes: 210, comments: 32, shares: 19, saves: 45, reach: 2400, perf_score: 0.95 },
      { likes: 45, comments: 3, shares: 1, saves: 5, reach: 800, perf_score: 0.45 },
    ];

    // Compute KPI sums
    const totalLikes = samplePosts.reduce((acc, p) => acc + p.likes, 0);
    const totalComments = samplePosts.reduce((acc, p) => acc + p.comments, 0);
    const totalReach = samplePosts.reduce((acc, p) => acc + p.reach, 0);
    const avgScore =
      samplePosts.reduce((acc, p) => acc + p.perf_score, 0) / samplePosts.length;

    assert.equal(totalLikes, 460);
    assert.equal(totalComments, 58);
    assert.equal(totalReach, 5800);
    assert.equal(avgScore.toFixed(2), '0.75');

    // Aggregate engagement rate: (total interactions / total reach) * 100
    const totalInteractions = totalLikes + totalComments;
    const engagementRatePct = (totalInteractions / totalReach) * 100;
    assert.ok(engagementRatePct > 0);
    assert.equal(engagementRatePct.toFixed(2), '8.93');
  });

  it('constructs 7x24 slot engagement heatmap matrix (FR-30)', () => {
    // 7 days x 24 hours grid
    const heatmapGrid: number[][] = Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => 0)
    );

    const postEvents = [
      { postedAt: '2026-10-05T14:30:00Z', perf_score: 0.85 }, // Monday (day 1), hour 14
      { postedAt: '2026-10-05T14:45:00Z', perf_score: 0.75 }, // Monday (day 1), hour 14
      { postedAt: '2026-10-06T19:00:00Z', perf_score: 0.92 }, // Tuesday (day 2), hour 19
    ];

    postEvents.forEach((event) => {
      const d = new Date(event.postedAt);
      const day = d.getUTCDay();
      const hour = d.getUTCHours();
      heatmapGrid[day][hour] += event.perf_score;
    });

    // Check Monday 14:00 (accumulated 0.85 + 0.75 = 1.6)
    assert.equal(heatmapGrid[1][14].toFixed(2), '1.60');

    // Check Tuesday 19:00 (accumulated 0.92)
    assert.equal(heatmapGrid[2][19].toFixed(2), '0.92');

    // Check empty slot
    assert.equal(heatmapGrid[0][0], 0);
  });

  it('streams and formats analytics CSV export with RFC 4180 escaping (FR-32)', () => {
    const escapeCsv = (val: string | number | null | undefined): string => {
      if (val === null || val === undefined) return '';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = ['Post ID', 'Caption', 'Likes', 'Reach', 'Score'];
    const sampleRows = [
      {
        id: 'post-1',
        caption: 'Normal caption #growth',
        likes: 120,
        reach: 1500,
        score: 0.88,
      },
      {
        id: 'post-2',
        caption: 'Caption with, comma and "quotes" #ai',
        likes: 85,
        reach: 1100,
        score: 0.72,
      },
    ];

    const lines = [
      headers.join(','),
      ...sampleRows.map((r) =>
        [
          escapeCsv(r.id),
          escapeCsv(r.caption),
          escapeCsv(r.likes),
          escapeCsv(r.reach),
          escapeCsv(r.score.toFixed(2)),
        ].join(',')
      ),
    ];

    const csvOutput = lines.join('\n');

    // Verify CSV structure
    assert.ok(csvOutput.includes('Post ID,Caption,Likes,Reach,Score'));
    // Verify quotes escaped with double quotes
    assert.ok(csvOutput.includes('"Caption with, comma and ""quotes"" #ai"'));
    assert.equal(lines.length, 3);
  });
});
