'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import Link from 'next/link';

/**
 * Pro Notifications - Screen 20
 * Notifications focused on bookings, job changes, payouts
 */
export default function ProNotifications() {
  return (
    <AppLayout mode="pro">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold text-text mb-6">
          Notifications
        </h1>

        <div className="surface-card p-6 border-l-[var(--border-accent)] border-l-accent">
          <div className="text-base font-semibold text-text">No notifications yet</div>
          <div className="mt-1 text-sm text-muted">
            When customers message you or send requests, you’ll see updates here.
          </div>
          <div className="mt-4">
            <Link href="/pro/requests" className="text-sm font-medium text-text hover:underline">
              Go to requests →
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}












