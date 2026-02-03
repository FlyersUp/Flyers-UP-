'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const TERMS_VERSION = '2026-01-27';

function getRelease() {
  // Vercel injects NEXT_PUBLIC_VERCEL_* on the client only if you define them.
  // We still include a stable app/version marker for correlation.
  return TERMS_VERSION;
}

async function postError(payload: {
  message: string;
  stack?: string | null;
  severity?: 'error' | 'fatal';
  meta?: Record<string, unknown>;
}) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch('/api/errors', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(session?.access_token ? { authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({
        source: 'client',
        severity: payload.severity ?? 'error',
        message: payload.message,
        stack: payload.stack ?? null,
        url: typeof window !== 'undefined' ? window.location.href : null,
        route: typeof window !== 'undefined' ? window.location.pathname : null,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        release: getRelease(),
        meta: payload.meta ?? {},
      }),
      keepalive: true,
    });
  } catch {
    // Swallow - logging must never crash the app.
  }
}

export function ErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      void postError({
        message: event.message || 'Window error',
        stack: (event.error && (event.error as any).stack) ? String((event.error as any).stack) : null,
        severity: 'error',
        meta: {
          filename: (event as any).filename,
          lineno: (event as any).lineno,
          colno: (event as any).colno,
        },
      });
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      void postError({
        message: reason instanceof Error ? reason.message : `Unhandled rejection: ${String(reason)}`,
        stack: reason instanceof Error ? reason.stack ?? null : null,
        severity: 'error',
      });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}

