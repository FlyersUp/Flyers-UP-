'use client';

import { use } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layouts/AppLayout';

export default function IssueSubmittedPage({
  params,
}: {
  params: Promise<{ bookingId: string; issueId: string }>;
}) {
  const { bookingId, issueId } = use(params);

  return (
    <AppLayout mode="customer">
      <div className="min-h-screen bg-bg">
        <div className="max-w-xl mx-auto px-4 py-10">
          <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-[hsl(var(--customer-tint))] flex items-center justify-center text-accent text-xl">
              ✓
            </div>
            <h1 className="mt-4 text-2xl font-semibold text-text">Issue submitted</h1>
            <p className="mt-2 text-sm text-muted">
              Your case is now in our Trust team queue. We will review booking details and available
              evidence, then follow up in this case thread.
            </p>

            <div className="mt-5 rounded-xl border border-border bg-bg p-4">
              <h2 className="text-sm font-semibold text-text mb-2">What happens next</h2>
              <ol className="space-y-2 text-sm text-muted">
                <li>1. Case received and logged (now)</li>
                <li>2. Trust review begins (usually within 24 hours)</li>
                <li>3. If needed, we request context from the pro</li>
                <li>4. Resolution posted to your case status page</li>
              </ol>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <Link
                href={`/customer/bookings/${bookingId}/issues/${issueId}`}
                className="h-11 rounded-full bg-accent text-accentContrast text-sm font-semibold flex items-center justify-center hover:opacity-95"
              >
                View case status
              </Link>
              <Link
                href={`/customer/bookings/${bookingId}/track`}
                className="h-11 rounded-full border border-border text-sm font-medium text-text flex items-center justify-center hover:bg-surface2"
              >
                Back to booking
              </Link>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}

