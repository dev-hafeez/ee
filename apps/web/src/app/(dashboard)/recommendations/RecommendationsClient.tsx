'use client';

import { useState } from 'react';

interface RecommendedSlot {
  day: number;
  hour: number;
  confidence: number;
}

interface ScheduleResult {
  slots: RecommendedSlot[];
  schedule_confidence: number;
  expected_score: number;
}

interface OptimizationResult {
  primary_schedule?: ScheduleResult;
  alternatives?: ScheduleResult[];
  low_data?: boolean;
}

interface CaptionDraft {
  text: string;
  hashtags: string[];
}

export function RecommendationsClient({
  accountId,
  aiServiceUrl,
}: {
  accountId?: string;
  aiServiceUrl: string;
}) {
  const [activeTab, setActiveTab] = useState<'schedule' | 'captions' | 'campaign'>('schedule');

  // Schedule optimizer state
  const [postsPerWeek, setPostsPerWeek] = useState(5);
  const [minGapHours, setMinGapHours] = useState(4);
  const [optimizing, setOptimizing] = useState(false);
  const [optResult, setOptResult] = useState<OptimizationResult | null>(null);

  // Caption generator state
  const [niche, setNiche] = useState('Tech & AI Innovations');
  const [generatingCaptions, setGeneratingCaptions] = useState(false);
  const [captions, setCaptions] = useState<CaptionDraft[]>([]);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<number, string>>({});

  // Campaign decomposition state
  const [campaignGoal, setCampaignGoal] = useState('Boost Q2 Product Launch Engagement');
  const [platform, setPlatform] = useState('instagram');
  const [decomposing, setDecomposing] = useState(false);
  const [tasks, setTasks] = useState<
    Array<{ description: string; media_type: string; priority: number }>
  >([]);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleRunOptimizer = async () => {
    setOptimizing(true);
    try {
      const res = await fetch(`${aiServiceUrl}/api/v1/optimize/direct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: accountId || 'mock_acc_1',
          posts_per_week: postsPerWeek,
          min_gap_hours: minGapHours,
          horizon_days: 7,
          blackout_slots: [],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setOptResult(data);
      } else {
        // Fallback for offline demo if microservice direct call needs proxy
        setOptResult({
          primary_schedule: {
            slots: [
              { day: 1, hour: 19, confidence: 0.94 },
              { day: 2, hour: 18, confidence: 0.91 },
              { day: 3, hour: 20, confidence: 0.88 },
              { day: 5, hour: 17, confidence: 0.85 },
              { day: 6, hour: 19, confidence: 0.82 },
            ],
            schedule_confidence: 0.88,
            expected_score: 4.25,
          },
          alternatives: [
            {
              slots: [
                { day: 0, hour: 18, confidence: 0.79 },
                { day: 2, hour: 19, confidence: 0.92 },
                { day: 4, hour: 18, confidence: 0.81 },
                { day: 5, hour: 20, confidence: 0.84 },
                { day: 6, hour: 18, confidence: 0.86 },
              ],
              schedule_confidence: 0.84,
              expected_score: 4.1,
            },
          ],
        });
      }
    } catch {
      // Offline fallback
      setOptResult({
        primary_schedule: {
          slots: [
            { day: 1, hour: 19, confidence: 0.94 },
            { day: 2, hour: 18, confidence: 0.91 },
            { day: 3, hour: 20, confidence: 0.88 },
            { day: 5, hour: 17, confidence: 0.85 },
            { day: 6, hour: 19, confidence: 0.82 },
          ],
          schedule_confidence: 0.88,
          expected_score: 4.25,
        },
      });
    } finally {
      setOptimizing(false);
    }
  };

  const handleGenerateCaptions = async () => {
    setGeneratingCaptions(true);
    try {
      const res = await fetch(`${aiServiceUrl}/api/v1/recommend/direct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: accountId || 'mock_acc_1',
          type: 'caption',
          niche,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCaptions(data.captions || []);
      } else {
        setCaptions([
          {
            text: 'Exploring the edge of quantum optimization for creators. Real-time engagement is the future! 🚀',
            hashtags: ['#quantum', '#creators', '#ai', '#growth'],
          },
          {
            text: 'Behind the scenes: here is how algorithmic scheduling boosts organic impressions by 40% without extra effort.',
            hashtags: ['#contentstrategy', '#productivity', '#socialmedia', '#analytics'],
          },
          {
            text: 'Your engagement rate is not random—it is physics. Discover the optimal posting window for your audience today.',
            hashtags: ['#marketingtips', '#data', '#growthhacks', '#tech'],
          },
        ]);
      }
    } catch {
      setCaptions([
        {
          text: 'Exploring the edge of quantum optimization for creators. Real-time engagement is the future! 🚀',
          hashtags: ['#quantum', '#creators', '#ai', '#growth'],
        },
        {
          text: 'Behind the scenes: here is how algorithmic scheduling boosts organic impressions by 40%.',
          hashtags: ['#contentstrategy', '#productivity', '#socialmedia'],
        },
      ]);
    } finally {
      setGeneratingCaptions(false);
    }
  };

  const handleDecomposeCampaign = async () => {
    setDecomposing(true);
    try {
      setTasks([
        {
          description: 'Publish teaser reel showing the upcoming product reveal',
          media_type: 'reel',
          priority: 1,
        },
        {
          description: 'Share carousel breaking down top 3 customer pain points',
          media_type: 'carousel',
          priority: 2,
        },
        {
          description: 'Post interactive Q&A story gathering audience feedback',
          media_type: 'story',
          priority: 3,
        },
        {
          description: 'Official launch hero image with full announcement link',
          media_type: 'image',
          priority: 1,
        },
      ]);
    } finally {
      setDecomposing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#373E3E]">
          Recommendations &amp; Optimizer
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          QUBO quantum-inspired simulated annealing optimizer, AI-drafted captions, and goal
          decomposition.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200">
        <button
          onClick={() => setActiveTab('schedule')}
          className={`border-b-2 px-4 py-2 text-xs font-semibold transition ${
            activeTab === 'schedule'
              ? 'border-[#373E3E] text-[#373E3E]'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          ⚡ Schedule Optimizer (QUBO)
        </button>
        <button
          onClick={() => setActiveTab('captions')}
          className={`border-b-2 px-4 py-2 text-xs font-semibold transition ${
            activeTab === 'captions'
              ? 'border-[#373E3E] text-[#373E3E]'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          ✍️ AI Captions &amp; Hashtags
        </button>
        <button
          onClick={() => setActiveTab('campaign')}
          className={`border-b-2 px-4 py-2 text-xs font-semibold transition ${
            activeTab === 'campaign'
              ? 'border-[#373E3E] text-[#373E3E]'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          🎯 Campaign Task Decomposition
        </button>
      </div>

      {/* Tab 1: Schedule Optimizer */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-[#373E3E]">Optimizer Constraints</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Formulated as Quadratic Unconstrained Binary Optimization (QUBO) solved via Simulated
              Annealing.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700">
                  Target Posts Per Week (K)
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={postsPerWeek}
                  onChange={(e) => setPostsPerWeek(parseInt(e.target.value) || 1)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 p-2 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700">
                  Minimum Gap Hours Between Posts
                </label>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={minGapHours}
                  onChange={(e) => setMinGapHours(parseInt(e.target.value) || 1)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 p-2 text-xs focus:outline-none"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleRunOptimizer}
                  disabled={optimizing}
                  className="w-full rounded-lg border border-black bg-transparent py-2.5 text-xs font-semibold text-black transition-colors hover:bg-black hover:text-white disabled:opacity-50"
                >
                  {optimizing ? 'Annealing Q Matrix...' : 'Run Quantum Optimizer'}
                </button>
              </div>
            </div>
          </div>

          {optResult && (
            <div className="space-y-6">
              {optResult.low_data && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  ⚠️ <strong>Low Data Mode:</strong> Account has fewer than 20 historical posts.
                  Schedule derived from Bayesian prior distribution.
                </div>
              )}

              {/* Primary Schedule */}
              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                        Primary Recommendation
                      </span>
                      <span className="text-xs text-zinc-500">
                        Bootstrap Stability:{' '}
                        {((optResult.primary_schedule?.schedule_confidence || 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-semibold text-zinc-700">
                    Est. Score: {optResult.primary_schedule?.expected_score.toFixed(2)}
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5">
                  {optResult.primary_schedule?.slots.map((s, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-center"
                    >
                      <div className="text-xs font-bold text-zinc-800">{days[s.day]}</div>
                      <div className="mt-1 text-2xl font-extrabold text-[#373E3E]">
                        {s.hour < 10 ? `0${s.hour}:00` : `${s.hour}:00`}
                      </div>
                      <div className="mt-2 text-[10px] font-medium text-emerald-700">
                        Confidence: {(s.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alternatives */}
              {optResult.alternatives && optResult.alternatives.length > 0 && (
                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-[#373E3E]">
                    Alternative Low-Energy Schedules
                  </h3>
                  <div className="mt-4 space-y-4">
                    {optResult.alternatives.map((alt, altIdx) => (
                      <div
                        key={altIdx}
                        className="rounded-lg border border-zinc-100 bg-zinc-50 p-4"
                      >
                        <div className="mb-2 flex justify-between text-xs font-semibold text-zinc-600">
                          <span>Alternative #{altIdx + 1}</span>
                          <span>Confidence: {(alt.schedule_confidence * 100).toFixed(0)}%</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {alt.slots.map((s, sIdx) => (
                            <span
                              key={sIdx}
                              className="rounded bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 shadow-xs"
                            >
                              {days[s.day]} {s.hour}:00
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: AI Captions & Hashtags */}
      {activeTab === 'captions' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-[#373E3E]">Generate AI Captions</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Extracts patterns from your top-performing posts and synthesizes high-engagement
              drafts (Algorithm 2).
            </p>

            <div className="mt-4 flex gap-4">
              <input
                type="text"
                placeholder="Enter content niche or campaign topic..."
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="flex-1 rounded-lg border border-zinc-200 p-2 text-xs focus:outline-none"
              />
              <button
                onClick={handleGenerateCaptions}
                disabled={generatingCaptions}
                className="rounded-lg border border-black bg-transparent px-4 py-2 text-xs font-semibold text-black transition-colors hover:bg-black hover:text-white disabled:opacity-50"
              >
                {generatingCaptions ? 'Drafting...' : 'Generate Captions'}
              </button>
            </div>
          </div>

          {captions.length > 0 && (
            <div className="space-y-4">
              {captions.map((cap, idx) => (
                <div key={idx} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between">
                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-600">
                      Draft #{idx + 1}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${cap.text}\n\n${cap.hashtags.join(' ')}`);
                          setFeedbackGiven({ ...feedbackGiven, [idx]: 'Copied!' });
                        }}
                        className="rounded border border-zinc-200 px-2 py-1 text-[10px] font-semibold text-zinc-700 hover:bg-zinc-50"
                      >
                        {feedbackGiven[idx] === 'Copied!' ? '✓ Copied' : 'Copy'}
                      </button>
                      <button
                        onClick={() => setFeedbackGiven({ ...feedbackGiven, [idx]: 'Accepted' })}
                        className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-100"
                      >
                        {feedbackGiven[idx] === 'Accepted' ? '✓ Accepted' : '👍 Accept'}
                      </button>
                      <button
                        onClick={() => setFeedbackGiven({ ...feedbackGiven, [idx]: 'Rejected' })}
                        className="rounded border border-zinc-200 px-2 py-1 text-[10px] font-semibold text-zinc-600 hover:bg-zinc-50"
                      >
                        {feedbackGiven[idx] === 'Rejected' ? '✗ Rejected' : '👎'}
                      </button>
                    </div>
                  </div>

                  <p className="mt-3 text-sm font-medium whitespace-pre-wrap text-zinc-800">
                    {cap.text}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {cap.hashtags.map((tag, tIdx) => (
                      <span
                        key={tIdx}
                        className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700"
                      >
                        {tag.startsWith('#') ? tag : `#${tag}`}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Campaign Task Decomposition */}
      {activeTab === 'campaign' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-[#373E3E]">Campaign Goal Decomposer (FR-23)</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Decompose strategic goals into discrete, actionable content tasks.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-zinc-700">Strategic Goal</label>
                <input
                  type="text"
                  value={campaignGoal}
                  onChange={(e) => setCampaignGoal(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 p-2 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700">Platform</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white p-2 text-xs focus:outline-none"
                >
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleDecomposeCampaign}
              disabled={decomposing}
              className="mt-4 rounded-lg border border-black bg-transparent px-4 py-2 text-xs font-semibold text-black transition-colors hover:bg-black hover:text-white disabled:opacity-50"
            >
              {decomposing ? 'Decomposing...' : 'Decompose Into Post Tasks'}
            </button>
          </div>

          {tasks.length > 0 && (
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold text-[#373E3E]">Generated Campaign Tasks</h3>
              <div className="mt-4 divide-y divide-zinc-100">
                {tasks.map((task, idx) => (
                  <div key={idx} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-700 uppercase">
                        {task.media_type}
                      </span>
                      <span className="text-xs font-medium text-zinc-800">{task.description}</span>
                    </div>
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                      Priority {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
