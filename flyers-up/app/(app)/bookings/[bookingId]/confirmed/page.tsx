'use client';

/**
 * Booking Confirmed — Post-Stripe return (deposit or remaining balance via ?phase=final).
 */

import { Suspense, use } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { ConfirmedPageClient } from './ConfirmedPageClient';

function ConfirmedFallback() {
  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-lg md:max-w-xl mx-auto px-4 md:px-6 py-8">
        <div className="space-y-5 animate-pulse">
          <div className="flex flex-col items-center py-6">
            <div className="h-14 w-14 rounded-full bg-[#E5E5E5] dark:bg-[#2D2D2D]" />
            <div className="mt-4 h-6 w-48 rounded bg-[#E5E5E5] dark:bg-[#2D2D2D]" />
          </div>
          <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-6 h-32" />
        </div>
      </div>
    </div>
  );
}

export default function ConfirmedPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = use(params);
  return (
    <AppLayout mode="customer">
      <Suspense fallback={<ConfirmedFallback />}>
        <ConfirmedPageClient bookingId={bookingId} />
      </Suspense>
    </AppLayout>
  );
}
