'use client';

/**
 * NotificationList: Clean feed with unread styling, timestamps, deep links.
 * Flyers Up theme: #F5F5F5, accents #B2FBA5 / #FFC067
 * Subscribes to realtime INSERT so new notifications appear live while viewing.
 */

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useNotifications, type NotificationItem } from '@/contexts/NotificationContext';
import { formatRelativeTime } from '@/lib/formatRelativeTime';
import { SignInNotice } from '@/components/ui/SignInNotice';
import { NotificationIcon } from '@/components/notifications/NotificationIcon';
import { ListRow } from '@/components/ui/ListRow';
import { StatusPill } from '@/components/ui/StatusPill';
import { Bell, CalendarClock, MessageCircle, Receipt, RefreshCw, Wrench } from 'lucide-react';

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

type NotificationTab = 'all' | 'bookings' | 'messages' | 'payments';

interface NotificationRow extends NotificationItem {
  data?: Record<string, unknown> | null;
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function bucketByTime(createdAt: string): 'today' | 'yesterday' | 'earlier' {
  const now = new Date();
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return 'earlier';
  const todayKey = toDateKey(now);
  const dateKey = toDateKey(date);
  if (todayKey === dateKey) return 'today';
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (toDateKey(y) === dateKey) return 'yesterday';
  return 'earlier';
}

function classify(type: string): NotificationTab {
  if (type.startsWith('message.')) return 'messages';
  if (type.startsWith('payment.') || type.startsWith('payout.')) return 'payments';
  if (type.startsWith('booking.') || type === 'nearby_pro_alert') return 'bookings';
  return 'all';
}

function getFallbackHref(basePath: string, item: NotificationRow): string {
  const isPro = basePath === '/pro';
  const data = (item.data ?? {}) as Record<string, unknown>;
  const conversationId = typeof data.conversation_id === 'string' ? data.conversation_id : null;

  // booking notifications should deep-link into booking tracking/details
  if (item.type.startsWith('booking.')) {
    if (item.booking_id) {
      return isPro ? `/pro/bookings/${item.booking_id}` : `/customer/bookings/${item.booking_id}/track`;
    }
    return `${basePath}/bookings`;
  }

  // message notifications should deep-link into chat thread
  if (item.type.startsWith('message.')) {
    if (conversationId) {
      return isPro
        ? `/pro/chat/conversation/${encodeURIComponent(conversationId)}`
        : `/customer/chat/conversation/${encodeURIComponent(conversationId)}`;
    }
    if (item.booking_id) {
      return isPro
        ? `/pro/chat/${encodeURIComponent(item.booking_id)}`
        : `/customer/chat/${encodeURIComponent(item.booking_id)}`;
    }
    return isPro ? '/pro/messages' : '/customer/messages';
  }

  // payment notifications should deep-link into payment/receipt surface
  if (item.type.startsWith('payment.')) {
    if (!isPro && item.booking_id) {
      return `/customer/bookings/${encodeURIComponent(item.booking_id)}/complete`;
    }
    return isPro ? '/pro/earnings' : '/customer/bookings';
  }
  if (item.type.startsWith('payout.')) return '/pro/earnings';

  return item.booking_id ? `${basePath}/bookings/${item.booking_id}` : `${basePath}/notifications`;
}

function sectionLabel(key: 'today' | 'yesterday' | 'earlier'): string {
  if (key === 'today') return 'Today';
  if (key === 'yesterday') return 'Yesterday';
  return 'Earlier';
}

export function NotificationList({ basePath }: NotificationListProps) {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [tab, setTab] = useState<NotificationTab>('all');
  const { markAsRead, refreshUnreadCount } = useNotifications();

  const fetchNotifications = useCallback(async () => {
    setFetchError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    if (!user) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('notifications')
      .select('id, user_id, type, title, body, booking_id, deep_link, data, read, read_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      console.warn('NotificationList: fetch failed', error);
      setFetchError('Unable to load notifications right now.');
      setLoading(false);
      return;
    }
    setItems((data as NotificationRow[]) ?? []);
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
            queueMicrotask(() => {
              const row = payload.new as NotificationItem;
              if (row?.user_id === user.id) {
                setItems((prev) => [row, ...prev]);
              }
            });
          }
        )
        .subscribe();
    };

    void subscribe();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const isUnread = (item: NotificationItem) =>
    item.read_at == null && !item.read;

  const handleClick = async (item: NotificationRow) => {
    if (isUnread(item)) {
      await markAsRead(item.id);
      await refreshUnreadCount();
      setItems((prev) =>
        prev.map((n) =>
          n.id === item.id
            ? {
                ...n,
                read: true,
                read_at: new Date().toISOString(),
              }
            : n
        )
      );
    }
  };

  const filteredItems = items.filter((item) => {
    if (tab === 'all') return true;
    return classify(item.type) === tab;
  });

