'use client';

import { AppLayout } from '@/components/layouts/AppLayout';

export default function LoadingMarketplaceBrowse() {
  return (
    <AppLayout mode="customer">
      <div className="min-h-screen bg-bg pb-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="rounded-2xl border border-border bg-surface p-4 animate-pulse">
            <div className="h-5 w-40 rounded bg-surface2" />
            <div className="mt-3 h-11 w-full rounded-xl bg-surface2" />
            <div className="mt-2 h-10 w-full rounded-xl bg-surface2" />
          </div>
          <div className="mt-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-2xl border border-border bg-surface p-4 animate-pulse">
                <div className="flex gap-4">
                  <div className="h-16 w-16 rounded-xl bg-surface2" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 rounded bg-surface2" />
                    <div className="h-3 w-1/2 rounded bg-surface2" />
                    <div className="h-3 w-2/3 rounded bg-surface2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
