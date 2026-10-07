import Link from 'next/link';

export default function DashboardOverviewPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#373E3E]">Dashboard Overview</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Welcome to Entangled Echo. Real-time engagement insights and quantum-inspired schedule
            optimization.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/recommendations"
            className="rounded-lg border border-black bg-transparent px-4 py-2 text-xs font-semibold text-black transition-colors hover:bg-black hover:text-white"
          >
            Run Optimizer
          </Link>
        </div>
      </div>

      {/* 3-column card grid per owner layout preferences */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-transform hover:scale-[1.01] hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase">Total Reach</span>
            <span className="text-base">📈</span>
          </div>
          <div className="mt-4 text-3xl font-extrabold text-[#373E3E]">28,450</div>
          <p className="mt-1 text-xs text-emerald-600">↑ 14.2% vs previous 30 days</p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-transform hover:scale-[1.01] hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase">Engagement Score</span>
            <span className="text-base">⚡</span>
          </div>
          <div className="mt-4 text-3xl font-extrabold text-[#373E3E]">0.84</div>
          <p className="mt-1 text-xs text-zinc-500">Percentile-normalized across posts</p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-transform hover:scale-[1.01] hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase">Scheduled Posts</span>
            <span className="text-base">📅</span>
          </div>
          <div className="mt-4 text-3xl font-extrabold text-[#373E3E]">4</div>
          <p className="mt-1 text-xs text-indigo-600">Next publish: Wed 19:00 (Confidence: 93%)</p>
        </div>
      </div>
    </div>
  );
}
