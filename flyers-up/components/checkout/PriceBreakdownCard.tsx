'use client';

import { Card } from '@/components/ui/Card';
import { PriceRow } from '@/components/ui/PriceRow';
import { labelDynamicPricingReason } from '@/lib/bookings/dynamic-pricing-reason-labels';

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
        {(quote.serviceFeeCents ?? 0) > 0 && <PriceRow label="Service fee" value={formatCents(quote.serviceFeeCents ?? 0)} />}
        {(quote.convenienceFeeCents ?? 0) > 0 && <PriceRow label="Convenience fee" value={formatCents(quote.convenienceFeeCents ?? 0)} />}
        {(quote.protectionFeeCents ?? 0) > 0 && <PriceRow label="Protection & guarantee" value={formatCents(quote.protectionFeeCents ?? 0)} />}
        {(quote.demandFeeCents ?? 0) > 0 && <PriceRow label="High-demand fee" value={formatCents(quote.demandFeeCents ?? 0)} />}
        {(quote.promoDiscountCents ?? 0) > 0 && <PriceRow label="Discount" value={`-${formatCents(quote.promoDiscountCents ?? 0)}`} />}
        {(quote.feeTotalCents == null && quote.amountPlatformFee > 0) && <PriceRow label="Fees" value={formatCents(quote.amountPlatformFee)} />}
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
        {(quote.dynamicPricingReasons?.length ?? 0) > 0 && (
          <div className="mt-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.04] px-3 py-2">
            <p className="text-xs font-medium text-primary mb-1">What affected your price included above</p>
            <ul className="list-disc pl-4 space-y-0.5 text-xs text-muted">
              {quote.dynamicPricingReasons!.map((code) => (
                <li key={code}>{labelDynamicPricingReason(code)}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}
