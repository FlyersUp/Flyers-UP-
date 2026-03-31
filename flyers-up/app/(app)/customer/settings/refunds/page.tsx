'use client';

import Link from 'next/link';
import { AppLayout } from '@/components/layouts/AppLayout';
import { TrustRow } from '@/components/ui/TrustRow';

/**
 * Customer refunds — dedicated route (sidebar "Refunds").
 * Refund handling is tied to bookings and support; no standalone "request refund" product UI yet.
 */
export default function CustomerRefundsSettingsPage() {
  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div>
          <Link href="/customer/settings" className="text-sm text-muted hover:text-text">
            ← Back to Settings
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-text">Refunds</h1>
          <p className="mt-2 text-sm text-muted">
            Refunds are issued when a booking is cancelled or adjusted according to our policies—not from this screen.
          </p>
          <div className="mt-3">
            <TrustRow />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-text">Where to look</h2>
          <ul className="list-disc pl-5 text-sm text-muted space-y-2">
            <li>
              Open a specific booking to see payment and refund status on that job.
            </li>
            <li>
              For billing questions or to dispute a charge, contact support—we’ll walk you through next steps.
            </li>
          </ul>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href="/customer/bookings"
              className="inline-flex items-center justify-center rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accentContrast hover:opacity-95"
            >
              View bookings
            </Link>
            <Link
              href="/customer/settings/help-support"
              className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text hover:bg-hover"
            >
              Help &amp; support
            </Link>
            <Link
              href="/customer/settings/payments"
              className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text hover:bg-hover"
            >
              Payment settings
            </Link>
          </div>
        </div>

        <p className="text-xs text-muted">
          Payment methods and saved cards are managed under{' '}
          <Link href="/customer/settings/payment-methods" className="text-accent underline hover:opacity-90">
            Payment methods
          </Link>
          , not here.
        </p>
      </div>
    </AppLayout>
  );
}
