'use client';

import { useState } from 'react';
import { discoverCompetitorProfile, CompetitorDiscoveryResult } from '@/app/(dashboard)/analytics/competitor-actions';

interface InitialCompetitor {
  handle: string;
  followersCount: number | null;
  mediaCount: number | null;
  publicEngagementRate: number | null;
}

interface CompetitorDiscoveryCardProps {
  initialCompetitor?: InitialCompetitor | null;
  accountId?: string;
}

export function CompetitorDiscoveryCard({
  initialCompetitor,
  accountId,
}: CompetitorDiscoveryCardProps) {
  const [profileInput, setProfileInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [competitor, setCompetitor] = useState<InitialCompetitor | null>(initialCompetitor || null);
  const [recentPosts, setRecentPosts] = useState<
    Array<{ externalId: string; caption: string; likes: number; comments: number }>
  >([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profileInput.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res: CompetitorDiscoveryResult = await discoverCompetitorProfile(
        profileInput,
        accountId
      );

      if (!res.success) {
        setError(res.error || 'Failed to query competitor profile');
      } else {
        setCompetitor({
          handle: res.handle || profileInput,
          followersCount: res.followersCount ?? null,
          mediaCount: res.mediaCount ?? null,
          publicEngagementRate: res.publicEngagementRate ?? null,
        });
        if (res.recentPosts) {
          setRecentPosts(res.recentPosts);
        }
        setProfileInput('');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card-elevation rounded-xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-4">
        <div>
          <h2 className="text-base font-bold text-[#373E3E]">Public Competitor Benchmark</h2>
          <p className="mt-0.5 text-xs text-zinc-600">
            Official Meta Business Discovery API (no web scraping, no third-party APIs).
          </p>
        </div>
        <span className="rounded bg-zinc-100 px-2.5 py-1 text-[10px] font-bold text-zinc-700 uppercase">
          Meta Business Discovery
        </span>
      </div>

      {/* Paste input form */}
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={profileInput}
          onChange={(e) => setProfileInput(e.target.value)}
          placeholder="Paste Instagram profile link or @handle (e.g. @creators)"
          className="flex-1 rounded-lg border border-zinc-200 px-3.5 py-2 text-xs text-zinc-900 placeholder:text-zinc-500 focus:border-[#373E3E] focus:ring-1 focus:ring-[#373E3E] focus:outline-none"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !profileInput.trim()}
          className="btn-outline px-4 py-2 text-xs font-semibold disabled:opacity-50"
        >
          {loading ? 'Discovering...' : 'Discover Public Data'}
        </button>
      </form>

      {/* Transparency Disclaimer Banner */}
      <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 text-[11px] text-zinc-600">
        <span className="font-semibold text-zinc-800">Public data only:</span> Reach, impressions, and saves are private and unavailable for external accounts per Meta API limitations. Only public metrics for Business/Creator accounts can be returned.
      </div>

      {/* Error / Diagnostic message */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          <p className="font-semibold">Discovery Notice</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {/* Discovered metrics display */}
      {competitor ? (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-zinc-50 p-4 border border-zinc-100">
            <div>
              <div className="text-sm font-bold text-zinc-900">@{competitor.handle}</div>
              <div className="text-xs text-zinc-600">Public profile benchmark</div>
            </div>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              Verified Public
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border border-zinc-200 p-3">
              <div className="text-xs font-bold text-zinc-600 uppercase tracking-wider">Followers</div>
              <div className="mt-1 text-base font-extrabold text-zinc-900">
                {competitor.followersCount !== null
                  ? competitor.followersCount.toLocaleString()
                  : '—'}
              </div>
            </div>
            <div className="rounded-lg border border-zinc-200 p-3">
              <div className="text-xs font-bold text-zinc-600 uppercase tracking-wider">Public Posts</div>
              <div className="mt-1 text-base font-extrabold text-zinc-900">
                {competitor.mediaCount !== null ? competitor.mediaCount : '—'}
              </div>
            </div>
            <div className="rounded-lg border border-zinc-200 p-3">
              <div className="text-xs font-bold text-zinc-600 uppercase tracking-wider">Public ER</div>
              <div className="mt-1 text-base font-extrabold text-zinc-900">
                {competitor.publicEngagementRate !== null
                  ? `${(competitor.publicEngagementRate * 100).toFixed(2)}%`
                  : '—'}
              </div>
            </div>
          </div>

          {recentPosts.length > 0 && (
            <div className="mt-4 border-t border-zinc-100 pt-3">
              <span className="text-xs font-bold text-zinc-700">Recent Public Posts (Sample)</span>
              <div className="mt-2 space-y-2">
                {recentPosts.slice(0, 3).map((post) => (
                  <div
                    key={post.externalId}
                    className="flex items-center justify-between rounded bg-zinc-50 p-2 text-xs"
                  >
                    <span className="max-w-xs truncate text-zinc-800">
                      {post.caption || 'No caption'}
                    </span>
                    <span className="text-zinc-600 font-medium">
                      ❤️ {post.likes.toLocaleString()} &bull; 💬 {post.comments.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-8 py-6 text-center text-xs text-zinc-500">
          Paste an Instagram profile URL or handle above to inspect public follower counts and engagement rates.
        </div>
      )}
    </div>
  );
}
