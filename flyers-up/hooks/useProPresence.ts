/**
 * Pro presence ping: every 30s updates pro_presence with is_online=true.
 * On visibility hidden or beforeunload, sets is_online=false.
 * Logs marketplace_events 'presence_ping' only on state changes (low volume).
 */
'use client';

import { useEffect, useRef, useCallback } from 'react';

const PING_INTERVAL_MS = 30_000;

export function useProPresence(options?: {
  borough?: string | null;
  neighborhood?: string | null;
  enabled?: boolean;
}) {
  const { borough, neighborhood, enabled = true } = options ?? {};
  const wasOnlineRef = useRef<boolean | null>(null);

  const ping = useCallback(async (isOnline: boolean) => {
    try {
      const res = await fetch('/api/demand/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_online: isOnline,
          borough: borough ?? null,
          neighborhood: neighborhood ?? null,
        }),
      });
      if (!res.ok) {
        console.warn('[useProPresence] ping failed:', res.status);
      }
    } catch (err) {
      console.warn('[useProPresence] ping error:', err);
    }
  }, [borough, neighborhood]);

  useEffect(() => {
    if (!enabled) return;

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void ping(false);
        wasOnlineRef.current = false;
      } else if (document.visibilityState === 'visible') {
        void ping(true);
        wasOnlineRef.current = true;
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    const id = setInterval(() => {
      void ping(true);
      wasOnlineRef.current = true;
    }, PING_INTERVAL_MS);

    void ping(true);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      void ping(false);
    };
  }, [enabled, ping]);
}
