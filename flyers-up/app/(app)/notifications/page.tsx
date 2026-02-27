'use client';

/**
 * Notifications Page
 * Job alerts and activity feed
 */

import Link from 'next/link';
import PageLayout from '@/components/PageLayout';

export default function NotificationsPage() {
  return (
    <PageLayout showBackButton>
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-surface2 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">🔔</span>
        </div>
        <h1 className="text-xl font-semibold text-text mb-2">No notifications yet</h1>
        <p className="text-muted/70 max-w-md mx-auto">
          This page used to show demo notifications. Now it stays empty until real activity happens.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/customer/notifications"
            className="px-5 py-3 bg-surface2 hover:bg-surface text-text rounded-xl font-medium transition-colors border border-border"
          >
            Customer notifications
          </Link>
          <Link
            href="/pro/notifications"
            className="px-5 py-3 bg-surface2 hover:bg-surface text-text rounded-xl font-medium transition-colors border border-border"
          >
            Pro notifications
          </Link>
        </div>
      </div>
    </PageLayout>
  );
}




