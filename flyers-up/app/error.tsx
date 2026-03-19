'use client';

/**
 * ROUTE-LEVEL ERROR BOUNDARY
 * Catches runtime/render errors in route segments and their children.
 * Does NOT catch: not-found (use not-found.tsx), layout errors, or fatal root failures (use global-error.tsx).
 */

import { useEffect } from 'react';
import Link from 'next/link';
import { Home, RotateCw } from 'lucide-react';
import { ReportIssueButton } from '@/components/error';
import { ErrorPageCard } from '@/components/error/ErrorPageCard';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Route error:', error);
  }, [error]);

  const errorMessage = typeof error?.message === 'string' ? error.message : null;
  const errorDigest = typeof (error as Error & { digest?: string })?.digest === 'string'
    ? (error as Error & { digest?: string }).digest
    : null;
  const stack = typeof error?.stack === 'string' ? error.stack : null;

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <ErrorPageCard
        headline="Something went wrong"
        body="This page ran into an unexpected problem. Please report it so we can fix it."
      >
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full text-sm font-semibold bg-accent text-accentContrast hover:opacity-95 transition-opacity"
        >
          <RotateCw size={18} strokeWidth={2} />
          Try Again
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full text-sm font-medium border border-black/15 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <Home size={18} strokeWidth={2} />
          Go Home
        </Link>
        <ReportIssueButton
          variant="secondary"
          context={{
            errorMessage,
            errorDigest,
            stack,
            errorType: 'route_error',
          }}
        />
      </ErrorPageCard>
    </div>
  );
}
