'use client';

/**
 * GLOBAL FATAL ERROR BOUNDARY
 * Catches fatal failures that crash the root layout (e.g. layout.tsx, providers).
 * Replaces the entire document — must define own <html> and <body>.
 * Does NOT catch: not-found, route-level errors (those use not-found.tsx and error.tsx).
 */

import { useEffect } from 'react';
import './globals.css';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void; // Next.js passes this; for fatal errors we prefer reload
}

export default function GlobalError({ error }: GlobalErrorProps) {
  useEffect(() => {
    console.error('Global fatal error:', error);
  }, [error]);

  const errorMessage = typeof error?.message === 'string' ? error.message : null;
  const errorDigest = typeof (error as Error & { digest?: string })?.digest === 'string'
    ? (error as Error & { digest?: string }).digest
    : null;
  const stack = typeof error?.stack === 'string' ? error.stack : null;

  return (
    <html lang="en" className="bg-[#F5F5F5] dark:bg-[#0F1115]">
      <body className="min-h-screen bg-[#F5F5F5] dark:bg-[#0F1115] text-[#111111] dark:text-[#F5F7FA] antialiased flex items-center justify-center p-4">
        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#171A20] shadow-lg p-8 max-w-md w-full">
          <h1 className="text-xl font-semibold text-[#111111] dark:text-[#F5F7FA] tracking-tight">
            Something went wrong
          </h1>
          <p className="mt-3 text-[#6A6A6A] dark:text-[#A1A8B3] text-[15px] leading-relaxed">
            A critical error occurred. Please reload the app or go home. If this keeps happening, report it.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => typeof window !== 'undefined' && window.location.reload()}
              className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full text-sm font-semibold bg-[#058954] dark:bg-[#058954] text-white hover:opacity-95 transition-opacity"
            >
              Reload App
            </button>
            <a
              href="/"
              className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full text-sm font-medium border border-black/15 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors no-underline"
            >
              Go Home
            </a>
            {/* ReportIssueButton needs client context - we're in global-error so providers may be broken.
                Use a simple mailto fallback or a minimal report flow. For now we'll still try to render
                ReportIssueButton - it might work if the error was in a child. If not, user can go home. */}
            <ReportIssueButton
              variant="secondary"
              context={{
                errorMessage,
                errorDigest,
                stack,
                errorType: 'global_fatal',
              }}
            />
          </div>
        </div>
      </body>
    </html>
  );
}
