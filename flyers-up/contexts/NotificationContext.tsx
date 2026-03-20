'use client';

/**
 * NotificationProvider: Live + Durable notifications
 *
 * - Subscribes to notifications table INSERT via Supabase Realtime (instant toast)
 * - Fetches unread count from DB (durable badge)
 * - Refetches on app focus / route change
 *
 * Skip Realtime when using HTTP proxy (WebSockets don't work through it).
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

/** Skip realtime when proxy is used - WebSockets don't work through HTTP proxy */
function shouldSkipRealtime(): boolean {
  if (typeof window === 'undefined') return true;
  const params = new URLSearchParams(window.location.search);
  if (params.get('use_proxy') === '1') return true;
  return (process.env.NEXT_PUBLIC_SUPABASE_USE_PROXY ?? '').toLowerCase() === 'true';
}

export interface NotificationItem {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  booking_id: string | null;
  deep_link: string | null;
  read: boolean;
  read_at?: string | null;
  created_at: string;
}

interface NotificationContextType {
  unreadCount: number;
  /** Refetch unread count (e.g. after marking read) */
  refreshUnreadCount: () => Promise<void>;
  /** Show toast for a new notification (called from realtime handler) */
  showToastFor: (n: NotificationItem) => void;
  /** Mark notification as read in DB */
  markAsRead: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  return (
    ctx ?? {
      unreadCount: 0,
      refreshUnreadCount: async () => {},
      showToastFor: () => {},
      markAsRead: async () => {},
    }
  );
}

/** Toast state - consumed by Toast component */
export interface ToastState {
  id: string;
  title: string;
  body: string | null;
  deep_link: string | null;
}

const ToastContext = createContext<{
  toast: ToastState | null;
  dismissToast: () => void;
}>({ toast: null, dismissToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState<ToastState | null>(null);
  const pathname = usePathname();

  const refreshUnreadCount = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUnreadCount(0);
      return;
    }
    const now = new Date().toISOString();
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null)
      .or(`expires_at.is.null,expires_at.gte.${now}`);
    if (error) {
      console.warn('NotificationContext: failed to fetch unread count', error);
      return;
    }
    setUnreadCount(count ?? 0);
  }, []);

  const showToastFor = useCallback((n: NotificationItem) => {
    setToast({
      id: n.id,
      title: n.title,
      body: n.body,
      deep_link: n.deep_link,
    });
    // Auto-dismiss after 5s
    setTimeout(() => {
      setToast((prev) => (prev?.id === n.id ? null : prev));
    }, 5000);
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  const markAsRead = useCallback(async (id: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id);
    await refreshUnreadCount();
  }, [refreshUnreadCount]);

  // Initial fetch + refetch on focus / route change
  useEffect(() => {
    void refreshUnreadCount();
  }, [refreshUnreadCount, pathname]);

  useEffect(() => {
    const handleFocus = () => void refreshUnreadCount();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refreshUnreadCount]);

  // Realtime: subscribe to notifications INSERT for current user
  useEffect(() => {
    if (shouldSkipRealtime()) return;

    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    const subscribe = async () => {
      if (!mounted) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!mounted || !user) return;

      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }

      channel = supabase
        .channel('notifications-realtime')
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
                setUnreadCount((c) => c + 1);
                showToastFor(row);
              }
            });
          }
        )
        .subscribe((status) => {
          if (!mounted) return;
          if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
            if (channel) {
              supabase.removeChannel(channel);
              channel = null;
            }
            retryTimeout = setTimeout(() => subscribe(), 3000);
          }
        });
    };

    void subscribe();
    return () => {
      mounted = false;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (channel) supabase.removeChannel(channel);
    };
  }, [showToastFor]);

  const value: NotificationContextType = {
    unreadCount,
    refreshUnreadCount,
    showToastFor,
    markAsRead,
  };

  return (
    <NotificationContext.Provider value={value}>
      <ToastContext.Provider value={{ toast, dismissToast }}>
        {children}
      </ToastContext.Provider>
    </NotificationContext.Provider>
  );
}
