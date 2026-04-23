'use client';

import Link from 'next/link';
import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/layouts/AppLayout';
import { HybridAppHeader } from '@/components/hybrid/AppHeader';
import { ServiceChips } from '@/components/hybrid/ServiceChips';
import { HybridProCard } from '@/components/hybrid/ProCard';
import { AvailabilityAlertCard } from '@/components/hybrid/AvailabilityAlertCard';
import type { SupplyState } from '@/lib/hybrid-ui/types';
import { MOCK_OCCUPATION_INACTIVE, MOCK_OCCUPATION_STRONG, MOCK_OCCUPATION_WEAK } from '@/lib/hybrid-ui/mock-data';
import { Music2 } from 'lucide-react';

function OccupationInner() {
  const sp = useSearchParams();
  const raw = (sp.get('state') ?? 'strong').toLowerCase();
  const state: SupplyState = raw === 'weak' || raw === 'inactive' ? raw : 'strong';
  const content = useMemo(() => {
    if (state === 'weak') return MOCK_OCCUPATION_WEAK;
    if (state === 'inactive') return MOCK_OCCUPATION_INACTIVE;
    return MOCK_OCCUPATION_STRONG;
  }, [state]);

  const locationPillClass =
    'inline-flex items-center rounded-full bg-[hsl(33_100%_94%)] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-950 ring-1 ring-amber-200/80';

  return (
    <AppLayout mode="customer" showFloatingNotificationBell={false}>
      <div className="min-h-dvh bg-bg pb-28">
        <HybridAppHeader />
        <div className="px-4 pt-2">
          <span className={locationPillClass}>{content.locationPill}</span>
          {state === 'strong' ? (
            <p className="mt-2 text-xs font-medium text-emerald-800">124 verified pros available</p>
          ) : null}
          {content.spotlightLabel ? (
            <span className={`${locationPillClass} mt-2`}>{content.spotlightLabel}</span>
          ) : null}
        </div>
        <div className="mt-6 px-4">
          <h1 className="text-2xl font-bold leading-tight text-[hsl(var(--trust))]">{content.headline}</h1>
          <p className="mt-3 text-sm leading-relaxed text-text-3">{content.supporting}</p>
          <div className="mt-5">
            <ServiceChips labels={content.chips} />
          </div>
        </div>

        <div className="mt-8 space-y-6 px-4">
          {state === 'strong' && content.featuredPro ? <HybridProCard pro={content.featuredPro} /> : null}

          {state === 'weak' && content.availabilityTitle && content.availabilityBody ? (
            <>
              <AvailabilityAlertCard
                title={content.availabilityTitle}
                body={content.availabilityBody}
                action={
                  <Link
                    href="/customer/hybrid/match-request"
                    className="flex w-full items-center justify-center rounded-2xl border border-[hsl(var(--action-hover)/0.45)] bg-accentOrange py-4 text-center text-base font-semibold text-actionFg shadow-[var(--shadow-1)] hover:bg-[hsl(var(--action-hover))]"
                  >
                    Get matched with a pro
                  </Link>
                }
              />
              <div className="rounded-2xl border border-dashed border-border bg-surface2/50 p-4 text-center text-sm text-text-3">
                Pro list would appear here (booking-first). Wire to{' '}
                <code className="text-xs">getMarketplacePros</code> + gate.
              </div>
            </>
          ) : null}

          {state === 'inactive' ? (
            <div className="space-y-4">
              <div className="flex aspect-[4/3] items-center justify-center rounded-3xl bg-[hsl(222_44%_22%)] text-white shadow-inner">
                <Music2 className="h-16 w-16 opacity-90" strokeWidth={1.25} aria-hidden />
              </div>
              <p className="text-center text-sm text-text-3">
                This service is not instantly bookable in your area right now — we&apos;ll hand-match you with the right
                pro.
              </p>
              <Link
                href="/customer/hybrid/match-request"
                className="flex w-full items-center justify-center rounded-2xl border border-[hsl(var(--trust-hover)/0.5)] bg-trust py-4 text-center text-base font-semibold text-trustFg shadow-sm hover:bg-[hsl(var(--trust-hover))]"
              >
                Request this service
              </Link>
            </div>
          ) : null}
        </div>

        <div className="mt-10 px-4 text-center text-xs text-text-3">
          <Link href="/customer/hybrid/occupation?state=strong" className="mx-2 underline">
            Strong
          </Link>
          ·
          <Link href="/customer/hybrid/occupation?state=weak" className="mx-2 underline">
            Weak
          </Link>
          ·
          <Link href="/customer/hybrid/occupation?state=inactive" className="mx-2 underline">
            Inactive
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}

export default function HybridOccupationPage() {
  return (
    <Suspense
      fallback={
        <AppLayout mode="customer">
          <div className="p-6 text-sm text-text-3">Loading…</div>
        </AppLayout>
      }
    >
      <OccupationInner />
    </Suspense>
  );
}