  const grouped = {
    today: filteredItems.filter((n) => bucketByTime(n.created_at) === 'today'),
    yesterday: filteredItems.filter((n) => bucketByTime(n.created_at) === 'yesterday'),
    earlier: filteredItems.filter((n) => bucketByTime(n.created_at) === 'earlier'),
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 w-20 rounded-full bg-surface2 animate-pulse" />
          ))}
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-surface p-4 animate-pulse">
            <div className="flex gap-3">
              <div className="h-9 w-9 rounded-full bg-surface2" />
              <div className="flex-1">
                <div className="h-4 bg-surface2 rounded w-3/4 mb-2" />
                <div className="h-3 bg-surface2 rounded w-2/3 mb-2" />
                <div className="h-3 bg-surface2 rounded w-1/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!loading && userId === null) {
    return <SignInNotice nextHref={basePath === '/pro' ? '/pro/notifications' : '/customer/notifications'} />;
  }

  if (fetchError) {
    return (
      <div className="rounded-2xl border border-danger/35 bg-danger/12 p-5">
        <div className="text-base font-semibold text-text">Couldn&apos;t load notifications</div>
        <div className="mt-1 text-sm text-text2">{fetchError}</div>
        <button
          type="button"
          onClick={() => void fetchNotifications()}
          className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-danger/45 bg-surface px-3 py-2 text-sm font-semibold text-text hover:bg-hover"
        >
          <RefreshCw size={14} />
          Retry
        </button>
      </div>
    );
  }

  const hasAny = items.length > 0;
  if (!hasAny) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
        <div className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface2 text-muted">
          <Bell size={20} />
        </div>
        <div className="text-base font-semibold text-text">No notifications yet</div>
        <div className="mt-1 text-sm text-muted">
          Jobs near you are waiting.
        </div>
        <div className="mt-2 text-xs text-muted">Safe, reliable, and built for your neighborhood</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(
          [
            { key: 'all' as const, label: 'All' },
            { key: 'bookings' as const, label: 'Bookings' },
            { key: 'messages' as const, label: 'Messages' },
            { key: 'payments' as const, label: 'Payments' },
          ] as const
        ).map((tabDef) => (
          <button
            key={tabDef.key}
            type="button"
            onClick={() => setTab(tabDef.key)}
            className={[
              'shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors',
              tab === tabDef.key
                ? 'border-[hsl(var(--accent-customer)/0.58)] bg-[hsl(var(--accent-customer)/0.2)] text-text'
                : 'border-border bg-surface text-text3 hover:bg-hover hover:text-text',
            ].join(' ')}
            aria-pressed={tab === tabDef.key}
          >
            {tabDef.label}
          </button>
        ))}
      </div>

      {(['today', 'yesterday', 'earlier'] as const).map((bucket) => {
        const sectionItems = grouped[bucket];
        if (sectionItems.length === 0) return null;
        return (
          <section key={bucket} aria-label={sectionLabel(bucket)} className="space-y-2.5">
            <h2 className="text-sm font-semibold text-text2">{sectionLabel(bucket)}</h2>
            <div className="space-y-2">
              {sectionItems.map((item) => {
                const href = item.deep_link || getFallbackHref(basePath, item);
                const unread = isUnread(item);
                return (
                  <Link
                    key={item.id}
                    href={href}
                    onClick={() => handleClick(item)}
                    className="block"
                  >
                    <ListRow
                      className={unread ? 'border-[hsl(var(--accent-customer)/0.55)] bg-[hsl(var(--accent-customer)/0.15)]' : 'hover:bg-hover/70'}
                      icon={<NotificationIcon type={item.type} />}
                      title={item.title}
                      subtext={item.body ?? undefined}
                      rightSlot={
                        <div className="text-right">
                          <p className="text-xs text-muted">{formatRelativeTime(item.created_at)}</p>
                          <div className="mt-1">
                            {unread ? (
                              <StatusPill tone="success">New</StatusPill>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted">
                                <CalendarClock size={12} />
                                Read
                              </span>
                            )}
                          </div>
                          <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted">
                            {classify(item.type) === 'bookings' ? (
                              <Wrench size={11} />
                            ) : classify(item.type) === 'messages' ? (
                              <MessageCircle size={11} />
                            ) : classify(item.type) === 'payments' ? (
                              <Receipt size={11} />
                            ) : (
                              <Bell size={11} />
                            )}
                          </div>
                        </div>
                      }
                    />
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}

      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
          <div className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface2 text-muted">
            <Bell size={20} />
          </div>
          <div className="text-base font-semibold text-text">No notifications in this view</div>
          <div className="mt-1 text-sm text-muted">
            Try another filter to view booking and payment updates.
          </div>
        </div>
      ) : null}
    </div>
  );
}
