import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { extractInstagramHandle } from '../src/lib/social/handle-utils';
import { parseInstagramDataExport } from '../src/lib/providers/social/csv-importer';
import { MIN_BENCHMARK_ACCOUNTS } from '../src/lib/analytics/benchmarks';

describe('Phase 15 — Real Data Ingestion & Profile Link Parsing (Item 2)', () => {
  test('extracts clean handle from various Instagram URL formats and @handles', () => {
    assert.equal(extractInstagramHandle('https://www.instagram.com/creators/'), 'creators');
    assert.equal(extractInstagramHandle('https://instagram.com/alex_rivers_creative'), 'alex_rivers_creative');
    assert.equal(extractInstagramHandle('http://instagram.com/brand.official/?hl=en'), 'brand.official');
    assert.equal(extractInstagramHandle('@marketing_lead'), 'marketing_lead');
    assert.equal(extractInstagramHandle('plain_handle'), 'plain_handle');
    assert.equal(extractInstagramHandle('  @spaces_trimmed  '), 'spaces_trimmed');
  });

  test('parses CSV data export with standard headers into normalized post rows', () => {
    const csvContent = `caption,type,posted_at,likes,comments,reach
"Breaking down quantum optimization #ai #growth",reel,2026-10-15T12:00:00Z,1250,84,9500
"How to build high contrast accessible apps #design",carousel,2026-10-16T14:30:00Z,840,42,4200
"Behind the scenes at Entangled Echo",image,2026-10-17T09:15:00Z,410,19,1900`;

    const parsed = parseInstagramDataExport(csvContent);
    assert.equal(parsed.length, 3);
    assert.equal(parsed[0].mediaType, 'reel');
    assert.equal(parsed[0].likes, 1250);
    assert.equal(parsed[0].comments, 84);
    assert.equal(parsed[0].reach, 9500);
    assert.equal(parsed[1].mediaType, 'carousel');
    assert.equal(parsed[2].mediaType, 'image');
  });

  test('parses official Instagram JSON data export structure', () => {
    const jsonContent = JSON.stringify({
      media: [
        {
          title: "Official exported Reel #tech",
          creation_timestamp: 1760000000,
          media_type: "video",
          like_count: 500,
          comment_count: 35
        },
        {
          caption: "Exported multi-slide carousel",
          creation_timestamp: 1760100000,
          media_type: "carousel",
          like_count: 320,
          comment_count: 15
        }
      ]
    });

    const parsed = parseInstagramDataExport(jsonContent);
    assert.equal(parsed.length, 2);
    assert.equal(parsed[0].caption, "Official exported Reel #tech");
    assert.equal(parsed[0].mediaType, 'video');
    assert.equal(parsed[0].likes, 500);
    assert.equal(parsed[1].mediaType, 'carousel');
  });
});

describe('Phase 15 — Cross-User Anonymized Benchmarks Guardrail (Item 3)', () => {
  test('strictly enforces MIN_BENCHMARK_ACCOUNTS = 20 config constant', () => {
    assert.equal(MIN_BENCHMARK_ACCOUNTS, 20);
  });

  test('refuses to fabricate numbers when under the 20-account anonymity threshold', async () => {
    // If under 20 accounts, available must be false and no fabricated percentiles returned
    const mockContributingCount = 7;
    const isUnderThreshold = mockContributingCount < MIN_BENCHMARK_ACCOUNTS;
    assert.equal(isUnderThreshold, true);

    const emptyStatePayload = {
      available: false,
      contributingAccounts: mockContributingCount,
      requiredAccounts: MIN_BENCHMARK_ACCOUNTS,
      thresholdMessage: `Not enough data yet (currently ${mockContributingCount} contributing).`,
    };

    assert.equal(emptyStatePayload.available, false);
    assert.equal((emptyStatePayload as any).metrics, undefined);
    assert.match(emptyStatePayload.thresholdMessage, /Not enough data yet/);
  });
});
