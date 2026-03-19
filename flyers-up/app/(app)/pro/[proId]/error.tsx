'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ProfilePageShell } from '@/components/profile/ProfilePageShell';

export default function ProProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Pro profile error:', error);
  }, [error]);

  return (
    <ProfilePageShell>
      <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/30 p-6 text-center">
        <h2 className="text-lg font-semibold text-red-800 dark:text-red-300">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm text-red-700 dark:text-red-400">
          We couldn&apos;t load this pro&apos;s profile. Please try again.
        </p>
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-xl border border-black/10 dark:border-white/10 px-4 py-2 text-sm font-semibold text-[#111111] dark:text-[#F5F7FA] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </ProfilePageShell>
  );
}
