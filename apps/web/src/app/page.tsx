import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#fcfcfc] text-zinc-900 flex flex-col justify-between">
      {/* Top Navigation */}
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#373E3E] text-white font-mono font-bold text-lg shadow-sm">
              EE
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-[#373E3E]">
                Entangled Echo
              </span>
              <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                Active &amp; Ready
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-zinc-600 hover:text-black hidden sm:inline-block"
            >
              FastAPI AI Docs ↗
            </a>
            <Link
              href="/login"
              className="text-xs font-semibold text-zinc-700 hover:text-black px-3 py-1.5"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg border border-black bg-black px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-transparent hover:text-black"
            >
              Launch Dashboard →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-16 sm:py-24 flex-1 flex flex-col justify-center">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-200 bg-white text-xs font-medium text-zinc-700 mb-6 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Quantum-Inspired QUBO Optimization &bull; simulated annealing powered
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[#373E3E] leading-[1.1]">
            Intelligent Social Media Optimization, Built for Creators.
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-zinc-600 leading-relaxed font-normal">
            Analyze historical engagement patterns, discover optimal posting schedules via
            quantum-inspired simulated annealing, and generate AI-crafted captions and strategies
            for Instagram &amp; Facebook.
          </p>

          {/* Quick Action Buttons */}
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl border border-black bg-black px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-white hover:text-black"
            >
              Explore Live Dashboard
            </Link>
            <Link
              href="/recommendations"
              className="inline-flex items-center justify-center rounded-xl border border-black bg-transparent px-6 py-3.5 text-sm font-semibold text-black transition-all hover:bg-black hover:text-white"
            >
              AI Optimizer &amp; Recs
            </Link>
            <Link
              href="/calendar"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-6 py-3.5 text-sm font-semibold text-zinc-700 shadow-sm transition-all hover:border-black hover:text-black"
            >
              Calendar
            </Link>
          </div>
        </div>

        {/* 3-Card Grid with Hover Scaling */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-700 font-bold mb-4 border border-purple-100">
              ⚡
            </div>
            <h3 className="text-base font-bold text-[#373E3E]">QUBO Schedule Optimizer</h3>
            <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
              Formulated as a Quadratic Unconstrained Binary Optimization model and solved via
              D-Wave Simulated Annealing to maximize audience reach without posting burnout.
            </p>
            <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-600">Simulated Annealing active</span>
              <Link href="/recommendations" className="text-xs font-semibold text-black underline">
                View &rarr;
              </Link>
            </div>
          </div>

          <div className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 font-bold mb-4 border border-blue-100">
              📊
            </div>
            <h3 className="text-base font-bold text-[#373E3E]">Engagement Analytics</h3>
            <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
              In-depth performance scoring across Reels, Carousels, and Photos. Heatmaps of day &times; hour
              marginal performance with follower growth tracking.
            </p>
            <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-600">Unified Ingestion Pipeline</span>
              <Link href="/analytics" className="text-xs font-semibold text-black underline">
                Explore &rarr;
              </Link>
            </div>
          </div>

          <div className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 font-bold mb-4 border border-amber-100">
              📅
            </div>
            <h3 className="text-base font-bold text-[#373E3E]">Interactive Calendar</h3>
            <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
              Visual weekly drag-and-drop posting grid. Automatic status machine lifecycle from draft
              to publishing with retry backoff and idempotency.
            </p>
            <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-600">Drag &amp; Drop Ready</span>
              <Link href="/calendar" className="text-xs font-semibold text-black underline">
                Schedule &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Live Service Architecture Status */}
        <div className="mt-12 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-xs text-zinc-600">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
              <span className="font-medium text-zinc-900">Web App (Next.js 16)</span>: Port 3000
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
              <span className="font-medium text-zinc-900">AI Service (FastAPI)</span>: Port 8000
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span>
              <span className="font-medium text-zinc-900">Mode</span>: Seed &amp; Mock (Offline Ready)
            </div>
          </div>
          <div className="text-xs text-zinc-400 font-mono">
            Entangled Echo v0.1.0 &bull; FYP Production Scaffold
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div>
            &copy; 2026 Entangled Echo. Built for Instagram &amp; Facebook creators.
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-black">Login</Link>
            <Link href="/signup" className="hover:text-black">Register</Link>
            <Link href="/settings" className="hover:text-black">Settings</Link>
            <a href="http://localhost:8000/docs" target="_blank" rel="noopener noreferrer" className="hover:text-black">API Docs</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
