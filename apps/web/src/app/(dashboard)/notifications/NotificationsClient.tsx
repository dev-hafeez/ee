'use client';

import { useState } from 'react';
import Link from 'next/link';

export interface NotificationItem {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  sent_at: string;
}

export function NotificationsClient({
  initialNotifications,
}: {
  initialNotifications: NotificationItem[];
}) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [updating, setUpdating] = useState(false);

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    return true;
  });

  const handleMarkAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    setUpdating(true);
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_ids: unreadIds }),
      });

      if (res.ok) {
        setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
      }
    } finally {
      setUpdating(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'publish_success':
        return '🚀';
      case 'publish_failed':
        return '⚠️';
      case 'post_reminder':
        return '⏰';
      case 'milestone':
        return '🎉';
      default:
        return '🔔';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#373E3E]">
            Notifications &amp; Alerts
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Publish status updates, 30-minute advance reminders, and milestone detections
            (FR-33..35).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="text-xs font-semibold text-zinc-600 hover:text-black hover:underline"
          >
            ⚙️ Preferences
          </Link>
          <button
            onClick={handleMarkAllAsRead}
            disabled={updating || notifications.filter((n) => !n.is_read).length === 0}
            className="rounded-lg border border-black bg-transparent px-3.5 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-black hover:text-white disabled:opacity-50"
          >
            {updating ? 'Updating...' : 'Mark all as read'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-zinc-200 text-xs font-semibold">
        <button
          onClick={() => setFilter('all')}
          className={`border-b-2 pb-2 transition ${
            filter === 'all'
              ? 'border-[#373E3E] text-[#373E3E]'
              : 'border-transparent text-zinc-400 hover:text-zinc-700'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`border-b-2 pb-2 transition ${
            filter === 'unread'
              ? 'border-[#373E3E] text-[#373E3E]'
              : 'border-transparent text-zinc-400 hover:text-zinc-700'
          }`}
        >
          Unread ({notifications.filter((n) => !n.is_read).length})
        </button>
      </div>

      {/* List */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        {filtered.length > 0 ? (
          <div className="divide-y divide-zinc-100">
            {filtered.map((item) => (
              <div
                key={item.id}
                className={`flex items-start justify-between py-4 ${
                  !item.is_read ? '-mx-6 bg-indigo-50/20 px-6' : ''
                }`}
              >
                <div className="flex gap-3.5">
                  <span className="text-xl">{getIcon(item.type)}</span>
                  <div>
                    <p
                      className={`text-xs ${!item.is_read ? 'font-bold text-zinc-900' : 'text-zinc-700'}`}
                    >
                      {item.message}
                    </p>
                    <span className="mt-1 block text-[10px] text-zinc-400">
                      {new Date(item.sent_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                {!item.is_read && (
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-600" />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-zinc-400">
            No notifications to display.
          </div>
        )}
      </div>
    </div>
  );
}
