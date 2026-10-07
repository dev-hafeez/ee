'use client';

import Link from 'next/link';
import { logout } from '@/app/(auth)/actions';

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-200 bg-white/80 px-8 backdrop-blur">
      <div className="flex w-96 items-center gap-4">
        <div className="relative w-full">
          <input
            type="search"
            placeholder="Search posts, hashtags, recommendations..."
            className="w-full rounded-lg border border-zinc-200 py-1.5 pr-4 pl-9 text-xs focus:border-[#373E3E] focus:ring-1 focus:ring-[#373E3E] focus:outline-none"
          />
          <span className="absolute top-2 left-3 text-xs text-zinc-400">🔍</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Generate Button with project button aesthetic */}
        <Link
          href="/recommendations"
          className="flex items-center gap-1.5 rounded-lg border border-black bg-transparent px-3.5 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-black hover:text-white"
        >
          <span>✨</span>
          <span>Generate</span>
        </Link>

        {/* Notification Bell */}
        <Link
          href="/notifications"
          className="relative rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
          aria-label="Notifications"
        >
          <span className="text-base">🔔</span>
          <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-indigo-600" />
        </Link>

        {/* User profile dropdown / logout */}
        <div className="flex items-center gap-3 border-l border-zinc-200 pl-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-700">
            AR
          </div>
          <button
            onClick={() => logout()}
            className="text-xs font-medium text-zinc-500 transition hover:text-red-600"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
