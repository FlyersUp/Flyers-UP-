'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4">
      <Logo size="md" linkToHome />
      <div className="mt-8 max-w-md text-center">
        <h1 className="text-xl font-semibold text-text mb-2">Something went wrong</h1>
        <p className="text-muted text-sm mb-6">
          We encountered an error. Please try again or return home.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2.5 bg-accent text-accentContrast rounded-lg font-medium hover:opacity-95"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-4 py-2.5 border border-border rounded-lg font-medium text-text hover:bg-surface"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
