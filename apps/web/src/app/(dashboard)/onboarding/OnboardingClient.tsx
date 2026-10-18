'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Step {
  id: number;
  title: string;
  badge: string;
  headline: string;
  description: string;
  details: string[];
  actionLabel?: string;
  actionHref?: string;
  icon: string;
}

const STEPS: Step[] = [
  {
    id: 1,
    title: 'Connect Accounts',
    badge: 'FR-07 / FR-08',
    headline: 'Link Your Instagram & Facebook Accounts',
    description:
      'Entangled Echo connects directly with Meta Instagram Graph API and Facebook Pages. Tokens are encrypted using AES-256-GCM at rest and never touch client-side browsers. The app operates offline seamlessly in mock/seed mode.',
    details: [
      'Encrypted OAuth 2.0 with automatic token refresh',
      'Supports live Meta Graph API or synthetic demo seed data',
      'Scoped strictly to Instagram Business/Creator and Facebook Pages',
      'Zero third-party scraping; strict compliance with Meta Developer Policies',
    ],
    actionLabel: 'Configure in Settings',
    actionHref: '/settings',
    icon: '🔗',
  },
  {
    id: 2,
    title: 'Data Ingestion & Hygiene',
    badge: 'FR-09 .. FR-12',
    headline: 'Unified Schema & 48-Hour Maturity Window',
    description:
      'Historical posts and engagement snapshots are ingested with strict deduplication on (account_id, external_id). Engagement metrics undergo a 48-hour maturity filter to eliminate early volatile noise before feeding into analytics.',
    details: [
      'Time-series snapshots for reach, views, likes, comments, shares, and saves',
      '12-month historical data retention per SRDS FR-11',
      'Daily automated background sync via /internal/tick dispatcher',
      'Percentile normalization across individual creator baselines',
    ],
    actionLabel: 'View Analytics Heatmap',
    actionHref: '/analytics',
    icon: '📥',
  },
  {
    id: 3,
    title: 'QUBO Optimizer',
    badge: 'FR-17 .. FR-20',
    headline: 'Quantum-Inspired Posting Schedule Optimization',
    description:
      'Rather than unguided heuristics, scheduling is mathematically modeled as a Quadratic Unconstrained Binary Optimization (QUBO) problem solved with simulated annealing via dwave-samplers.',
    details: [
      'Empirical shrinkage prior combining day-of-week and hour marginals',
      'Constraint penalties strictly enforcing minimum gap hours and blackout slots',
      'Top-4 distinct low-energy schedules (primary + 3 alternatives)',
      'Bootstrap resampling (30 iterations) providing statistical stability confidence',
    ],
    actionLabel: 'Launch Optimizer',
    actionHref: '/recommendations',
    icon: '⚡',
  },
  {
    id: 4,
    title: 'AI Drafts & Strategy',
    badge: 'FR-21 .. FR-24',
    headline: 'LLM Recommendations & Goal Decomposition',
    description:
      'Algorithm 2 analyzes top historical performers, topics (TF-IDF), and sentiment (VADER) to generate 3 tailored caption drafts, clustered hashtags, and decompose high-level marketing goals into actionable tasks.',
    details: [
      'Structured JSON outputs validated via Pydantic schemas',
      'Audience-grounded topic modeling and hashtag co-occurrence clustering',
      'Campaign goal decomposition into media-specific content tasks',
      'Feedback loop with per-account preference re-ranking',
    ],
    actionLabel: 'Explore Recommendations',
    actionHref: '/recommendations',
    icon: '💡',
  },
  {
    id: 5,
    title: 'Calendar & Dispatcher',
    badge: 'FR-25 .. FR-28',
    headline: 'Visual Scheduling & 60-Second Auto-Publishing',
    description:
      'Organize posts on an interactive drag-and-drop weekly calendar grid. The internal tick publisher claims due posts with atomic row locking, enforces exponential backoff retries, and publishes within 60 seconds of schedule.',
    details: [
      'Drag-and-drop content calendar with confidence-coded recommended slots',
      'Strict post lifecycle state machine: DRAFT → SCHEDULED → PUBLISHING → PUBLISHED',
      'Decision D9 upload validation (magic bytes & file size limits)',
      'Exponential backoff (2, 4, 8 min) with automated failure alerting',
    ],
    actionLabel: 'Open Content Calendar',
    actionHref: '/calendar',
    icon: '📅',
  },
];

