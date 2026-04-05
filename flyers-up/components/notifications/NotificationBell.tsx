'use client';

/**
 * Notification bell with dropdown.
 * Uses NotificationsPanel, NotificationSection, NotificationItem, NotificationEmptyState, NotificationsFooterAction.
 * Mobile-first, clean structure, no overlapping content.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { NotificationItem as NotificationItemComponent } from './NotificationItem';
import { NotificationSection } from './NotificationSection';
import { NotificationEmptyState } from './NotificationEmptyState';
import { NotificationsFooterAction } from './NotificationsFooterAction';
import { NotificationsPanel } from './NotificationsPanel';
import { trackNotificationOpened } from '@/lib/notifications/analytics';
import { supabase } from '@/lib/supabaseClient';

interface NotificationItemData {
  id: string;
  title: string;
  body: string | null;
  deep_link: string | null;
  target_path: string | null;
  booking_id: string | null;
  conversation_id: string | null;
  read_at: string | null;
  read: boolean;
  created_at: string;
  type: string;
}

function getSectionConfig(basePath: 'customer' | 'pro') {
  const prefix = basePath === 'pro' ? '/pro' : '/customer';
  return [
    { key: 'today' as const, title: "Today's Jobs", emptyTitle: 'No updates today', emptyDesc: 'New updates will show up here.', actionLabel: basePath === 'pro' ? 'Check requests' : 'View bookings', actionHref: basePath === 'pro' ? '/pro/jobs' : '/customer/bookings' },
    { key: 'thisWeek' as const, title: 'Requests Near You', emptyTitle: 'No requests this week', emptyDesc: 'New requests will appear here.', actionLabel: basePath === 'pro' ? 'View demand board' : 'View requests', actionHref: basePath === 'pro' ? '/pro/jobs' : '/customer/requests' },
    { key: 'earlier' as const, title: 'Earlier', emptyTitle: 'Nothing earlier', emptyDesc: 'Older notifications are archived.', actionLabel: 'View all', actionHref: `${prefix}/notifications` },
  ];
}

function groupByRecency(items: NotificationItemData[]): Record<string, NotificationItemData[]> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const today: NotificationItemData[] = [];
  const thisWeek: NotificationItemData[] = [];
  const earlier: NotificationItemData[] = [];

  for (const item of items) {
    const d = new Date(item.created_at);
    if (d >= todayStart) today.push(item);
    else if (d >= weekStart) thisWeek.push(item);
    else earlier.push(item);
  }

  return { today, thisWeek, earlier };
}

interface NotificationBellProps {
  basePath: 'customer' | 'pro';
  className?: string;
}

export function NotificationBell({ basePath, className = '' }: NotificationBellProps) {
  const router = useRouter();
  const { unreadCount, refreshUnreadCount, markAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItemData[]>([]);
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

  const handleClick = async (item: NotificationItemData) => {
    const isUnread = !item.read_at && !item.read;
    if (isUnread) {
      await fetch(`/api/notifications/${item.id}/read`, { method: 'POST' });
      await markAsRead(item.id);
      await refreshUnreadCount();
    }
    setOpen(false);

    const href =
      item.target_path ??
      item.deep_link ??
      (item.booking_id
        ? `${basePath === 'pro' ? '/pro' : '/customer'}/bookings/${item.booking_id}`
        : item.conversation_id
          ? `${basePath === 'pro' ? '/pro' : '/customer'}/chat/conversation/${item.conversation_id}`
          : basePath === 'pro'
            ? '/pro/notifications'
            : '/customer/notifications');

    const { data: { user } } = await supabase.auth.getUser();
    if (user) trackNotificationOpened({ notificationId: item.id, type: item.type, userId: user.id });

    router.push(href);
  };

  const settingsHref = basePath === 'pro' ? '/pro/settings/notifications' : '/customer/settings/notifications';
  const allNotificationsHref = basePath === 'pro' ? '/pro/notifications' : '/customer/notifications';
  const requestsHref = basePath === 'pro' ? '/pro/jobs' : '/customer/requests';

  const groups = groupByRecency(items);
  const sectionConfig = getSectionConfig(basePath);

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
          <div className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100dvw-2rem))] max-w-[calc(100dvw-2rem)] min-w-0">
            <NotificationsPanel
              header={
                <div className="px-4 py-3 flex items-center justify-between gap-4">
                  <span className="text-sm font-semibold text-text">Notifications</span>
                  <div className="flex items-center gap-3">
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
              }
              footer={
                <NotificationsFooterAction
                  href={allNotificationsHref}
                  label="View all notifications"
                  onClick={() => setOpen(false)}
                />
              }
            >
              {loading ? (
                <div className="px-4 py-8 text-center text-sm text-muted">Loading…</div>
              ) : items.length === 0 ? (
                <NotificationSection title="Today's Jobs">
                  <NotificationEmptyState
                    title="No notifications yet"
                    description="When you get updates, they'll show up here."
                    actionLabel="Check requests"
                    actionHref={requestsHref}
                    onActionClick={() => setOpen(false)}
                  />
                </NotificationSection>
              ) : (
                <div className="divide-y divide-border">
                  {sectionConfig.map(({ key, title, emptyTitle, emptyDesc, actionLabel, actionHref }) => {
                    const sectionItems = groups[key] ?? [];
                    return (
                      <NotificationSection key={key} title={title}>
                        {sectionItems.length > 0 ? (
                          <div className="divide-y divide-border/50">
                            {sectionItems.map((item) => (
                              <NotificationItemComponent
                                key={item.id}
                                item={item}
                                onClick={() => handleClick(item)}
                              />
                            ))}
                          </div>
                        ) : (
                          <NotificationEmptyState
                            title={emptyTitle}
                            description={emptyDesc}
                            actionLabel={actionLabel}
                            actionHref={actionHref}
                            onActionClick={() => setOpen(false)}
                          />
                        )}
                      </NotificationSection>
                    );
                  })}
                </div>
              )}
            </NotificationsPanel>
          </div>
        </>
      )}
    </div>
  );
}
