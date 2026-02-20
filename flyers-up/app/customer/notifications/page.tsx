'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import Link from 'next/link';

/**
 * Customer Notifications - Screen 11
 * List of notifications with icons and timestamps
 */
export default function CustomerNotifications() {
  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold text-text mb-6">
          Notifications
        </h1>

        <div className="surface-card p-6 border-l-[var(--border-accent)] border-l-accent">
          <div className="text-base font-semibold text-text">No notifications yet</div>
          <div className="mt-1 text-sm text-muted">
            When you book a pro or get messages, you’ll see updates here.
          </div>
          <div className="mt-4">
            <Link href="/services" className="text-sm font-medium text-text hover:underline">
              Browse services →
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}