export function OnboardingClient() {
  const [currentStep, setCurrentStep] = useState(1);
  const step = STEPS[currentStep - 1];

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-[#373E3E]">
            Welcome to Entangled Echo
          </h1>
          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
            Guided Onboarding
          </span>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Learn how Entangled Echo uses quantum-inspired mathematical optimization, unified data
          hygiene, and generative intelligence to amplify creator engagement.
        </p>
      </div>

      {/* Step Stepper Tabs */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        {STEPS.map((s) => {
          const isActive = s.id === currentStep;
          const isCompleted = s.id < currentStep;

          return (
            <button
              key={s.id}
              onClick={() => setCurrentStep(s.id)}
              className="group flex flex-col items-center gap-1.5 focus:outline-none"
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#373E3E] text-white shadow-md'
                    : isCompleted
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-zinc-100 text-zinc-700 group-hover:bg-zinc-200'
                }`}
              >
                {isCompleted ? '✓' : s.id}
              </div>
              <span
                className={`text-[11px] font-semibold transition ${
                  isActive ? 'text-[#373E3E]' : 'text-zinc-600 group-hover:text-zinc-900'
                }`}
              >
                {s.title}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Step Detail Card */}
      <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm transition-transform hover:shadow-md">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{step.icon}</span>
            <div>
              <span className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-[10px] font-bold text-zinc-600 uppercase">
                {step.badge}
              </span>
              <h2 className="mt-1 text-xl font-bold text-[#373E3E]">{step.headline}</h2>
            </div>
          </div>
          <span className="text-xs font-bold text-zinc-600">
            Step {step.id} of {STEPS.length}
          </span>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-zinc-700">{step.description}</p>

        {/* Feature Highlights */}
        <div className="mt-6 rounded-lg bg-zinc-50 p-5">
          <h3 className="text-xs font-bold tracking-wider text-zinc-700 uppercase">
            Architectural Guarantees
          </h3>
          <ul className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {step.details.map((detail, idx) => (
              <li key={idx} className="flex items-center gap-2 text-xs text-zinc-700">
                <span className="font-bold text-emerald-800">✓</span>
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Navigation & Action Footer */}
        <div className="mt-8 flex flex-col gap-3 border-t border-zinc-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
              >
                &larr; Previous
              </button>
            )}
            {currentStep < STEPS.length ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev + 1)}
                className="rounded-lg border border-black bg-black px-4 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800"
              >
                Next Step &rarr;
              </button>
            ) : (
              <Link
                href="/dashboard"
                className="rounded-lg border border-black bg-black px-4 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800"
              >
                Complete Onboarding &rarr;
              </Link>
            )}
          </div>

          {step.actionLabel && step.actionHref && (
            <Link
              href={step.actionHref}
              className="inline-flex items-center justify-center rounded-lg border border-black bg-transparent px-4 py-2 text-xs font-semibold text-black transition-colors hover:bg-black hover:text-white"
            >
              {step.actionLabel} &rarr;
            </Link>
          )}
        </div>
      </div>

      {/* Quick Summary Cards (3-column responsive per design standards) */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-transform hover:scale-[1.01] hover:shadow-md">
          <div className="text-xl">🎛️</div>
          <h4 className="mt-2 text-sm font-bold text-[#373E3E]">Fully Offline Mode</h4>
          <p className="mt-1 text-xs text-zinc-500">
            Set DATA_MODE=seed to test the entire platform without live Meta API review credentials.
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-transform hover:scale-[1.01] hover:shadow-md">
          <div className="text-xl">🔒</div>
          <h4 className="mt-2 text-sm font-bold text-[#373E3E]">Zero Hardcoded Secrets</h4>
          <p className="mt-1 text-xs text-zinc-500">
            Tokens encrypted with AES-256-GCM. All configurations managed strictly via environment
            variables.
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-transform hover:scale-[1.01] hover:shadow-md">
          <div className="text-xl">⏱️</div>
          <h4 className="mt-2 text-sm font-bold text-[#373E3E]">Fast NFR Execution</h4>
          <p className="mt-1 text-xs text-zinc-500">
            QUBO optimization completes in &lt;10s and simulated batch sync of 500 posts finishes
            under 5 minutes.
          </p>
        </div>
      </div>
    </div>
  );
}
