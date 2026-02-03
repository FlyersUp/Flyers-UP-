'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Best-effort: report the crash (no auth required; server can still record).
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        source: 'client',
        severity: 'fatal',
        message: error?.message || 'Global error',
        stack: (error as any)?.stack ?? null,
        url: typeof window !== 'undefined' ? window.location.href : null,
        route: typeof window !== 'undefined' ? window.location.pathname : null,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        meta: { digest: (error as any)?.digest ?? null },
      }),
      keepalive: true,
    }).catch(() => {});
  }, [error]);

  return (
    <html>
      <body className="min-h-screen bg-bg text-text flex items-center justify-center p-6">
        <div className="max-w-md w-full surface-card p-6">
          <div className="text-sm font-semibold tracking-tight">Something went wrong</div>
          <div className="mt-2 text-sm text-muted">
            Please try again. If this keeps happening, contact support.
          </div>
          <button
            type="button"
            className="mt-4 w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accentContrast hover:opacity-95 transition-opacity"
            onClick={() => reset()}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}

