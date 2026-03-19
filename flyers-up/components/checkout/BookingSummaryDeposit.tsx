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
import { Card } from '@/components/ui/Card';
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
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-card">
        {proPhotoUrl ? (
          <img src={proPhotoUrl} alt={proName} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            —
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-primary">{proName}</p>
        <p className="text-sm text-muted">{serviceName}</p>
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
      <p className="text-muted">
        {formatDateTime(serviceDate, serviceTime)}
      </p>
      {durationHours != null && durationHours > 0 && (
        <p className="text-muted">
          {durationHours} hr{durationHours !== 1 ? 's' : ''}
        </p>
      )}
      {address && address.trim() && (
        <p className="text-muted">{address}</p>
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
    <div className="space-y-2">
      <PriceRow label="Service" value={formatCents(baseAmount)} />
      {(quote.amountTravelFee ?? 0) > 0 && (
        <PriceRow label="Travel fee" value={formatCents(quote.amountTravelFee!)} />
      )}
      {(quote.amountPlatformFee ?? 0) > 0 && (
        <>
          <PriceRow
            label="Flyers Up Protection & Service Fee"
            value={formatCents(quote.amountPlatformFee!)}
            subtext="Secure payments, booking protection, and support"
          />
          <p className="text-xs text-muted">
            This fee helps keep Flyers Up safe and reliable. It covers secure payments, fraud protection, customer
            support, and tools that help ensure your job gets done right.
          </p>
        </>
      )}
      <PriceRow className="mt-3 border-t border-border pt-3" label="Total" value={formatCents(quote.amountTotal)} emphasize />
      <p className="text-xs font-medium text-primary">✔ Covered by Flyers Up Protection</p>
      {hasDeposit && (
        <>
          <PriceRow label={`Due now (deposit ${quote.depositPercent ?? 50}%)`} value={formatCents(quote.amountDeposit!)} emphasize />
          <PriceRow label="Due after job" value={formatCents(quote.amountRemaining ?? 0)} />
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
      <ul className="space-y-1.5 text-sm text-muted">
        <li className="flex items-start gap-2">
          <span className="mt-0.5 text-[hsl(var(--success))]">✓</span>
          <span>Secure payment via Stripe</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 text-[hsl(var(--success))]">✓</span>
          <span>Payment held until job completion</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 text-[hsl(var(--success))]">✓</span>
          <span>Dispute resolution available</span>
        </li>
      </ul>
      <p className="text-xs text-muted">Safe, reliable, and built for your neighborhood</p>
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
      <Card as="section" className="shadow-[var(--shadow-md)]" padding="lg" aria-labelledby="summary-pro">
        <h2 id="summary-pro" className="sr-only">
          Pro & service
        </h2>
        <ProSummaryBlock
          proName={proName}
          proPhotoUrl={proPhotoUrl}
          serviceName={serviceName}
        />
      </Card>

      {/* Service details */}
      <Card as="section" className="shadow-[var(--shadow-md)]" padding="lg" aria-labelledby="summary-details">
        <h2 id="summary-details" className="mb-3 text-sm font-medium text-muted">
          When & where
        </h2>
        <ServiceDetailsBlock
          serviceDate={serviceDate}
          serviceTime={serviceTime}
          address={address}
          durationHours={durationHours}
        />
      </Card>

      {/* Scope summary (optional) */}
      {scopeSummary && scopeSummary.trim() && (
        <Card as="section" className="shadow-[var(--shadow-md)]" padding="lg" aria-labelledby="summary-scope">
          <h2 id="summary-scope" className="mb-2 text-sm font-medium text-muted">
            Scope
          </h2>
          <p className="text-sm text-muted">{scopeSummary}</p>
        </Card>
      )}

      {/* Add-ons (optional) */}
      {addons && addons.length > 0 && (
        <Card as="section" className="shadow-[var(--shadow-md)]" padding="lg" aria-labelledby="summary-addons">
          <h2 id="summary-addons" className="mb-2 text-sm font-medium text-muted">
            Add-ons
          </h2>
          <ul className="space-y-1 text-sm">
            {addons.map((a, i) => (
              <li key={i} className="flex justify-between">
                <span className="text-muted">{a.title}</span>
                <span className="text-primary">
                  {formatCents(a.priceCents)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Pricing breakdown */}
      <Card as="section" className="shadow-[var(--shadow-md)]" padding="lg" aria-labelledby="summary-pricing">
        <h2 id="summary-pricing" className="mb-3 text-sm font-medium text-muted">
          Price details
        </h2>
        <PricingBreakdownBlock quote={quote} showDeposit={hasDeposit} />
      </Card>

      {/* Payment due countdown (optional) */}
      {paymentDueAt && (
        <div
          className="rounded-2xl border border-[hsl(var(--success)/0.35)] bg-[hsl(var(--success)/0.12)] p-4"
          role="status"
        >
          <p className="text-sm font-medium text-primary">
            Pay within 30 minutes to lock your time
          </p>
          <CountdownTimer paymentDueAt={paymentDueAt} />
        </div>
      )}

      {/* Trust & protection */}
      <Card as="section" className="shadow-[var(--shadow-md)]" padding="lg" aria-labelledby="summary-trust">
        <h2 id="summary-trust" className="sr-only">
          Trust & protection
        </h2>
        <TrustBlock />
      </Card>

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
    <p className="mt-1 text-sm font-medium text-primary">
      Time remaining: {remaining}
    </p>
  );
}

