'use client';

import React from 'react';
/**
 * Booking Summary + Deposit Payment Step
 *
 * STEP 1 — USER INTENT
 * - User wants to pay the deposit to lock their booking
 * - Friction: "How much do I pay now vs later?" "Is this safe?" "What happens next?"
 * - Hesitation: unclear pricing, fear of overpaying, trust in platform
 *
 * STEP 2 — UI REFERENCE MAP
 * - Stripe: payment clarity, minimal checkout
 * - Airbnb: booking summary warmth, trust
 * - Linear: spacing, precision
 * - Apple: polish, calm
 *
 * STEP 3 — PRODUCT PSYCHOLOGY
 * - Reduce uncertainty: show deposit vs remaining explicitly
 * - Next step obvious: single primary CTA
 * - What happens next: trust copy
 * - Reinforce trust: protection cues
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/cn';

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
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
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
  amountDeposit?: number;
  amountRemaining?: number;
  depositPercent?: number;
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
  paymentDueAt?: string | null;
  children: ReactNode;
  className?: string;
}

/** Pro summary card — compact, trust-building */
function ProSummaryBlock({
  proName,
  proPhotoUrl,
  serviceName,
}: {
  proName: string;
  proPhotoUrl: string | null;
  serviceName: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#F7F6F4] dark:bg-[#1D2128]">
        {proPhotoUrl ? (
          <img src={proPhotoUrl} alt={proName} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-[#6A6A6A] dark:text-[#A1A8B3]">
            —
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-[#111111] dark:text-[#F5F7FA]">{proName}</p>
        <p className="text-sm text-[#6A6A6A] dark:text-[#A1A8B3]">{serviceName}</p>
      </div>
    </div>
  );
}

/** Service details — date, time, address */
function ServiceDetailsBlock({
  serviceDate,
  serviceTime,
  address,
  durationHours,
}: {
  serviceDate: string;
  serviceTime: string;
  address?: string | null;
  durationHours?: number | null;
}) {
  return (
    <div className="space-y-1 text-sm">
      <p className="text-[#3A3A3A] dark:text-[#A1A8B3]">
        {formatDateTime(serviceDate, serviceTime)}
      </p>
      {durationHours != null && durationHours > 0 && (
        <p className="text-[#6A6A6A] dark:text-[#A1A8B3]">
          {durationHours} hr{durationHours !== 1 ? 's' : ''}
        </p>
      )}
      {address && address.trim() && (
        <p className="text-[#6A6A6A] dark:text-[#A1A8B3]">{address}</p>
      )}
    </div>
  );
}

/** Pricing breakdown — Stripe-style clarity */
function PricingBreakdownBlock({
  quote,
  showDeposit,
}: {
  quote: QuoteBreakdown;
  showDeposit: boolean;
}) {
  const baseAmount = quote.amountSubtotal - (quote.amountTravelFee ?? 0);
  const hasDeposit = showDeposit && quote.amountDeposit != null && quote.amountDeposit > 0;

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-[#6A6A6A] dark:text-[#A1A8B3]">Service</span>
        <span className="text-[#111111] dark:text-[#F5F7FA]">{formatCents(baseAmount)}</span>
      </div>
      {(quote.amountTravelFee ?? 0) > 0 && (
        <div className="flex justify-between">
          <span className="text-[#6A6A6A] dark:text-[#A1A8B3]">Travel fee</span>
          <span className="text-[#111111] dark:text-[#F5F7FA]">
            {formatCents(quote.amountTravelFee!)}
          </span>
        </div>
      )}
      {(quote.amountPlatformFee ?? 0) > 0 && (
        <div className="flex justify-between">
          <span className="text-[#6A6A6A] dark:text-[#A1A8B3]">Platform fee</span>
          <span className="text-[#111111] dark:text-[#F5F7FA]">
            {formatCents(quote.amountPlatformFee!)}
          </span>
        </div>
      )}
      <div className="flex justify-between border-t border-black/5 dark:border-white/10 pt-3 mt-3 font-semibold">
        <span className="text-[#111111] dark:text-[#F5F7FA]">Total</span>
        <span className="text-[#111111] dark:text-[#F5F7FA]">{formatCents(quote.amountTotal)}</span>
      </div>
      {hasDeposit && (
        <>
          <div className="flex justify-between pt-2">
            <span className="text-[#058954] dark:text-[#058954] font-medium">
              Due now (deposit {quote.depositPercent ?? 50}%)
            </span>
            <span className="font-semibold text-[#058954] dark:text-[#058954]">
              {formatCents(quote.amountDeposit!)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6A6A6A] dark:text-[#A1A8B3]">Due after job</span>
            <span className="text-[#111111] dark:text-[#F5F7FA]">
              {formatCents(quote.amountRemaining ?? 0)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

/** Trust & protection — Airbnb-style reassurance */
function TrustBlock() {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-[#6A6A6A] dark:text-[#A1A8B3] uppercase tracking-wider">
        Trust & protection
      </p>
      <ul className="space-y-1.5 text-sm text-[#3A3A3A] dark:text-[#A1A8B3]">
        <li className="flex items-start gap-2">
          <span className="text-[#058954] mt-0.5">✓</span>
          <span>Secure payment via Stripe</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-[#058954] mt-0.5">✓</span>
          <span>Payment held until job completion</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-[#058954] mt-0.5">✓</span>
          <span>Dispute resolution available</span>
        </li>
      </ul>
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
  paymentDueAt,
  children,
  className,
}: BookingSummaryDepositProps) {
  const hasDeposit = (quote.amountDeposit ?? 0) > 0;

  return (
    <div className={cn('space-y-4', className)} data-role="customer">
      {/* Pro summary */}
      <section
        className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-5 shadow-sm"
        aria-labelledby="summary-pro"
      >
        <h2 id="summary-pro" className="sr-only">
          Pro & service
        </h2>
        <ProSummaryBlock
          proName={proName}
          proPhotoUrl={proPhotoUrl}
          serviceName={serviceName}
        />
      </section>

      {/* Service details */}
      <section
        className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-5 shadow-sm"
        aria-labelledby="summary-details"
      >
        <h2 id="summary-details" className="text-sm font-medium text-[#6A6A6A] dark:text-[#A1A8B3] mb-3">
          When & where
        </h2>
        <ServiceDetailsBlock
          serviceDate={serviceDate}
          serviceTime={serviceTime}
          address={address}
          durationHours={durationHours}
        />
      </section>

      {/* Scope summary (optional) */}
      {scopeSummary && scopeSummary.trim() && (
        <section
          className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-5 shadow-sm"
          aria-labelledby="summary-scope"
        >
          <h2 id="summary-scope" className="text-sm font-medium text-[#6A6A6A] dark:text-[#A1A8B3] mb-2">
            Scope
          </h2>
          <p className="text-sm text-[#3A3A3A] dark:text-[#A1A8B3]">{scopeSummary}</p>
        </section>
      )}

      {/* Add-ons (optional) */}
      {addons && addons.length > 0 && (
        <section
          className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-5 shadow-sm"
          aria-labelledby="summary-addons"
        >
          <h2 id="summary-addons" className="text-sm font-medium text-[#6A6A6A] dark:text-[#A1A8B3] mb-2">
            Add-ons
          </h2>
          <ul className="space-y-1 text-sm">
            {addons.map((a, i) => (
              <li key={i} className="flex justify-between">
                <span className="text-[#3A3A3A] dark:text-[#A1A8B3]">{a.title}</span>
                <span className="text-[#111111] dark:text-[#F5F7FA]">
                  {formatCents(a.priceCents)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Pricing breakdown */}
      <section
        className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-5 shadow-sm"
        aria-labelledby="summary-pricing"
      >
        <h2 id="summary-pricing" className="text-sm font-medium text-[#6A6A6A] dark:text-[#A1A8B3] mb-3">
          Price details
        </h2>
        <PricingBreakdownBlock quote={quote} showDeposit={hasDeposit} />
      </section>

      {/* Payment due countdown (optional) */}
      {paymentDueAt && (
        <div
          className="rounded-2xl border border-[#058954]/30 bg-[#058954]/5 dark:bg-[#058954]/10 p-4"
          role="status"
        >
          <p className="text-sm font-medium text-[#058954]">
            Pay within 30 minutes to lock your time
          </p>
          <CountdownTimer paymentDueAt={paymentDueAt} />
        </div>
      )}

      {/* Trust & protection */}
      <section
        className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-5 shadow-sm"
        aria-labelledby="summary-trust"
      >
        <h2 id="summary-trust" className="sr-only">
          Trust & protection
        </h2>
        <TrustBlock />
      </section>

      {/* Payment form / CTA slot */}
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
    <p className="text-sm text-[#058954] mt-1 font-medium">
      Time remaining: {remaining}
    </p>
  );
}

