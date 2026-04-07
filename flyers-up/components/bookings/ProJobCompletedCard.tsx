'use client';

/**
 * Pro "Job completed" moment — trust + earnings clarity (pro-safe: no customer fee stack).
 */

import { PriceRow } from '@/components/ui/PriceRow';
import { cn } from '@/lib/cn';

function formatCents(cents: number | null | undefined): string {
  if (cents == null || Number.isNaN(cents)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export interface ProJobCompletedCardProps {
  amountTotal?: number | null;
  platformFeeCents?: number | null;
  refundedTotalCents?: number | null;
  awaitingConfirmation?: boolean;
  className?: string;
}

export function ProJobCompletedCard({
  amountTotal,
  platformFeeCents,
  refundedTotalCents,
  awaitingConfirmation = false,
  className,
}: ProJobCompletedCardProps) {
  const total = amountTotal ?? 0;
  const fee = platformFeeCents ?? 0;
  const refunded = refundedTotalCents ?? 0;
  const yourRate = Math.max(0, total - fee);
  const netPayout = Math.max(0, yourRate - refunded);

  return (
    <div
      className={cn(
        'rounded-2xl border border-[hsl(var(--accent-customer)/0.3)] bg-[hsl(var(--accent-customer)/0.06)] p-5 shadow-[var(--shadow-card)]',
        className
      )}
    >
      <div className="text-center mb-5">
        <span className="text-3xl" aria-hidden>
          🎉
        </span>
        <h3 className="text-xl font-semibold text-text mt-2">Job completed</h3>
        <p className="text-sm text-muted mt-1">
          {awaitingConfirmation
            ? "Waiting for customer to confirm. You'll be notified once payment is released."
            : "Nice work. You're ready to get paid."}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-[hsl(var(--card-neutral))] p-4 space-y-2">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Your earnings</p>
        <PriceRow label="Your rate" value={formatCents(yourRate)} />
        {refunded > 0 ? <PriceRow label="Refunds (adjusted)" value={`−${formatCents(refunded)}`} /> : null}
        <PriceRow label="Net payout (est.)" value={formatCents(netPayout)} emphasize />
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs font-medium text-[hsl(var(--accent-customer))]">
            ✓ Marketplace fees are paid by the customer — not taken from your rate.
          </p>
        </div>
      </div>
    </div>
  );
}
