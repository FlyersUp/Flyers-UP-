'use client';

/**
 * useUnreadNotifications - Unread count + realtime subscription
 *
 * - Fetches unread count on mount
 * - Subscribes to postgres_changes on notifications (INSERT, UPDATE)
 * - Re-fetches count on any relevant event for correctness
 * - Exposes markAllRead for Notifications page
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  getUnreadCount,
  markAllRead as markAllReadQuery,
} from '@/lib/notificationQueries';

/** Skip realtime when proxy is used - WebSockets don't work through HTTP proxy */
function shouldSkipRealtime(): boolean {
  if (typeof window === 'undefined') return true;
  const params = new URLSearchParams(window.location.search);
  if (params.get('use_proxy') === '1') return true;
  return (process.env.NEXT_PUBLIC_SUPABASE_USE_PROXY ?? '').toLowerCase() === 'true';
}

export interface UseUnreadNotificationsResult {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  markAllRead: () => Promise<{ error: unknown }>;
  error: string | null;
}

export function useUnreadNotifications(): UseUnreadNotificationsResult {
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const refreshUnreadCount = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUnreadCount(0);
      setError(null);
      return;
    }
    const count = await getUnreadCount(supabase, user.id);
    setUnreadCount(count);
    setError(null);
  }, []);

  const markAllRead = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: null };
    }
    const result = await markAllReadQuery(supabase, user.id);
    if (result.error) {
      setError('Failed to mark notifications as read');
      if (process.env.NODE_ENV === 'development') {
        console.warn('[useUnreadNotifications] markAllRead failed:', result.error);
      }
      return result;
    }
    setUnreadCount(0);
    return { error: null };
  }, []);

  // Initial fetch
  useEffect(() => {
    void refreshUnreadCount();
  }, [refreshUnreadCount]);

  // Realtime subscription
  useEffect(() => {
    if (shouldSkipRealtime()) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    const subscribe = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            queueMicrotask(() => void refreshUnreadCount());
          }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            if (process.env.NODE_ENV === 'development') {
              console.warn('[useUnreadNotifications] realtime subscription error');
            }
          }
        });
    };

    void subscribe();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [refreshUnreadCount]);

  return {
    unreadCount,
    refreshUnreadCount,
    markAllRead,
    error,
  };
}
