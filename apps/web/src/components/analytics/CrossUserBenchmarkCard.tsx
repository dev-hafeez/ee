'use client';

import Link from 'next/link';
import { CrossUserBenchmarkResult } from '@/lib/analytics/benchmarks';

interface CrossUserBenchmarkCardProps {
  benchmarkData: CrossUserBenchmarkResult;
}

export function CrossUserBenchmarkCard({ benchmarkData }: CrossUserBenchmarkCardProps) {
  const { available, contributingAccounts, requiredAccounts, thresholdMessage, metrics } =
    benchmarkData;

  const progressPercent = Math.min(
    Math.round((contributingAccounts / requiredAccounts) * 100),
    100
  );

  return (
    <div className="card-elevation rounded-xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-4">
        <div>
          <h2 className="text-base font-bold text-[#373E3E]">Platform Cross-Creator Benchmarks</h2>
          <p className="mt-0.5 text-xs text-zinc-600">
            Aggregated &amp; anonymized performance metrics across opted-in creators.
          </p>
        </div>
        <span className="rounded bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700 uppercase">
          K ≥ 20 Anonymity Shield
        </span>
      </div>

      {!available ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
            <div className="flex items-start gap-3">
              <span className="text-lg">🛡️</span>
              <div>
                <h3 className="text-xs font-bold text-amber-900">Not enough data yet</h3>
                <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                  {thresholdMessage ||
                    `To preserve K-anonymity (K ≥ 20) and prevent reverse-identification of creator performance, at least ${requiredAccounts} opted-in accounts are required.`}
                </p>
              </div>
            </div>

            {/* Threshold progress indicator */}
            <div className="mt-4 pt-3 border-t border-amber-200/60">
              <div className="flex justify-between text-xs font-semibold text-amber-900">
                <span>Opted-In Accounts</span>
                <span>
                  {contributingAccounts} / {requiredAccounts} Required
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full rounded-full bg-amber-200/60">
                <div
                  className="h-2 rounded-full bg-amber-700 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600">
            <span>Want to contribute anonymized stats to unlock collective benchmarks?</span>
            <Link
              href="/settings"
              className="font-bold text-[#373E3E] hover:underline"
            >
              Settings &rarr;
            </Link>
          </div>
        </div>
      ) : metrics ? (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-zinc-200 p-4 text-center">
              <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider">
                Platform Median ER
              </span>
              <div className="mt-2 text-2xl font-extrabold text-[#373E3E]">
                {(metrics.medianEngagementRate * 100).toFixed(2)}%
              </div>
              <span className="text-[10px] text-zinc-600">
                IQR: {(metrics.p25EngagementRate * 100).toFixed(1)}% &ndash;{' '}
                {(metrics.p75EngagementRate * 100).toFixed(1)}%
              </span>
            </div>

            <div className="rounded-lg border border-zinc-200 p-4 text-center">
              <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider">
                Average Weekly Posts
              </span>
              <div className="mt-2 text-2xl font-extrabold text-[#373E3E]">
                {metrics.averagePostsPerWeek.toFixed(1)}
              </div>
              <span className="text-[10px] text-zinc-600">Cadence across cohorts</span>
            </div>

            <div className="rounded-lg border border-zinc-200 p-4 text-center">
              <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider">
                Top Platform Format
              </span>
              <div className="mt-2 text-2xl font-extrabold text-[#373E3E]">
                {metrics.formatDistribution.reel >= metrics.formatDistribution.carousel
                  ? 'Reels'
                  : 'Carousels'}
              </div>
              <span className="text-[10px] text-zinc-600">
                {(metrics.formatDistribution.reel * 100).toFixed(0)}% Reels &bull;{' '}
                {(metrics.formatDistribution.carousel * 100).toFixed(0)}% Carousels
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-[11px] text-zinc-600">
            <span className="font-semibold text-zinc-800">Privacy Guarantee:</span> Data aggregated across {contributingAccounts} verified creator accounts. Zero individual handles, post captions, or account identifiers are retained or displayed in benchmark calculations.
          </div>
        </div>
      ) : null}
    </div>
  );
}
