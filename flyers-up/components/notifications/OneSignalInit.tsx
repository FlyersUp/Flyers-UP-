'use client';

/**
 * OneSignal Web SDK v16 initialization.
 * Binds logged-in user via login(external_id). Does NOT auto-prompt.
 * Use promptAfterValue() after meaningful moments (first booking, first message, etc.).
 */

import { useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void | Promise<void>>;
  }
}

export function useOneSignalPrompt() {
  const promptAfterValue = useCallback(() => {
    if (typeof window === 'undefined' || !ONESIGNAL_APP_ID) return;
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        await OneSignal.User.PushSubscription.optIn();
      } catch {
        // Fail gracefully if permission denied
      }
    });
  }, []);

  return { promptAfterValue };
}

async function registerDevice(userId: string, subscriptionId: string | null) {
  if (!subscriptionId) return;
  try {
    await fetch('/api/notifications/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        onesignal_player_id: subscriptionId,
        external_user_id: userId,
        platform: 'web',
      }),
    });
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[OneSignal] device register failed:', err);
    }
  }
}

/**
 * Initialize OneSignal and bind current user.
 * Renders inside app layout when user is logged in.
 */
export function OneSignalInit({ userId }: { userId: string | null }) {
  useEffect(() => {
    if (typeof window === 'undefined' || !ONESIGNAL_APP_ID || !userId) return;

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function (OneSignal: any) {
      try {
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          serviceWorkerPath: "push/onesignal/OneSignalSDKWorker.js",
          serviceWorkerParam: { scope: "/push/onesignal/" },
          allowLocalhostAsSecureOrigin: true,
        });
        await OneSignal.login(userId);

        const subId = OneSignal.User?.PushSubscription?.id;
        if (subId) void registerDevice(userId, subId);

        const sub = OneSignal.User?.PushSubscription;
        if (sub?.addEventListener) {
          sub.addEventListener('change', (event: { current?: { id?: string } }) => {
            const id = event?.current?.id;
            if (id) void registerDevice(userId, id);
          });
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[OneSignal] init failed:', err);
        }
      }
    });
  }, [userId]);

  return null;
}
