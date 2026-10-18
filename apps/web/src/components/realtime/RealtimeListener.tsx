'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function RealtimeListener() {
  const router = useRouter();
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' } | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // Subscribe to realtime postgres changes on critical tables
    const channel = supabase
      .channel('app_realtime_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'optimization_jobs' },
        (payload) => {
          const status = (payload.new as { status?: string })?.status || 'updated';
          setToast({ message: `Optimization job ${status}`, type: 'info' });
          router.refresh();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const title = (payload.new as { title?: string })?.title || 'New notification';
          setToast({ message: title, type: 'info' });
          router.refresh();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scheduled_posts' },
        (payload) => {
          const status = (payload.new as { status?: string })?.status || 'updated';
          setToast({ message: `Scheduled post ${status}`, type: 'success' });
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-lg transition-all animate-in fade-in slide-in-from-bottom-3">
      <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
      <span className="text-xs font-semibold text-zinc-800">{toast.message}</span>
      <button
        onClick={() => setToast(null)}
        className="ml-2 text-xs text-zinc-400 hover:text-zinc-600"
      >
        ✕
      </button>
    </div>
  );
}
