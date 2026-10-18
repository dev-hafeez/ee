'use client';

import { useState } from 'react';
import { SyncNowButton } from '@/components/social/SyncNowButton';
import { CompetitorDiscoveryCard } from '@/components/social/CompetitorDiscoveryCard';
import { CrossUserBenchmarkCard } from '@/components/analytics/CrossUserBenchmarkCard';
import { DataExportUploadModal } from '@/components/social/DataExportUploadModal';
import { CrossUserBenchmarkResult } from '@/lib/analytics/benchmarks';

interface AnalyticsData {
  accounts: Array<{ id: string; platform: string; handle: string; last_sync?: string | null }>;
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
    followersCount: number | null;
    mediaCount: number | null;
    publicEngagementRate: number | null;
  };
  benchmarks?: CrossUserBenchmarkResult;
}

export function AnalyticsClient({ initialData }: { initialData: AnalyticsData }) {
  const [selectedAccountId, setSelectedAccountId] = useState(initialData.accounts[0]?.id || '');
  const [downloading, setDownloading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const selectedAccount = initialData.accounts.find((a) => a.id === selectedAccountId);

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
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#373E3E]">
            Analytics &amp; Performance
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Engagement time-series snapshots, slot performance heatmaps, and privacy-preserving collective benchmarks.
          </p>

          {selectedAccount && (
            <div className="mt-3">
              <SyncNowButton
                accountId={selectedAccount.id}
                lastSync={selectedAccount.last_sync}
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {initialData.accounts.length > 0 && (
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 focus:outline-none"
            >
              {initialData.accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  @{acc.handle} ({acc.platform})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setIsUploadModalOpen(true)}
            disabled={!selectedAccountId}
            className="btn-outline px-3.5 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            📤 Import CSV/Export
          </button>

          <button
            onClick={handleExportCsv}
            disabled={downloading || !selectedAccountId}
            className="btn-outline px-3.5 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            {downloading ? 'Exporting...' : '📥 Export CSV'}
          </button>
        </div>
      </div>

      {/* KPI Cards (3-column responsive grid) */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="card-elevation rounded-xl p-6">
          <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider">Total Reach</span>
          <div className="mt-4 text-3xl font-extrabold text-[#373E3E]">
            {initialData.kpis.totalReach.toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-zinc-600">
            Across {initialData.kpis.postsCount} analyzed posts
          </p>
        </div>

        <div className="card-elevation rounded-xl p-6">
          <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider">Engagement Actions</span>
          <div className="mt-4 text-3xl font-extrabold text-[#373E3E]">
            {(initialData.kpis.totalLikes + initialData.kpis.totalComments).toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-zinc-600">
            {initialData.kpis.totalLikes.toLocaleString()} likes &bull;{' '}
            {initialData.kpis.totalComments.toLocaleString()} comments
          </p>
        </div>

        <div className="card-elevation rounded-xl p-6">
          <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider">Average Perf Score</span>
          <div className="mt-4 text-3xl font-extrabold text-[#373E3E]">
            {initialData.kpis.avgScore.toFixed(3)}
          </div>
          <p className="mt-1 text-xs text-zinc-600">Weighted engagement per reach</p>
        </div>
      </div>

      {/* 7x24 Engagement Timing Heatmap */}
      <div className="card-elevation rounded-xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#373E3E]">
              Posting Timing Heatmap (Day &times; Hour)
            </h2>
            <p className="text-xs text-zinc-600">
              Aggregated engagement density across the 168 weekly posting slots.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-zinc-600">
            <span>Low</span>
            <div className="h-2 w-16 rounded bg-gradient-to-r from-zinc-200 to-indigo-600" />
            <span>High</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[650px]">
            {/* Hour headers */}
            <div className="grid grid-cols-[40px_repeat(24,1fr)] gap-1 text-center font-mono text-[9px] text-zinc-500">
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
                <span className="text-[10px] font-bold text-zinc-700">{dayName}</span>
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

      {/* Middle Grid: Content Types & Competitor Public Discovery Card */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Content Type Performance */}
        <div className="card-elevation rounded-xl p-6">
          <h2 className="text-base font-bold text-[#373E3E]">Content Type Breakdown</h2>
          <p className="mt-0.5 text-xs text-zinc-600">
            Average performance score across media formats.
          </p>

          <div className="mt-6 space-y-4">
            {initialData.contentPerformance.length > 0 ? (
              initialData.contentPerformance.map((item) => (
                <div key={item.media_type}>
                  <div className="flex justify-between text-xs font-semibold text-zinc-800">
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
              ))
            ) : (
              <div className="py-8 text-center text-xs text-zinc-500">
                No content performance data found. Import post history to analyze formats.
              </div>
            )}
          </div>
        </div>

        {/* Competitor Public Discovery Card (Interactive Paste Form + Disclaimers) */}
        <CompetitorDiscoveryCard
          initialCompetitor={initialData.competitor}
          accountId={selectedAccountId}
        />
      </div>

      {/* Cross-User Aggregated Anonymous Benchmarks Card */}
      {initialData.benchmarks && (
        <CrossUserBenchmarkCard benchmarkData={initialData.benchmarks} />
      )}

      {/* Post History CSV / JSON Export Upload Modal */}
      {selectedAccount && (
        <DataExportUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          accountId={selectedAccount.id}
          accountHandle={selectedAccount.handle}
        />
      )}
    </div>
  );
}
