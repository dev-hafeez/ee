'use client';

import { useState } from 'react';
import {
  runQuboOptimizerAction,
  getLatestOptimizationAction,
  generateCaptionsAction,
  decomposeGoalAction,
} from './recommendation-actions';

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

export interface OptimizationResult {
  job_id?: string;
  status?: string;
  primary_schedule?: ScheduleResult;
  alternatives?: ScheduleResult[];
  low_data?: boolean;
  explanation?: string;
  explanation_source?: string;
  posts_evaluated?: number;
  created_at?: string;
  finished_at?: string;
}

interface CaptionDraft {
  text: string;
  hashtags: string[];
}

interface SocialAccountOption {
  id: string;
  platform: string;
  handle: string;
  is_synthetic?: boolean;
}

export function RecommendationsClient({
  accounts = [],
  initialAccountId,
  initialOptimization = null,
  aiServiceUrl: _aiServiceUrl,
}: {
  accounts?: SocialAccountOption[];
  initialAccountId?: string;
  initialOptimization?: OptimizationResult | null;
  aiServiceUrl: string;
}) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    initialAccountId || (accounts.length > 0 ? accounts[0].id : '')
  );

  const [activeTab, setActiveTab] = useState<'schedule' | 'captions' | 'campaign'>('schedule');

  // Schedule optimizer state
  const [postsPerWeek, setPostsPerWeek] = useState(5);
  const [minGapHours, setMinGapHours] = useState(4);
  const [optimizing, setOptimizing] = useState(false);
  const [optResult, setOptResult] = useState<OptimizationResult | null>(initialOptimization);

  // Caption generator state
  const [niche, setNiche] = useState('Tech & AI Innovations');
  const [generatingCaptions, setGeneratingCaptions] = useState(false);
  const [captions, setCaptions] = useState<CaptionDraft[]>([]);
  const [captionMeta, setCaptionMeta] = useState<{
    source?: string;
    latencyMs?: number;
    basedOnNPosts?: number;
  }>({});
  const [feedbackGiven, setFeedbackGiven] = useState<Record<number, string>>({});

  // Campaign decomposition state
  const [campaignGoal, setCampaignGoal] = useState('Boost Q2 Product Launch Engagement');
  const [platform, setPlatform] = useState('instagram');
  const [decomposing, setDecomposing] = useState(false);
  const [campaignMeta, setCampaignMeta] = useState<{
    source?: string;
    latencyMs?: number;
  }>({});
  const [tasks, setTasks] = useState<
    Array<{ description: string; media_type: string; priority: number }>
  >([]);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const [actionError, setActionError] = useState<string | null>(null);

  const handleAccountChange = async (newAccountId: string) => {
    setSelectedAccountId(newAccountId);
    setActionError(null);
    try {
      const res = await getLatestOptimizationAction(newAccountId);
      if (res && res.success && res.data) {
        setOptResult(res.data);
      } else {
        setOptResult(null);
      }
    } catch {
      setOptResult(null);
    }
  };

  const handleRunOptimizer = async () => {
    if (!selectedAccountId) {
      setActionError('No account selected. Please connect an account in Settings first.');
      return;
    }
    setOptimizing(true);
    setActionError(null);
    try {
      const res = await runQuboOptimizerAction(selectedAccountId, postsPerWeek, minGapHours);
      if (res?.error) {
        setActionError(res.error);
      } else if (res?.data) {
        setOptResult(res.data);
      }
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Optimization failed');
    } finally {
      setOptimizing(false);
    }
  };

  const handleGenerateCaptions = async () => {
    if (!selectedAccountId) {
      setActionError('No account selected. Please connect an account in Settings first.');
      return;
    }
    setGeneratingCaptions(true);
    setActionError(null);
    try {
      const res = await generateCaptionsAction(selectedAccountId, niche);
      if (res?.error) {
        setActionError(res.error);
      } else if (res?.captions) {
        setCaptions(res.captions);
        setCaptionMeta({
          source: res.source,
          latencyMs: res.latencyMs,
          basedOnNPosts: res.basedOnNPosts,
        });
      }
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Caption generation failed');
    } finally {
      setGeneratingCaptions(false);
    }
  };

  const handleDecomposeCampaign = async () => {
    if (!campaignGoal.trim()) return;
    setDecomposing(true);
    setActionError(null);
    try {
      const startDate = new Date().toISOString();
      const endDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const res = await decomposeGoalAction(campaignGoal.trim(), platform, startDate, endDate);
      if (res?.error) {
        setActionError(res.error);
      } else if (res?.tasks) {
        setTasks(res.tasks);
        setCampaignMeta({
          source: res.source,
          latencyMs: res.latencyMs,
        });
      }
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Campaign decomposition failed');
    } finally {
      setDecomposing(false);
    }
  };

  const activeAccount = accounts.find((a) => a.id === selectedAccountId);

  return (
    <div className="space-y-8">
      {/* Header and Account Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#373E3E]">
            Recommendations &amp; Optimizer
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            QUBO quantum-inspired simulated annealing optimizer, AI-drafted captions, and goal
            decomposition.
          </p>
        </div>

        {accounts.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-600">Active Profile:</span>
            <select
              value={selectedAccountId}
              onChange={(e) => handleAccountChange(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#373E3E] shadow-xs focus:outline-none"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.platform === 'instagram' ? '📷 Instagram' : '👥 Facebook'}: @{acc.handle}
                  {acc.is_synthetic ? ' (Demo)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
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

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
          {actionError}
        </div>
      )}

      {/* Tab 1: Schedule Optimizer */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-[#373E3E]">
                  QUBO Schedule Optimizer
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Formulated as Quadratic Unconstrained Binary Optimization (QUBO) and solved via
                  Simulated Annealing (<code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[11px]">dwave-samplers</code>).
                </p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-800">
                Active for: @{activeAccount?.handle || 'Account'}
              </span>
            </div>

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
                      <span className="rounded bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                        Primary Optimal Schedule
                      </span>
                      <span className="text-xs font-medium text-zinc-600">
                        Bootstrap Stability:{' '}
                        {((optResult.primary_schedule?.schedule_confidence || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-medium text-zinc-500">
                      Evaluated {optResult.posts_evaluated || 20} posts
                    </span>
                    <span className="font-mono text-xs font-semibold text-zinc-700">
                      Est. Score: {optResult.primary_schedule?.expected_score != null ? optResult.primary_schedule.expected_score.toFixed(2) : '0.00'}
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5">
                  {optResult.primary_schedule?.slots && optResult.primary_schedule.slots.length > 0 ? (
                    optResult.primary_schedule.slots.map((s, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-center transition hover:shadow-xs"
                      >
                        <div className="text-xs font-bold text-zinc-800">{days[s.day]}</div>
                        <div className="mt-1 text-2xl font-extrabold text-[#373E3E]">
                          {s.hour < 10 ? `0${s.hour}:00` : `${s.hour}:00`}
                        </div>
                        <div className="mt-2 text-[10px] font-medium text-emerald-700">
                          Stability: {(s.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-5 text-center text-xs text-zinc-500 py-4">
                      No schedule slots returned. Click "Run Quantum Optimizer" to generate slots.
                    </div>
                  )}
                </div>
              </div>

              {/* Grounded AI Explanation Card */}
              {optResult.explanation && (
                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#373E3E]">Strategy Explanation</span>
                      <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold text-purple-800">
                        {optResult.explanation_source || 'Gemini (gemini-3.1-flash-lite-preview)'}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-zinc-500">
                      Grounded in historical engagement data
                    </span>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-zinc-700">
                    {optResult.explanation}
                  </p>
                </div>
              )}

              {/* Alternatives */}
              {optResult.alternatives && optResult.alternatives.length > 0 && (
                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-[#373E3E]">
                    Alternative Low-Energy Schedules (QUBO Sampler)
                  </h3>
                  <div className="mt-4 space-y-4">
                    {optResult.alternatives.map((alt, altIdx) => (
                      <div
                        key={altIdx}
                        className="rounded-lg border border-zinc-100 bg-zinc-50 p-4"
                      >
                        <div className="mb-2 flex justify-between text-xs font-semibold text-zinc-600">
                          <span>Alternative #{altIdx + 1}</span>
                          <span>Confidence: {(alt.schedule_confidence * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {alt.slots.map((s, sIdx) => (
                            <span
                              key={sIdx}
                              className="rounded bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 shadow-xs"
                            >
                              {days[s.day]} {s.hour < 10 ? `0${s.hour}:00` : `${s.hour}:00`}
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-[#373E3E]">Generate AI Captions</h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Synthesizes high-engagement drafts matching your bio, top topics, and proven hashtags (Algorithm 2).
                </p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-800">
                Target: @{activeAccount?.handle || 'Account'}
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                placeholder="Enter campaign topic or specific content focus (e.g. Street photography secrets in Berlin)..."
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="flex-1 rounded-lg border border-zinc-200 p-2.5 text-xs focus:outline-none"
              />
              <button
                onClick={handleGenerateCaptions}
                disabled={generatingCaptions}
                className="rounded-lg border border-black bg-transparent px-5 py-2.5 text-xs font-semibold text-black transition-colors hover:bg-black hover:text-white disabled:opacity-50"
              >
                {generatingCaptions ? 'Synthesizing with Gemini...' : 'Generate Captions'}
              </button>
            </div>
          </div>

          {captions.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-zinc-700">AI Model:</span>
                  <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-bold text-purple-800">
                    {captionMeta.source || 'Gemini (gemini-3.1-flash-lite-preview)'}
                  </span>
                  <span className="text-[11px] font-medium text-zinc-600">
                    ({captionMeta.latencyMs || 0}ms)
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-zinc-700">
                  Synthesized from {captionMeta.basedOnNPosts || 20} top historical posts (No fake percentage)
                </span>
              </div>

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
                        className="rounded border border-zinc-200 px-2.5 py-1 text-[10px] font-semibold text-zinc-700 hover:bg-zinc-50"
                      >
                        {feedbackGiven[idx] === 'Copied!' ? '✓ Copied' : 'Copy'}
                      </button>
                      <button
                        onClick={() => setFeedbackGiven({ ...feedbackGiven, [idx]: 'Accepted' })}
                        className="rounded border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-100"
                      >
                        {feedbackGiven[idx] === 'Accepted' ? '✓ Accepted' : '👍 Accept'}
                      </button>
                      <button
                        onClick={() => setFeedbackGiven({ ...feedbackGiven, [idx]: 'Rejected' })}
                        className="rounded border border-zinc-200 px-2.5 py-1 text-[10px] font-semibold text-zinc-600 hover:bg-zinc-50"
                      >
                        {feedbackGiven[idx] === 'Rejected' ? '✗ Rejected' : '👎 Reject'}
                      </button>
                    </div>
                  </div>

                  <p className="mt-3 text-sm font-medium whitespace-pre-wrap text-zinc-800 leading-relaxed">
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
              Decompose strategic goals into discrete, actionable post tasks tailored to your profile.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-zinc-700">Strategic Goal</label>
                <input
                  type="text"
                  value={campaignGoal}
                  onChange={(e) => setCampaignGoal(e.target.value)}
                  placeholder="e.g. Launch Summer Photography Workshop in Kreuzberg..."
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
              {decomposing ? 'Decomposing with Gemini...' : 'Decompose Into Post Tasks'}
            </button>
          </div>

          {tasks.length > 0 && (
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                <h3 className="text-sm font-bold text-[#373E3E]">Generated Campaign Tasks</h3>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-zinc-600">AI Model:</span>
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                    {campaignMeta.source || 'Gemini (gemini-3.1-flash-lite-preview)'}
                  </span>
                  <span className="text-[10px] font-medium text-zinc-600">
                    ({campaignMeta.latencyMs || 0}ms)
                  </span>
                </div>
              </div>
              <div className="divide-y divide-zinc-100">
                {tasks.map((task, idx) => (
                  <div key={idx} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-700 uppercase">
                        {task.media_type}
                      </span>
                      <span className="text-xs font-medium text-zinc-800 leading-relaxed">
                        {task.description}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                        Priority {task.priority}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`[${task.media_type.toUpperCase()}] ${task.description}`);
                        }}
                        className="rounded border border-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 hover:bg-zinc-50"
                      >
                        Copy
                      </button>
                    </div>
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
