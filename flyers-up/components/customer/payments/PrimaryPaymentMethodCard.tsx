'use client';

import { Radio, CheckCircle2 } from 'lucide-react';
import { displayBrand } from './paymentBrandMeta';

export type PrimaryPm = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  cardholderLabel?: string;
};

type Props = {
  method: PrimaryPm;
  onEdit?: () => void;
  onRemove: () => void;
  loading?: boolean;
};

export function PrimaryPaymentMethodCard({
  method,
  onEdit,
  onRemove,
  loading = false,
}: Props) {
  const brandLabel = displayBrand(method.brand);
  const exp =
    method.expMonth && method.expYear
      ? `${String(method.expMonth).padStart(2, '0')}/${String(method.expYear).slice(-2)}`
      : '—';
  const holder = method.cardholderLabel?.trim() || 'Card on file';

  return (
    <div className="space-y-4">
      <div
        className="relative overflow-hidden rounded-[1.35rem] border border-[hsl(var(--accent-customer)/0.22)] bg-gradient-to-br from-white via-[hsl(var(--accent-customer)/0.06)] to-[hsl(var(--trust)/0.08)] p-5 shadow-[0_8px_32px_rgba(45,52,54,0.08)] ring-1 ring-black/[0.04] dark:from-[#1a1d24] dark:via-[#1e2430] dark:to-[#1a1d24] dark:border-white/10"
      >
        <div className="flex items-start justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-text2">Primary method</span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(var(--accent-customer))] text-white shadow-md">
            <Radio className="h-4 w-4" strokeWidth={2} aria-hidden />
          </span>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[hsl(var(--trust))]" aria-hidden />
          <span className="text-lg font-bold text-text">{brandLabel}</span>
        </div>
        <p className="mt-3 font-mono text-xl tracking-widest text-text">
          •••• •••• •••• <span className="font-semibold">{method.last4}</span>
        </p>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-1 text-xs text-text2">
          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-text3">Card holder</span>
            <span className="text-sm font-medium text-text">{holder}</span>
          </div>
          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-text3">Expires</span>
            <span className="text-sm font-medium text-text">{exp}</span>
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-4 right-5 text-[11px] font-bold italic text-[hsl(var(--accent-customer))] opacity-90">
          {method.brand?.toUpperCase() === 'VISA' ? 'VISA' : brandLabel.toUpperCase().slice(0, 8)}
        </div>
      </div>

      <div className={`grid gap-3 ${onEdit ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            disabled={loading}
            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-[hsl(var(--accent-customer)/0.25)] bg-[hsl(var(--accent-customer)/0.08)] text-sm font-semibold text-[hsl(var(--accent-customer))] transition-colors hover:bg-[hsl(var(--accent-customer)/0.14)] disabled:opacity-50"
          >
            Edit details
          </button>
        ) : null}
        <button
          type="button"
          onClick={onRemove}
          disabled={loading}
          className="flex h-12 items-center justify-center gap-2 rounded-xl border border-danger/25 bg-danger/8 text-sm font-semibold text-danger transition-colors hover:bg-danger/12 disabled:opacity-50"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
