'use client';

/**
 * Notification bell with dropdown.
 * Grouped by Today, Earlier, This Week. Unread badge. Mark all read. Settings link.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { formatRelativeTime } from '@/lib/formatRelativeTime';

interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  deep_link: string | null;
  booking_id: string | null;
  read_at: string | null;
  read: boolean;
  created_at: string;
  type: string;
}

function groupByRecency(items: NotificationItem[]): { label: string; items: NotificationItem[] }[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const today: NotificationItem[] = [];
  const thisWeek: NotificationItem[] = [];
  const earlier: NotificationItem[] = [];

  for (const item of items) {
    const d = new Date(item.created_at);
    if (d >= todayStart) today.push(item);
    else if (d >= weekStart) thisWeek.push(item);
    else earlier.push(item);
  }

  const groups: { label: string; items: NotificationItem[] }[] = [];
  if (today.length) groups.push({ label: 'Today', items: today });
  if (thisWeek.length) groups.push({ label: 'This Week', items: thisWeek });
  if (earlier.length) groups.push({ label: 'Earlier', items: earlier });
  return groups;
}

interface NotificationBellProps {
  basePath: 'customer' | 'pro';
  className?: string;
}

export function NotificationBell({ basePath, className = '' }: NotificationBellProps) {
  const router = useRouter();
  const { unreadCount, refreshUnreadCount, markAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications?limit=30');
      const data = await res.json();
      setItems(data.notifications ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void fetchItems();
  }, [open, fetchItems]);

  const handleMarkAllRead = async () => {
    await fetch('/api/notifications/read-all', { method: 'POST' });
    await refreshUnreadCount();
    setItems((prev) => prev.map((i) => ({ ...i, read: true, read_at: new Date().toISOString() })));
  };

  const handleClick = async (item: NotificationItem) => {
    const isUnread = !item.read_at && !item.read;
    if (isUnread) {
      await fetch(`/api/notifications/${item.id}/read`, { method: 'POST' });
      await markAsRead(item.id);
      await refreshUnreadCount();
    }
    setOpen(false);
    const href = item.deep_link || (item.booking_id ? `${basePath === 'pro' ? '/pro' : ''}/bookings/${item.booking_id}` : basePath === 'pro' ? '/pro/notifications' : '/customer/notifications');
    router.push(href);
  };

  const settingsHref = basePath === 'pro' ? '/pro/settings/notifications' : '/customer/settings/notifications';

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="h-10 w-10 rounded-xl bg-surface2 border border-border text-text hover:bg-surface2/80 flex items-center justify-center relative"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell size={20} strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-xs font-medium flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 top-full mt-2 z-50 w-[min(360px,calc(100vw-32px))] rounded-2xl border border-border bg-surface shadow-xl overflow-hidden">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <span className="font-semibold text-text">Notifications</span>
              <div className="flex gap-2">
                {items.some((i) => !i.read_at && !i.read) && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-xs font-medium text-accent hover:underline"
                  >
                    Mark all read
                  </button>
                )}
                <Link href={settingsHref} onClick={() => setOpen(false)} className="text-xs font-medium text-muted hover:text-text">
                  Settings
                </Link>
              </div>
            </div>

            <div className="max-h-[min(400px,70vh)] overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center text-muted text-sm">Loading…</div>
              ) : items.length === 0 ? (
                <div className="p-6 text-center text-muted text-sm">
                  No notifications yet
                </div>
              ) : (
                groupByRecency(items).map((group) => (
                  <div key={group.label} className="py-2">
                    <div className="px-4 py-1 text-xs font-medium text-muted uppercase tracking-wide">
                      {group.label}
                    </div>
                    {group.items.map((item) => {
                      const isUnread = !item.read_at && !item.read;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleClick(item)}
                          className={`w-full px-4 py-3 text-left hover:bg-surface2/80 transition-colors flex gap-3 ${
                            isUnread ? 'bg-surface2/50' : ''
                          }`}
                        >
                          {isUnread && (
                            <span className="mt-2 w-2 h-2 rounded-full bg-accent shrink-0" aria-hidden />
                          )}
                          <div className={`flex-1 min-w-0 ${!isUnread ? 'ml-5' : ''}`}>
                            <div className={`text-sm ${isUnread ? 'font-semibold' : 'font-normal'} text-text`}>
                              {item.title}
                            </div>
                            {item.body && (
                              <div className="text-xs text-muted line-clamp-2 mt-0.5">{item.body}</div>
                            )}
                            <div className="text-xs text-muted mt-1">
                              {formatRelativeTime(item.created_at)}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            <div className="p-2 border-t border-border">
              <Link
                href={basePath === 'pro' ? '/pro/notifications' : '/customer/notifications'}
                onClick={() => setOpen(false)}
                className="block text-center text-sm font-medium text-accent hover:underline py-2"
              >
                View all notifications
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
