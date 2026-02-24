'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

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
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const subscribe = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel('nav-alerts-booking-messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'booking_messages',
          },
          (payload) => {
            const row = payload.new as { sender_id?: string };
            if (row?.sender_id && row.sender_id !== user.id) {
              setHasNewMessages(true);
              setHasNewNotifications(true);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            console.warn('NavAlerts: realtime subscription error');
          }
        });
    };

    subscribe();
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
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
