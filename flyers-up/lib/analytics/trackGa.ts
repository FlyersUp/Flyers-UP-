'use client';

/**
 * Client-only GA4 events via `@next/third-parties/google` dataLayer.
 * Call only after server/auth/payment success — never on click alone.
 */

import { sendGAEvent } from '@next/third-parties/google';

type GaParams = Record<string, string | number | undefined>;

export function trackGaEvent(eventName: string, params?: GaParams): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: Record<string, string | number> = {};
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== '') payload[k] = v;
      }
    }
    sendGAEvent('event', eventName, payload);
  } catch {
    /* non-blocking */
  }
}
