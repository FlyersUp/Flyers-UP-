'use client';

import { Card } from '@/components/ui/Card';
import { PriceRow } from '@/components/ui/PriceRow';

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

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

/**
 * Price breakdown card for checkout.
 */
export function PriceBreakdownCard({ quote, showDeposit = true }: { quote: QuoteBreakdown; showDeposit?: boolean }) {
  const baseAmount = quote.amountSubtotal - quote.amountTravelFee;
  const hasDeposit = showDeposit && quote.amountDeposit != null && quote.amountDeposit > 0;

  return (
    <Card className="shadow-[var(--shadow-md)]" padding="lg">
      <h3 className="mb-3 text-sm font-semibold text-primary">Checkout summary</h3>
      <div className="space-y-2">
        <PriceRow label="Service" value={formatCents(baseAmount)} />
        {quote.amountTravelFee > 0 && (
          <PriceRow label="Travel fee" value={formatCents(quote.amountTravelFee)} />
        )}
        {quote.amountPlatformFee > 0 && (
          <>
            <PriceRow
              label="Flyers Up Protection & Service Fee"
              value={formatCents(quote.amountPlatformFee)}
              subtext="Secure payments, booking protection, and support"
            />
            <p className="text-xs text-muted">
              This fee helps keep Flyers Up safe and reliable. It covers secure payments, fraud protection, customer
              support, and tools that help ensure your job gets done right.
            </p>
          </>
        )}
        <PriceRow
          className="mt-3 border-t border-border pt-3"
          label="Total"
          value={formatCents(quote.amountTotal)}
          emphasize
        />
        <p className="text-xs font-medium text-primary">✔ Covered by Flyers Up Protection</p>
        {hasDeposit && (
          <>
            <PriceRow
              label={`Due now (deposit ${quote.depositPercent ?? 50}%)`}
              value={formatCents(quote.amountDeposit!)}
              emphasize
            />
            <PriceRow label="Due after job" value={formatCents(quote.amountRemaining ?? 0)} />
          </>
        )}
      </div>
    </Card>
  );
}
