'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/layouts/AppLayout';
import { HybridAppHeader } from '@/components/hybrid/AppHeader';
import { RequestStatusTimeline } from '@/components/hybrid/RequestStatusTimeline';
import { MOCK_REQUEST_TIMELINE } from '@/lib/hybrid-ui/mock-data';

function SentInner() {
  const sp = useSearchParams();

  return (
    <AppLayout mode="customer" showFloatingNotificationBell={false}>
      <div className="min-h-dvh bg-bg pb-28">
        <HybridAppHeader />
        <div className="px-4 pt-6 text-center">
          <span className="inline-flex rounded-full bg-[hsl(33_100%_94%)] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-900 ring-1 ring-amber-200/80">
            ✨ Submission received
          </span>
          <h1 className="mt-4 text-2xl font-bold text-[hsl(var(--trust))]">We&apos;re finding a pro for you</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-text-3">
            Sit tight! Our network of verified neighborhood experts is being alerted to your request. You&apos;ll get a
            notification the moment someone grabs your flyer.
          </p>
        </div>
        <div className="mt-10 px-4">
          <RequestStatusTimeline steps={MOCK_REQUEST_TIMELINE} />
        </div>
        <div className="mt-10 px-4">
          <Link
            href={`/customer/requests${sp.toString() ? `?${sp.toString()}` : ''}`}
            className="flex w-full items-center justify-center rounded-2xl border border-[hsl(var(--trust-hover)/0.5)] bg-trust py-4 text-center text-base font-semibold text-trustFg shadow-sm hover:bg-[hsl(var(--trust-hover))]"
          >
            View request details
          </Link>
          <Link href="/customer/hybrid" className="mt-4 block text-center text-sm font-medium text-text-3 hover:text-text">
            Back to home
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}

export default function HybridMatchRequestSentPage() {
  return (
    <Suspense
      fallback={
        <AppLayout mode="customer">
          <div className="p-6 text-sm text-text-3">Loading…</div>
        </AppLayout>
      }
    >
      <SentInner />
    </Suspense>
  );
}
