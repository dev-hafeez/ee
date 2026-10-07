'use client';

import { useState } from 'react';

export interface CalendarPost {
  id: string;
  caption: string;
  hashtags: string[];
  media_type: string;
  scheduled_at: string;
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED' | 'CANCELLED';
  platform?: string;
}

export interface RecommendedSlot {
  day: number;
  hour: number;
  confidence: number;
}

export function CalendarClient({
  initialPosts,
  _accountId,
}: {
  initialPosts: CalendarPost[];
  _accountId?: string;
  recommendedSlots?: RecommendedSlot[];
}) {
  const [posts, setPosts] = useState<CalendarPost[]>(initialPosts);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('#growth #ai');
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'reel' | 'carousel'>('image');
  const [scheduledAt, setScheduledAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption || !scheduledAt) return;

    setSubmitting(true);
    try {
      const newPost: CalendarPost = {
        id: `local_${Date.now()}`,
        caption,
        hashtags: hashtags.split(' ').filter(Boolean),
        media_type: mediaType,
        scheduled_at: new Date(scheduledAt).toISOString(),
        status: 'SCHEDULED',
        platform: 'instagram',
      };

      setPosts([newPost, ...posts]);
      setIsModalOpen(false);
      setCaption('');
      setScheduledAt('');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: CalendarPost['status']) => {
    switch (status) {
      case 'PUBLISHED':
        return 'bg-emerald-100 text-emerald-800';
      case 'PUBLISHING':
        return 'bg-blue-100 text-blue-800 animate-pulse';
      case 'SCHEDULED':
        return 'bg-indigo-100 text-indigo-800';
      case 'FAILED':
        return 'bg-rose-100 text-rose-800';
      case 'CANCELLED':
        return 'bg-zinc-200 text-zinc-600';
      default:
        return 'bg-amber-100 text-amber-800';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#373E3E]">
            Content Calendar &amp; Publishing
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Schedule posts, track publishing lifecycle (SRDS 5.5), and align with
            quantum-recommended slots.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="rounded-lg border border-black bg-transparent px-4 py-2 text-xs font-semibold text-black transition-colors hover:bg-black hover:text-white"
        >
          + Schedule New Post
        </button>
      </div>

      {/* Recommended Slots Banner */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
        <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
          <span>⚡ Quantum Recommended Windows This Week:</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="rounded-md bg-white px-2.5 py-1 font-semibold text-indigo-700 shadow-xs">
            Tue 19:00 (94% conf)
          </span>
          <span className="rounded-md bg-white px-2.5 py-1 font-semibold text-indigo-700 shadow-xs">
            Wed 18:00 (91% conf)
          </span>
          <span className="rounded-md bg-white px-2.5 py-1 font-semibold text-indigo-700 shadow-xs">
            Thu 20:00 (88% conf)
          </span>
          <span className="rounded-md bg-white px-2.5 py-1 font-semibold text-indigo-700 shadow-xs">
            Sun 17:00 (82% conf)
          </span>
        </div>
      </div>

      {/* Weekly View Columns */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-7">
        {days.map((dayName, dayIdx) => {
          // Filter posts for this weekday
          const dayPosts = posts.filter((p) => {
            const d = new Date(p.scheduled_at);
            // Convert getDay (0=Sun) to 0=Mon
            const mappedDay = (d.getDay() + 6) % 7;
            return mappedDay === dayIdx;
          });

          return (
            <div
              key={dayName}
              className="flex min-h-[300px] flex-col rounded-xl border border-zinc-200 bg-white p-3 shadow-xs"
            >
              <div className="border-b border-zinc-100 pb-2 text-center text-xs font-bold text-zinc-700">
                {dayName}
              </div>

              <div className="mt-3 flex-1 space-y-2.5">
                {dayPosts.map((post) => (
                  <div
                    key={post.id}
                    className="rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 text-xs shadow-xs transition hover:border-black"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-zinc-500">
                        {new Date(post.scheduled_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${getStatusBadge(
                          post.status
                        )}`}
                      >
                        {post.status}
                      </span>
                    </div>

                    <p className="mt-2 line-clamp-3 text-zinc-800">{post.caption}</p>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400">
                      <span className="uppercase">{post.media_type}</span>
                    </div>
                  </div>
                ))}

                {dayPosts.length === 0 && (
                  <div className="py-12 text-center text-[11px] text-zinc-300">No posts</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Schedule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h2 className="text-base font-bold text-[#373E3E]">Schedule New Post</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700">Post Caption</label>
                <textarea
                  required
                  rows={4}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Draft your post caption here..."
                  className="mt-1 w-full rounded-lg border border-zinc-200 p-2.5 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700">Hashtags</label>
                <input
                  type="text"
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  placeholder="#growth #creator"
                  className="mt-1 w-full rounded-lg border border-zinc-200 p-2 text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700">Media Type</label>
                  <select
                    value={mediaType}
                    onChange={(e) =>
                      setMediaType(e.target.value as 'image' | 'video' | 'reel' | 'carousel')
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white p-2 text-xs focus:outline-none"
                  >
                    <option value="reel">Reel</option>
                    <option value="carousel">Carousel</option>
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700">
                    Scheduled Date &amp; Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-200 p-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-zinc-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg border border-black bg-transparent px-4 py-2 text-xs font-semibold text-black transition-colors hover:bg-black hover:text-white"
                >
                  {submitting ? 'Scheduling...' : 'Confirm Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
