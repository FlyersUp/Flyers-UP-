'use client';

/**
 * Pro "Job completed" moment — trust + earnings clarity.
 * Shown when Pro marks job complete (awaiting_remaining_payment, awaiting_customer_confirmation).
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
  amountTotal = 0,
  platformFeeCents = 0,
  refundedTotalCents = 0,
  awaitingConfirmation = false,
  className,
}: ProJobCompletedCardProps) {
  const servicePrice = Math.max(0, amountTotal - platformFeeCents); // What pro earns (before refunds)
  const proEarnings = Math.max(0, servicePrice - refundedTotalCents);

  return (
    <div
      className={cn(
        'rounded-2xl border border-[hsl(var(--accent-customer)/0.3)] bg-[hsl(var(--accent-customer)/0.06)] p-5 shadow-[var(--shadow-card)]',
        className
      )}
    >
      <div className="text-center mb-5">
        <span className="text-3xl" aria-hidden>🎉</span>
        <h3 className="text-xl font-semibold text-text mt-2">Job completed</h3>
        <p className="text-sm text-muted mt-1">
          {awaitingConfirmation
            ? "Waiting for customer to confirm. You'll be notified once payment is released."
            : 'Nice work. You\'re ready to get paid.'}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-[hsl(var(--card-neutral))] p-4 space-y-2">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Your earnings</p>
        <PriceRow label="Service price" value={formatCents(servicePrice)} />
        <PriceRow label="You keep" value={formatCents(proEarnings)} emphasize />
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs font-medium text-[hsl(var(--accent-customer))]">
            ✓ You keep 100% of your service price
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-[hsl(var(--card-neutral))] p-4 space-y-2">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Customer paid</p>
        <PriceRow label="Service" value={formatCents(servicePrice)} />
        {platformFeeCents > 0 && (
          <PriceRow label="Flyers Up Protection Fee" value={formatCents(platformFeeCents)} />
        )}
        <div className={cn('pt-2 border-t border-border')}>
          <PriceRow label="Total paid" value={formatCents(amountTotal)} emphasize />
        </div>
      </div>
    </div>
  );
}
