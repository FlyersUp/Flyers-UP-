'use client';

export interface PaymentMethodCardProps {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
  onSetDefault: () => void;
  onRemove: () => void;
  loading?: boolean;
}

const BRAND_LABELS: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  discover: 'Discover',
  diners: 'Diners Club',
  jcb: 'JCB',
  unionpay: 'UnionPay',
};

export function PaymentMethodCard({
  brand,
  last4,
  expMonth,
  expYear,
  isDefault,
  onSetDefault,
  onRemove,
  loading = false,
}: PaymentMethodCardProps) {
  const brandLabel = BRAND_LABELS[brand?.toLowerCase()] ?? (brand || 'Card');
  const expStr = expMonth && expYear ? `${String(expMonth).padStart(2, '0')}/${expYear}` : '';

  return (
    <div
      className="flex items-center justify-between gap-4 p-5 rounded-2xl border border-black/10"
      style={{ backgroundColor: '#F2F2F0' }}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-text">{brandLabel} •••• {last4}</span>
          {isDefault && (
            <span
              className="text-xs px-2 py-1 rounded-full font-medium"
              style={{ backgroundColor: 'rgba(178,251,165,0.6)', color: 'black' }}
            >
              Default
            </span>
          )}
        </div>
        {expStr && <div className="text-sm text-muted mt-0.5">Expires {expStr}</div>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!isDefault && (
          <button
            type="button"
            onClick={onSetDefault}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium rounded-full border border-black/15 hover:bg-black/5 transition-colors disabled:opacity-60"
          >
            Set default
          </button>
        )}
        <button
          type="button"
          onClick={onRemove}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium rounded-full border border-black/15 hover:bg-black/5 text-muted hover:text-text transition-colors disabled:opacity-60"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
