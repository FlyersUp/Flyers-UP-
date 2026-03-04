'use client';

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
    <div
      className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
      style={{ backgroundColor: '#FFFFFF' }}
    >
      <h3 className="text-sm font-medium text-[#6A6A6A] mb-3">Price details</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-[#3A3A3A]">Service</span>
          <span className="text-[#111111]">{formatCents(baseAmount)}</span>
        </div>
        {quote.amountTravelFee > 0 && (
          <div className="flex justify-between">
            <span className="text-[#3A3A3A]">Travel fee</span>
            <span className="text-[#111111]">{formatCents(quote.amountTravelFee)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-[#3A3A3A]">Subtotal</span>
          <span className="text-[#111111]">{formatCents(quote.amountSubtotal)}</span>
        </div>
        {quote.amountPlatformFee > 0 && (
          <div className="flex justify-between">
            <span className="text-[#3A3A3A]">Platform fee</span>
            <span className="text-[#111111]">{formatCents(quote.amountPlatformFee)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-black/5 pt-3 mt-3 font-semibold">
          <span className="text-[#111111]">Total</span>
          <span className="text-[#111111]">{formatCents(quote.amountTotal)}</span>
        </div>
        {hasDeposit && (
          <>
            <div className="flex justify-between pt-2">
              <span className="text-[#3A3A3A]">Deposit ({quote.depositPercent ?? 50}%)</span>
              <span className="text-[#111111]">{formatCents(quote.amountDeposit!)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#3A3A3A]">Remaining (due after job)</span>
              <span className="text-[#111111]">{formatCents(quote.amountRemaining ?? 0)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
