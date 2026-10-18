'use client';

import { useState } from 'react';
import Link from 'next/link';
import { logout } from '@/app/(auth)/actions';
import { AssistantModal } from '@/components/ai/AssistantModal';
import { ImageGeneratorModal } from '@/components/ai/ImageGeneratorModal';

interface TopBarProps {
  email?: string;
  displayName?: string;
}

export function TopBar({ email, displayName }: TopBarProps) {
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isImageStudioOpen, setIsImageStudioOpen] = useState(false);

  const initials = displayName
    ? displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : email
      ? email.slice(0, 2).toUpperCase()
      : 'EE';

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-200 bg-white/80 px-8 backdrop-blur">
        <div className="flex w-96 items-center gap-4">
          <div className="relative w-full">
            <input
              type="search"
              placeholder="Search posts, hashtags, recommendations..."
              className="w-full rounded-lg border border-zinc-200 py-1.5 pr-4 pl-9 text-xs text-zinc-900 placeholder:text-zinc-500 focus:border-[#373E3E] focus:ring-1 focus:ring-[#373E3E] focus:outline-none"
            />
            <span className="absolute top-2 left-3 text-xs text-zinc-500">🔍</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* AI Assistant Button */}
          <button
            type="button"
            onClick={() => setIsAssistantOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-100 hover:text-black"
          >
            <span>🤖</span>
            <span>Assistant</span>
          </button>

          {/* AI Image Studio Button */}
          <button
            type="button"
            onClick={() => setIsImageStudioOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-100 hover:text-black"
          >
            <span>🎨</span>
            <span>Image Studio</span>
          </button>

          {/* Generate Button with project button aesthetic */}
          <Link
            href="/recommendations"
            prefetch={true}
            className="btn-outline px-3.5 py-1.5 text-xs font-semibold"
          >
            <span>✨</span>
            <span className="ml-1.5">Generate</span>
          </Link>

          {/* Notification Bell */}
          <Link
            href="/notifications"
            prefetch={true}
            className="relative rounded-lg p-2 text-zinc-700 transition hover:bg-zinc-100 hover:text-black"
            aria-label="Notifications"
          >
            <span className="text-base">🔔</span>
            <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-indigo-600" />
          </Link>

          {/* User profile dropdown / logout */}
          <div className="flex items-center gap-3 border-l border-zinc-200 pl-2">
            <div
              title={email || displayName || 'User'}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-800"
            >
              {initials}
            </div>
            <button
              onClick={() => logout()}
              className="text-xs font-medium text-zinc-700 transition hover:text-red-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* In-App AI Assistant Drawer/Modal */}
      <AssistantModal isOpen={isAssistantOpen} onClose={() => setIsAssistantOpen(false)} />

      {/* AI Image Studio Modal */}
      <ImageGeneratorModal
        isOpen={isImageStudioOpen}
        onClose={() => setIsImageStudioOpen(false)}
      />
    </>
  );
}
