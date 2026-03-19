'use client';

import { AppLayout } from '@/components/layouts/AppLayout';

export default function MarketplaceBrowseError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AppLayout mode="customer">
      <div className="min-h-screen bg-bg pb-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50/70 dark:bg-red-950/20 p-6">
            <h1 className="text-lg font-semibold text-red-800 dark:text-red-300">Marketplace is unavailable</h1>
            <p className="text-sm text-red-700 dark:text-red-400 mt-1">
              We couldn&apos;t load this browse screen right now. Please try again.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              className="mt-4 rounded-xl bg-red-600 text-white px-4 py-2 text-sm font-semibold hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
