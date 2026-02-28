'use client';

/**
 * NotificationList: Clean feed with unread styling, timestamps, deep links.
 * Flyers Up theme: #F2F2F0, #D9D5D2, accents #B2FBA5 / #FFC067
 * Subscribes to realtime INSERT so new notifications appear live while viewing.
 */

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useNotifications, type NotificationItem } from '@/contexts/NotificationContext';
import { formatRelativeTime } from '@/lib/formatRelativeTime';

/** Skip realtime when proxy is used */
function shouldSkipRealtime(): boolean {
  if (typeof window === 'undefined') return true;
  const params = new URLSearchParams(window.location.search);
  if (params.get('use_proxy') === '1') return true;
  return (process.env.NEXT_PUBLIC_SUPABASE_USE_PROXY ?? '').toLowerCase() === 'true';
}

interface NotificationListProps {
  /** Base path for fallback when deep_link is missing (e.g. /customer or /pro) */
  basePath: string;
}

export function NotificationList({ basePath }: NotificationListProps) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { markAsRead, refreshUnreadCount } = useNotifications();

  const fetchNotifications = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('notifications')
      .select('id, user_id, type, title, body, booking_id, deep_link, read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      console.warn('NotificationList: fetch failed', error);
      setLoading(false);
      return;
    }
    setItems((data as NotificationItem[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  // Realtime: prepend new notifications when viewing the list
  useEffect(() => {
    if (shouldSkipRealtime()) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    const subscribe = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel('notifications-list-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const row = payload.new as NotificationItem;
            if (row?.user_id === user.id) {
              setItems((prev) => [row, ...prev]);
            }
          }
        )
        .subscribe();
    };

    void subscribe();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const handleClick = async (item: NotificationItem) => {
    if (!item.read) {
      await markAsRead(item.id);
      await refreshUnreadCount();
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-black/10 bg-[#F2F2F0] p-4 animate-pulse"
          >
            <div className="h-4 bg-[#D9D5D2]/50 rounded w-3/4 mb-2" />
            <div className="h-3 bg-[#D9D5D2]/30 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        className="rounded-2xl border border-black/10 bg-[#F2F2F0] p-6 shadow-sm border-l-4 border-l-accent"
        style={{ borderLeftColor: 'var(--role-accent, #FFC067)' }}
      >
        <div className="text-base font-semibold text-text">No notifications yet</div>
        <div className="mt-1 text-sm text-muted">
          When you book a pro or get updates on your bookings, you&apos;ll see them here.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const href =
          item.deep_link ||
          (item.booking_id ? `${basePath}/bookings/${item.booking_id}` : `${basePath}/notifications`);
        return (
          <Link
            key={item.id}
            href={href}
            onClick={() => handleClick(item)}
            className={`block rounded-xl border border-black/10 p-4 shadow-sm transition-colors hover:opacity-90 ${
              item.read
                ? 'bg-[#F2F2F0]'
                : 'bg-[#F2F2F0] border-l-4 border-l-[#FFC067]'
            }`}
            style={!item.read ? { borderLeftColor: 'var(--role-accent, #FFC067)' } : undefined}
          >
            <div className="flex items-start gap-3">
              {!item.read && (
                <span
                  className="mt-1.5 w-2 h-2 rounded-full bg-[#FFC067] shrink-0"
                  style={{ backgroundColor: 'var(--role-accent, #FFC067)' }}
                  aria-hidden
                />
              )}
              <div className="flex-1 min-w-0">
                <div
                  className={`text-base ${item.read ? 'font-normal' : 'font-semibold'} text-text`}
                >
                  {item.title}
                </div>
                {item.body && (
                  <div className="mt-1 text-sm text-muted line-clamp-2">{item.body}</div>
                )}
                <div className="mt-2 text-xs text-muted">
                  {formatRelativeTime(item.created_at)}
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
