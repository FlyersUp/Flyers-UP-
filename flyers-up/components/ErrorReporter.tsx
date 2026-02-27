'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const TERMS_VERSION = '2026-01-27';

function getRelease() {
  // Vercel injects NEXT_PUBLIC_VERCEL_* on the client only if you define them.
  // We still include a stable app/version marker for correlation.
  return TERMS_VERSION;
}

function isChunkLoadError(message: string): boolean {
  const s = message.toLowerCase();
  return (
    s.includes('failed to load chunk') ||
    s.includes('loading chunk') ||
    s.includes('chunkloaderror') ||
    s.includes('failed to fetch dynamically imported module')
  );
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
  const [chunkError, setChunkError] = useState(false);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      const msg = event.message || 'Window error';
      if (isChunkLoadError(msg)) setChunkError(true);
      void postError({
        message: msg,
        stack: event.error && (event.error as any).stack ? String((event.error as any).stack) : null,
        severity: isChunkLoadError(msg) ? 'fatal' : 'error',
        meta: {
          filename: (event as any).filename,
          lineno: (event as any).lineno,
          colno: (event as any).colno,
        },
      });
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const msg =
        reason instanceof Error ? reason.message : `Unhandled rejection: ${String(reason)}`;
      if (isChunkLoadError(msg)) setChunkError(true);
      void postError({
        message: msg,
        stack: reason instanceof Error ? reason.stack ?? null : null,
        severity: isChunkLoadError(msg) ? 'fatal' : 'error',
      });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  if (!chunkError) return null;

  return (
    <div
      role="alert"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div className="mx-4 max-w-md rounded-xl border border-[var(--hairline)] bg-surface p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-text">Update available</h2>
        <p className="mt-2 text-sm text-muted">
          A new version of the app was deployed. Please refresh the page to load the latest version.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accentContrast hover:opacity-95"
        >
          Refresh page
        </button>
      </div>
    </div>
  );
}

