'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SyncNowButtonProps {
  accountId: string;
  lastSync?: string | null;
  className?: string;
  showDelayedNotice?: boolean;
}

export function SyncNowButton({
  accountId,
  lastSync,
  className = '',
  showDelayedNotice = true,
}: SyncNowButtonProps) {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formattedLastSync = lastSync
    ? new Date(lastSync).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Never';

  async function handleSync() {
    // 5-minute throttle check to protect Meta API rate limits
    if (lastSync) {
      const msSinceLastSync = Date.now() - new Date(lastSync).getTime();
      const fiveMinutesMs = 5 * 60 * 1000;
      if (msSinceLastSync < fiveMinutesMs) {
        const remainingMinutes = Math.ceil((fiveMinutesMs - msSinceLastSync) / 60000);
        setFeedback(`Throttled: Account was synced recently. Try again in ${remainingMinutes}m to protect Meta API rate limits.`);
        setTimeout(() => setFeedback(null), 5000);
        return;
      }
    }

    setIsSyncing(true);
    setFeedback(null);
    setError(null);

    try {
      const res = await fetch('/api/data/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sync with provider');
      }

      setFeedback(`Successfully synced ${data.syncedPosts} posts in ${data.durationMs}ms`);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      setError(msg);
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSync}
          disabled={isSyncing}
          className="btn-outline px-3.5 py-1.5 text-xs font-semibold disabled:opacity-50"
          aria-label="Sync account data from Meta"
        >
          {isSyncing ? (
            <>
              <span className="mr-1.5 animate-spin">🔄</span>
              Syncing...
            </>
          ) : (
            <>
              <span className="mr-1.5">🔄</span>
              Sync Now
            </>
          )}
        </button>

        <span className="text-xs text-zinc-600">
          Last synced: <span className="font-medium text-zinc-900">{formattedLastSync}</span>
        </span>
      </div>

      {feedback && (
        <div className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 border border-emerald-200">
          {feedback}
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-800 border border-red-200">
          {error}
        </div>
      )}

      {showDelayedNotice && (
        <p className="text-[11px] leading-tight text-zinc-500">
          <span className="font-semibold text-zinc-700">Meta Metric Delay:</span> Reach & impressions are delayed 24–48 hours by Meta Graph API. Likes and comments update immediately.
        </p>
      )}
    </div>
  );
}
