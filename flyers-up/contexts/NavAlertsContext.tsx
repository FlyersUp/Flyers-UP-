'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { scheduleRemoveSupabaseChannel } from '@/lib/supabaseChannelCleanup';

/** Skip Realtime when using HTTP proxy - WebSockets don't work through it. */
function isUsingSupabaseHttpProxy(): boolean {
  if (typeof window === 'undefined') return true;
  const params = new URLSearchParams(window.location.search);
  if (params.get('use_proxy') === '1') return true;
  return (process.env.NEXT_PUBLIC_SUPABASE_USE_PROXY ?? '').toLowerCase() === 'true';
}

interface NavAlertsContextType {
  hasNewMessages: boolean;
  hasNewNotifications: boolean;
  clearMessagesAlert: () => void;
  clearNotificationsAlert: () => void;
}

const NavAlertsContext = createContext<NavAlertsContextType | undefined>(undefined);

export function useNavAlerts() {
  const ctx = useContext(NavAlertsContext);
  return ctx ?? {
    hasNewMessages: false,
    hasNewNotifications: false,
    clearMessagesAlert: () => {},
    clearNotificationsAlert: () => {},
  };
}

export function NavAlertsProvider({ children }: { children: React.ReactNode }) {
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);

  const clearMessagesAlert = useCallback(() => setHasNewMessages(false), []);
  const clearNotificationsAlert = useCallback(() => setHasNewNotifications(false), []);

  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let idleId: number | undefined;
    let startTimer: ReturnType<typeof setTimeout> | null = null;

    const subscribe = async () => {
      if (!mounted || isUsingSupabaseHttpProxy()) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted || !user) return;

      if (channel) {
        scheduleRemoveSupabaseChannel(supabase, channel);
        channel = null;
      }

      channel = supabase
        .channel('nav-alerts-messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'booking_messages',
          },
          (payload) => {
            queueMicrotask(() => {
              const row = payload.new as { sender_id?: string };
              if (row?.sender_id && row.sender_id !== user.id) {
                setHasNewMessages(true);
                setHasNewNotifications(true);
              }
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'conversation_messages',
          },
          (payload) => {
            queueMicrotask(() => {
              const row = payload.new as { sender_id?: string };
              if (row?.sender_id && row.sender_id !== user.id) {
                setHasNewMessages(true);
                setHasNewNotifications(true);
              }
            });
          }
        )
        .subscribe((status) => {
          if (!mounted) return;
          if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
            if (channel) {
              scheduleRemoveSupabaseChannel(supabase, channel);
              channel = null;
            }
            retryTimeout = setTimeout(() => subscribe(), 3000);
          }
        });
    };

    const start = () => {
      if (!mounted) return;
      void subscribe();
    };
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(start, { timeout: 6000 });
    } else {
      startTimer = setTimeout(start, 2000);
    }

    return () => {
      mounted = false;
      if (idleId !== undefined && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
      if (startTimer) clearTimeout(startTimer);
      if (retryTimeout) clearTimeout(retryTimeout);
      if (channel) scheduleRemoveSupabaseChannel(supabase, channel);
    };
  }, []);

  const value: NavAlertsContextType = {
    hasNewMessages,
    hasNewNotifications,
    clearMessagesAlert,
    clearNotificationsAlert,
  };

  return (
    <NavAlertsContext.Provider value={value}>
      {children}
    </NavAlertsContext.Provider>
  );
}
