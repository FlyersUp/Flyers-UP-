'use client';

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

/**
 * Sticky bottom bar with Confirm & Pay button.
 */
export function StickyPayBar({
  amountTotal,
  currency,
  disabled,
  loading,
  onSubmit,
  label = 'Confirm & Pay',
}: {
  amountTotal: number;
  currency: string;
  disabled: boolean;
  loading: boolean;
  onSubmit: () => void;
  label?: string;
}) {
  const displayAmount = currency === 'usd' ? formatCents(amountTotal) : `${(amountTotal / 100).toFixed(2)} ${currency.toUpperCase()}`;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-black/5 bg-white/95 backdrop-blur-sm p-4 pb-[env(safe-area-inset-bottom)]"
      style={{ backgroundColor: 'rgba(255,255,255,0.95)' }}
    >
      <div className="max-w-lg mx-auto">
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || loading}
          className="w-full h-12 rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95 disabled:opacity-60 transition-all flex items-center justify-center"
        >
          {loading ? 'Processing…' : `${label} ${displayAmount}`}
        </button>
        <p className="text-xs text-[#6A6A6A] text-center mt-2">
          Payment held until job completion
        </p>
      </div>
    </div>
  );
}
