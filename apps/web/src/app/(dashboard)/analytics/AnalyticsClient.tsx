'use client';

import { useState } from 'react';

interface AnalyticsData {
  accounts: Array<{ id: string; platform: string; handle: string }>;
  kpis: {
    totalLikes: number;
    totalComments: number;
    totalReach: number;
    postsCount: number;
    avgScore: number;
  };
  heatmap: Record<string, number>;
  contentPerformance: Array<{ media_type: string; avg_score: number; count: number }>;
  competitor?: {
    handle: string;
    followersCount: number;
    mediaCount: number;
    publicEngagementRate: number;
  };
}

export function AnalyticsClient({ initialData }: { initialData: AnalyticsData }) {
  const [selectedAccountId, setSelectedAccountId] = useState(initialData.accounts[0]?.id || '');
  const [downloading, setDownloading] = useState(false);

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const handleExportCsv = async () => {
    if (!selectedAccountId) return;
    setDownloading(true);
    try {
      const link = document.createElement('a');
      link.href = `/api/analytics/export?accountId=${selectedAccountId}`;
      link.setAttribute('download', `analytics-${selectedAccountId}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setDownloading(false);
    }
  };

  // Find max value in heatmap for normalized coloring
  const maxHeat = Math.max(...Object.values(initialData.heatmap), 1);

  return (
    <div className="space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#373E3E]">
            Analytics &amp; Performance
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Engagement time-series snapshots, slot performance heatmaps, and public competitor
            intelligence.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {initialData.accounts.length > 0 && (
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 focus:outline-none"
            >
              {initialData.accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  @{acc.handle} ({acc.platform})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleExportCsv}
            disabled={downloading || !selectedAccountId}
            className="rounded-lg border border-black bg-transparent px-3.5 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-black hover:text-white disabled:opacity-50"
          >
            {downloading ? 'Exporting...' : '📥 Export CSV'}
          </button>
        </div>
      </div>

      {/* KPI Cards (3-column responsive grid) */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-transform hover:scale-[1.01] hover:shadow-md">
          <span className="text-xs font-semibold text-zinc-400 uppercase">Total Reach</span>
          <div className="mt-4 text-3xl font-extrabold text-[#373E3E]">
            {initialData.kpis.totalReach.toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Across {initialData.kpis.postsCount} analyzed posts
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-transform hover:scale-[1.01] hover:shadow-md">
          <span className="text-xs font-semibold text-zinc-400 uppercase">Engagement Actions</span>
          <div className="mt-4 text-3xl font-extrabold text-[#373E3E]">
            {(initialData.kpis.totalLikes + initialData.kpis.totalComments).toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {initialData.kpis.totalLikes.toLocaleString()} likes &bull;{' '}
            {initialData.kpis.totalComments.toLocaleString()} comments
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-transform hover:scale-[1.01] hover:shadow-md">
          <span className="text-xs font-semibold text-zinc-400 uppercase">Average Perf Score</span>
          <div className="mt-4 text-3xl font-extrabold text-[#373E3E]">
            {initialData.kpis.avgScore.toFixed(3)}
          </div>
          <p className="mt-1 text-xs text-zinc-500">Weighted engagement per reach</p>
        </div>
      </div>

      {/* 7x24 Engagement Timing Heatmap */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#373E3E]">
              Posting Timing Heatmap (Day &times; Hour)
            </h2>
            <p className="text-xs text-zinc-500">
              Aggregated engagement density across the 168 weekly posting slots.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-zinc-500">
            <span>Low</span>
            <div className="h-2 w-16 rounded bg-gradient-to-r from-zinc-100 to-indigo-600" />
            <span>High</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[650px]">
            {/* Hour headers */}
            <div className="grid grid-cols-[40px_repeat(24,1fr)] gap-1 text-center font-mono text-[9px] text-zinc-400">
              <div />
              {hours.map((h) => (
                <div key={h}>{h % 3 === 0 ? `${h}h` : ''}</div>
              ))}
            </div>

            {/* Grid rows */}
            {days.map((dayName, dayIdx) => (
              <div
                key={dayName}
                className="mt-1 grid grid-cols-[40px_repeat(24,1fr)] items-center gap-1"
              >
                <span className="text-[10px] font-semibold text-zinc-500">{dayName}</span>
                {hours.map((hour) => {
                  const key = `${dayIdx}-${hour}`;
                  const score = initialData.heatmap[key] || 0;
                  const intensity = Math.min(score / maxHeat, 1);
                  return (
                    <div
                      key={hour}
                      title={`${dayName} ${hour}:00 — Score: ${score.toFixed(2)}`}
                      className="h-5 rounded-xs transition-colors hover:ring-1 hover:ring-black"
                      style={{
                        backgroundColor:
                          intensity > 0
                            ? `rgba(79, 70, 229, ${Math.max(intensity, 0.15)})`
                            : '#f4f4f5',
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Content Types & Competitor Public Discovery */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Content Type Performance */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-[#373E3E]">Content Type Breakdown</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Average performance score across media formats.
          </p>

          <div className="mt-6 space-y-4">
            {initialData.contentPerformance.map((item) => (
              <div key={item.media_type}>
                <div className="flex justify-between text-xs font-semibold text-zinc-700">
                  <span className="uppercase">
                    {item.media_type} ({item.count} posts)
                  </span>
                  <span>{item.avg_score.toFixed(3)}</span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-zinc-100">
                  <div
                    className="h-2 rounded-full bg-[#373E3E]"
                    style={{
                      width: `${Math.min((item.avg_score / (initialData.kpis.avgScore || 1)) * 50, 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Competitor Public Discovery View (D7) */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#373E3E]">Public Competitor Benchmark</h2>
            <span className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600">
              Business Discovery Only
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">
            Public metrics via Meta Business Discovery API (reach/impressions unavailable for
            external accounts).
          </p>

          {initialData.competitor ? (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-zinc-50 p-4">
                <div>
                  <div className="text-sm font-bold text-zinc-800">
                    @{initialData.competitor.handle}
                  </div>
                  <div className="text-xs text-zinc-400">Public profile benchmark</div>
                </div>
                <span className="text-xs font-semibold text-emerald-600">Active</span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg border border-zinc-100 p-3">
                  <div className="text-xs text-zinc-400 uppercase">Followers</div>
                  <div className="mt-1 text-base font-bold text-zinc-800">
                    {initialData.competitor.followersCount.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-lg border border-zinc-100 p-3">
                  <div className="text-xs text-zinc-400 uppercase">Posts</div>
                  <div className="mt-1 text-base font-bold text-zinc-800">
                    {initialData.competitor.mediaCount}
                  </div>
                </div>
                <div className="rounded-lg border border-zinc-100 p-3">
                  <div className="text-xs text-zinc-400 uppercase">Public ER</div>
                  <div className="mt-1 text-base font-bold text-zinc-800">
                    {(initialData.competitor.publicEngagementRate * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-12 text-center text-xs text-zinc-400">
              No competitor handle added yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
