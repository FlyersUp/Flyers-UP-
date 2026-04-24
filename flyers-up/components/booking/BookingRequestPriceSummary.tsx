'use client';

import { useMemo } from 'react';
import { computeMarketplaceFees, resolveMarketplacePricingVersionForBooking } from '@/lib/pricing/fees';
import { getFeeProfileForOccupationSlug } from '@/lib/pricing/category-config';
import { applyMinimumBookingSubtotal } from '@/lib/pricing/config';

function fmtCents(cents: number): string {
  return (Math.max(0, Math.round(cents)) / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export type BookingAddonLine = { id: string; title: string; priceCents: number };

export function BookingRequestPriceSummary({
  occupationSlug,
  customerUserId,
  primaryLine,
  addonLines,
}: {
  occupationSlug: string | null | undefined;
  customerUserId: string | null | undefined;
  primaryLine: { label: string; cents: number };
  addonLines: BookingAddonLine[];
}) {
  const breakdown = useMemo(() => {
    const rawBase = Math.max(0, Math.round(primaryLine.cents));
    const addonsSum = addonLines.reduce((s, a) => s + Math.max(0, a.priceCents), 0);
    const rawSubtotal = rawBase + addonsSum;
    const minApply = applyMinimumBookingSubtotal({
      rawSubtotalCents: rawSubtotal,
      occupationSlug: occupationSlug ?? null,
    });
    if (!minApply.ok) {
      return { error: minApply.error, minApply: null as ReturnType<typeof applyMinimumBookingSubtotal> | null, fees: null };
    }
    const fees = computeMarketplaceFees(
      minApply.enforcedSubtotalCents,
      resolveMarketplacePricingVersionForBooking({ customerId: customerUserId ?? null }),
      getFeeProfileForOccupationSlug(occupationSlug)
    );
    return { error: null as string | null, minApply, fees, rawBase, addonsSum };
  }, [occupationSlug, customerUserId, primaryLine.cents, primaryLine.label, addonLines]);

  if (breakdown.error || !breakdown.minApply || !breakdown.fees) {
    return (
      <div className="rounded-2xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-100">
        {breakdown.error ?? 'Unable to compute pricing preview.'}
      </div>
    );
  }

  const { fees, minApply, rawBase } = breakdown;

  return (
    <div className="rounded-2xl border border-[#E8EAED] bg-[#FAFBFC] p-4 dark:border-white/10 dark:bg-[#14161c]">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280] dark:text-white/55 mb-3">
        Booking estimate
      </p>
      <ul className="space-y-2 text-sm">
        <li className="flex justify-between gap-3 text-[#2d3436] dark:text-white">
          <span className="text-muted dark:text-white/60 shrink min-w-0">{primaryLine.label}</span>
          <span className="font-medium tabular-nums shrink-0">{fmtCents(rawBase)}</span>
        </li>
        {addonLines.map((a) => (
          <li key={a.id} className="flex justify-between gap-3 text-[#2d3436] dark:text-white">
            <span className="text-muted dark:text-white/60 shrink min-w-0">Add-on · {a.title}</span>
            <span className="font-medium tabular-nums shrink-0">+{fmtCents(a.priceCents)}</span>
          </li>
        ))}
      </ul>
      <div className="my-3 border-t border-[#E5E7EB] dark:border-white/10" />
      <div className="flex justify-between text-sm text-[#2d3436] dark:text-white">
        <span className="text-muted dark:text-white/60">Subtotal (pro rate)</span>
        <span className="font-semibold tabular-nums">{fmtCents(minApply.enforcedSubtotalCents)}</span>
      </div>
      {minApply.adjusted ? (
        <p className="mt-1 text-xs text-[#6B7280] dark:text-white/50">Includes a minimum booking adjustment for this service type.</p>
      ) : null}
      <div className="mt-2 space-y-1.5 text-sm text-[#2d3436] dark:text-white">
        <div className="flex justify-between gap-3">
          <span className="text-muted dark:text-white/60">Marketplace fees</span>
          <span className="tabular-nums">{fmtCents(fees.totalFeeCents)}</span>
        </div>
      </div>
      <div className="my-3 border-t border-[#E5E7EB] dark:border-white/10" />
      <div className="flex justify-between items-baseline gap-3">
        <span className="text-sm font-semibold text-[#2d3436] dark:text-white">Your total</span>
        <span className="text-lg font-bold text-[#4A69BD] dark:text-[#7BA3E8] tabular-nums">
          {fmtCents(fees.totalCustomerCents)}
        </span>
      </div>
      <div className="mt-2 flex justify-between text-xs text-[#6B7280] dark:text-white/55">
        <span>Pro receives (estimate)</span>
        <span className="font-medium text-[#2d3436] dark:text-white tabular-nums">{fmtCents(fees.proEarningsCents)}</span>
      </div>
    </div>
  );
}
