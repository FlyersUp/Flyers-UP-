'use client';

import React, { useState } from 'react';
import { labelDynamicPricingReason } from '@/lib/bookings/dynamic-pricing-reason-labels';
/**
 * Review & pay deposit — Airbnb/Uber/Apple style
 *
 * - Compact trip card (thumbnail + details in one row)
 * - Clean price breakdown
 * - Trust inline
 * - Mobile-first, premium feel
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { PriceRow } from '@/components/ui/PriceRow';

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function formatDateTime(serviceDate?: string, serviceTime?: string): string {
  if (!serviceDate) return '—';
  try {
    const d = new Date(serviceDate);
    if (Number.isNaN(d.getTime())) return serviceDate;
    const dateStr = d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    return serviceTime ? `${dateStr} at ${serviceTime}` : dateStr;
  } catch {
    return serviceDate;
  }
}

export interface QuoteBreakdown {
  amountSubtotal: number;
  amountPlatformFee: number;
  amountTravelFee: number;
  amountTotal: number;
  serviceFeeCents?: number;
  convenienceFeeCents?: number;
  protectionFeeCents?: number;
  demandFeeCents?: number;
  feeTotalCents?: number;
  promoDiscountCents?: number;
  amountDeposit?: number;
  amountRemaining?: number;
  depositPercent?: number;
  dynamicPricingReasons?: string[];
  currency: string;
}

export interface BookingSummaryDepositProps {
  proName: string;
  proPhotoUrl: string | null;
  serviceName: string;
  serviceDate: string;
  serviceTime: string;
  address?: string | null;
  durationHours?: number | null;
  scopeSummary?: string | null;
  addons?: { title: string; priceCents: number }[];
  quote: QuoteBreakdown;
  /** Shown when server raised subtotal to platform minimum (no percentages). */
  minimumBookingNotice?: string | null;
  paymentDueAt?: string | null;
  children: ReactNode;
  className?: string;
}

