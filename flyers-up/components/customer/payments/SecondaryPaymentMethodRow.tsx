'use client';

import { Building2, CreditCard } from 'lucide-react';
import { displayBrand } from './paymentBrandMeta';

export type SecondaryPm = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
  /** 'card' | 'us_bank_account' when extended */
  type?: string;
};

type Props = {
  method: SecondaryPm;
  onSetDefault: () => void;
  onRemove: () => void;
  loading?: boolean;
};

export function SecondaryPaymentMethodRow({ method, onSetDefault, onRemove, loading }: Props) {
  const isBank = method.type === 'us_bank_account';
  const title = isBank ? 'Bank account' : displayBrand(method.brand);
  const subtitle = isBank ? `Account •••• ${method.last4}` : `•••• ${method.last4}`;

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-[hsl(var(--card-neutral))] p-4 shadow-[var(--shadow-card)]">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface2 text-text2">
        {isBank ? <Building2 className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-text">{title}</span>
          {method.isDefault ? (
            <span className="rounded-full bg-[hsl(var(--trust)/0.15)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-trust">
              Active
            </span>
          ) : (
            <span className="rounded-full bg-surface2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text3">
              Backup
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-sm text-text2">{subtitle}</p>
      </div>
      <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
        {!method.isDefault ? (
          <button
            type="button"
            onClick={onSetDefault}
            disabled={loading}
            className="rounded-lg px-2 py-1.5 text-xs font-semibold text-[hsl(var(--accent-customer))] hover:bg-[hsl(var(--accent-customer)/0.08)] disabled:opacity-50"
          >
            Default
          </button>
        ) : null}
        <button
          type="button"
          onClick={onRemove}
          disabled={loading}
          className="rounded-lg px-2 py-1.5 text-xs font-semibold text-danger hover:bg-danger/10 disabled:opacity-50"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
