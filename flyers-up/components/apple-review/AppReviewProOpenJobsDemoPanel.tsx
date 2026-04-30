'use client';

import { DashboardCard } from '@/components/dashboard/DashboardCard';

/**
 * Apple App Review: when the real Open Jobs board is empty, show a non-blocking
 * preview so reviewers still see a populated surface (scoped to reviewer@flyersup.app only).
 */
export function AppReviewProOpenJobsDemoPanel() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
        <span className="font-semibold">App Store review preview</span>
        <span className="text-amber-900/90 dark:text-amber-100/90">
          {' '}
          — sample listings below. Your real incoming jobs (if any) still appear in the Incoming tab.
        </span>
      </div>

      <DashboardCard>
        <div className="p-4">
          <div className="font-semibold text-gray-900 dark:text-white">Handyman — same-day</div>
          <div className="flex flex-wrap gap-2 mt-2 text-sm text-gray-600 dark:text-gray-300">
            <span>2 open requests</span>
            <span>•</span>
            <span>6 pros online</span>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">Suggested: $95–$165</div>
        </div>
      </DashboardCard>

      <DashboardCard>
        <div className="p-4">
          <div className="font-semibold text-gray-900 dark:text-white">Deep cleaning</div>
          <div className="flex flex-wrap gap-2 mt-2 text-sm text-gray-600 dark:text-gray-300">
            <span>1 open request</span>
            <span>•</span>
            <span>4 pros online</span>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">Suggested: $140–$220</div>
        </div>
      </DashboardCard>

      <DashboardCard>
        <div className="p-4">
          <div className="text-sm font-medium text-gray-900 dark:text-white">Customer requests (preview)</div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5">
            When live, nearby customer posts will list here with ZIP and radius filters. For review, use{' '}
            <strong>Incoming</strong> to open a seeded job tied to your demo pro profile.
          </p>
        </div>
      </DashboardCard>
    </div>
  );
}
