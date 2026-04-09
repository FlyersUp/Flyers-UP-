'use client';

import { BarChart3 } from 'lucide-react';

type Props = {
  monthLabel: string;
  totalLabel: string;
  onDownloadCsv?: () => void;
};

export function SpendingInsightCard({ monthLabel, totalLabel, onDownloadCsv }: Props) {
  return (
    <section className="relative overflow-hidden rounded-[1.35rem] bg-[hsl(var(--accent-customer))] p-5 text-white shadow-lg ring-1 ring-black/5">
      <BarChart3 className="absolute right-4 top-4 h-8 w-8 opacity-25" aria-hidden />
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">Spending insights</p>
      <h2 className="mt-2 text-lg font-bold leading-tight">Total {monthLabel} spends</h2>
      <p className="mt-3 text-3xl font-bold tabular-nums tracking-tight">{totalLabel}</p>
      {onDownloadCsv ? (
        <button
          type="button"
          onClick={onDownloadCsv}
          className="mt-4 inline-flex h-10 items-center rounded-full bg-white/20 px-4 text-sm font-semibold backdrop-blur-sm transition-colors hover:bg-white/30"
        >
          Download CSV
        </button>
      ) : (
        <p className="mt-3 text-xs text-white/75">Export coming soon — your totals update as jobs complete.</p>
      )}
    </section>
  );
}