/** Airbnb-style compact trip card: thumbnail + pro + service + date */
function TripSummaryCard({
  proName,
  proPhotoUrl,
  serviceName,
  serviceDate,
  serviceTime,
  address,
  durationHours,
}: {
  proName: string;
  proPhotoUrl: string | null;
  serviceName: string;
  serviceDate: string;
  serviceTime: string;
  address?: string | null;
  durationHours?: number | null;
}) {
  return (
    <div className="flex gap-4 rounded-[20px] border border-[#E8EAED] bg-white p-5 shadow-[0_4px_24px_rgba(74,105,189,0.06)] dark:border-white/10 dark:bg-[#1a1d24] dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)]">
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-[#F5F6F8] dark:bg-white/10">
        {proPhotoUrl ? (
          <img src={proPhotoUrl} alt={proName} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl text-[#999] dark:text-white/40">👤</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-[#2d3436] dark:text-white">{proName}</p>
        <p className="truncate text-sm text-[#6B7280] dark:text-white/65">{serviceName}</p>
        <p className="mt-1.5 text-sm text-[#6B7280] dark:text-white/65">
          {formatDateTime(serviceDate, serviceTime)}
        </p>
        {durationHours != null && durationHours > 0 && (
          <p className="text-xs text-[#6B7280] dark:text-white/55">{durationHours} hr{durationHours !== 1 ? 's' : ''}</p>
        )}
        {address && address.trim() && (
          <p className="mt-0.5 line-clamp-1 text-xs text-[#6B7280] dark:text-white/55">{address}</p>
        )}
      </div>
    </div>
  );
}

/** Airbnb-style price details — clean rows */
function PriceDetailsBlock({
  quote,
  showDeposit,
  defaultExpanded = true,
}: {
  quote: QuoteBreakdown;
  showDeposit: boolean;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const baseAmount = quote.amountSubtotal - (quote.amountTravelFee ?? 0);
  const hasDeposit = showDeposit && quote.amountDeposit != null && quote.amountDeposit > 0;

  return (
    <div className="overflow-hidden rounded-[20px] border border-[#E8EAED] bg-white shadow-[0_4px_24px_rgba(74,105,189,0.06)] dark:border-white/10 dark:bg-[#1a1d24] dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)]">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-[#F5F6F8]/80 dark:hover:bg-white/[0.04]"
        aria-expanded={expanded}
      >
        <span className="text-sm font-semibold text-[#2d3436] dark:text-white">Price details</span>
        <span className="text-sm font-semibold tabular-nums text-[#4A69BD] dark:text-[#6b8fd4]">
          {formatCents(hasDeposit ? quote.amountDeposit! : quote.amountTotal)}
        </span>
      </button>
      {expanded && (
        <div className="space-y-3 border-t border-[#EEF0F2] px-5 pb-5 pt-4 dark:border-white/10">
          <PriceRow label="Subtotal (pro rate)" value={formatCents(baseAmount)} />
          {(quote.amountTravelFee ?? 0) > 0 && (
            <PriceRow label="Travel fee" value={formatCents(quote.amountTravelFee!)} />
          )}
          {(quote.serviceFeeCents ?? 0) > 0 && (
            <PriceRow label="Service fee" value={formatCents(quote.serviceFeeCents ?? 0)} />
          )}
          {(quote.convenienceFeeCents ?? 0) > 0 && (
            <PriceRow label="Convenience fee" value={formatCents(quote.convenienceFeeCents ?? 0)} />
          )}
          {(quote.protectionFeeCents ?? 0) > 0 && (
            <PriceRow label="Protection" value={formatCents(quote.protectionFeeCents ?? 0)} />
          )}
          {(quote.demandFeeCents ?? 0) > 0 && (
            <PriceRow label="Busy-time fee" value={formatCents(quote.demandFeeCents ?? 0)} />
          )}
          {(quote.promoDiscountCents ?? 0) > 0 && (
            <PriceRow label="Discount" value={`-${formatCents(quote.promoDiscountCents ?? 0)}`} />
          )}
          {(quote.feeTotalCents == null && (quote.amountPlatformFee ?? 0) > 0) && (
            <PriceRow
              label="Fees"
              value={formatCents(quote.amountPlatformFee ?? 0)}
              subtext="Secure payments, support & dispute resolution"
            />
          )}
          <PriceRow
            className="border-t border-[#EEF0F2] pt-4 dark:border-white/10"
            label="Total"
            value={formatCents(quote.amountTotal)}
            emphasize
          />
          {hasDeposit && (
            <>
              <PriceRow label={`Due now (${quote.depositPercent ?? 50}% deposit)`} value={formatCents(quote.amountDeposit!)} emphasize />
              <PriceRow label="Due after job" value={formatCents(quote.amountRemaining ?? 0)} />
            </>
          )}
          {!hasDeposit && (quote.amountRemaining ?? 0) > 0 && (
            <PriceRow
              label="Remaining balance (pay now)"
              value={formatCents(quote.amountRemaining ?? 0)}
              emphasize
            />
          )}
          {(quote.dynamicPricingReasons?.length ?? 0) > 0 && (
            <div className="mt-2 rounded-lg bg-black/[0.03] dark:bg-white/[0.04] px-2 py-2">
              <p className="text-[11px] font-medium text-[#717171] dark:text-white/60 mb-1">
                What affected your price
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-[#444] dark:text-white/75">
                {quote.dynamicPricingReasons!.map((code) => (
                  <li key={code}>{labelDynamicPricingReason(code)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Compact trust line — Uber/Apple style */
function TrustLine() {
  return (
    <div className="flex items-center gap-2 text-xs text-[#6B7280] dark:text-white/55">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      <span>Secure payment · Held until job completion</span>
    </div>
  );
}

export function BookingSummaryDeposit({
  proName,
  proPhotoUrl,
  serviceName,
  serviceDate,
  serviceTime,
  address,
  durationHours,
  scopeSummary,
  addons,
  quote,
  minimumBookingNotice,
  paymentDueAt,
  children,
  className,
}: BookingSummaryDepositProps) {
  const hasDeposit = (quote.amountDeposit ?? 0) > 0;

  return (
    <div className={cn('space-y-5', className)} data-role="customer">
      {/* Trip summary — Airbnb compact card */}
      <section aria-labelledby="trip-summary">
        <h2 id="trip-summary" className="sr-only">Your booking</h2>
        <TripSummaryCard
          proName={proName}
          proPhotoUrl={proPhotoUrl}
          serviceName={serviceName}
          serviceDate={serviceDate}
          serviceTime={serviceTime}
          address={address}
          durationHours={durationHours}
        />
      </section>

      {/* Payment due banner */}
      {paymentDueAt && (
        <div
          className="rounded-xl bg-[#dcfce7] dark:bg-emerald-500/15 border border-emerald-200/60 dark:border-emerald-500/30 px-4 py-3"
          role="status"
        >
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-400">Pay within 30 minutes to lock your time</p>
          <CountdownTimer paymentDueAt={paymentDueAt} />
        </div>
      )}

      {minimumBookingNotice?.trim() ? (
        <div
          className="rounded-xl border border-amber-200/90 dark:border-amber-500/35 bg-amber-50 dark:bg-amber-500/10 px-4 py-3"
          role="status"
        >
          <p className="text-sm text-amber-950 dark:text-amber-100/95">{minimumBookingNotice.trim()}</p>
        </div>
      ) : null}

      {/* Scope summary (optional) */}
      {scopeSummary && scopeSummary.trim() && (
        <div className="rounded-[20px] border border-[#E8EAED] bg-white p-5 shadow-[0_4px_24px_rgba(74,105,189,0.06)] dark:border-white/10 dark:bg-[#1a1d24] dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)]">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-white/55">
            Scope
          </p>
          <p className="text-sm text-[#222] dark:text-white/90">{scopeSummary}</p>
        </div>
      )}

      {/* Add-ons (optional) */}
      {addons && addons.length > 0 && (
        <div className="rounded-[20px] border border-[#E8EAED] bg-white p-5 shadow-[0_4px_24px_rgba(74,105,189,0.06)] dark:border-white/10 dark:bg-[#1a1d24] dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)]">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-white/55">
            Add-ons
          </p>
          <ul className="space-y-1.5 text-sm">
            {addons.map((a, i) => (
              <li key={i} className="flex justify-between">
                <span className="text-[#717171] dark:text-white/70">{a.title}</span>
                <span className="font-medium text-[#222] dark:text-white">{formatCents(a.priceCents)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Price details — expandable Airbnb-style */}
      <section aria-labelledby="price-details">
        <h2 id="price-details" className="sr-only">Price breakdown</h2>
        <PriceDetailsBlock quote={quote} showDeposit={hasDeposit} />
      </section>

      {/* Trust line */}
      <TrustLine />

      {/* Payment form slot */}
      {children}
    </div>
  );
}

function CountdownTimer({ paymentDueAt }: { paymentDueAt: string }) {
  const [remaining, setRemaining] = React.useState<string>('');

  React.useEffect(() => {
    const update = () => {
      const due = new Date(paymentDueAt).getTime();
      const now = Date.now();
      const diff = Math.max(0, due - now);
      if (diff <= 0) {
        setRemaining('Expired');
        return;
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${m}:${s.toString().padStart(2, '0')}`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [paymentDueAt]);

  if (!remaining) return null;
  return (
    <p className="mt-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">
      Time remaining: {remaining}
    </p>
  );
}
