'use client';

import Link from 'next/link';
import type { RefundRow } from '@/lib/customer/payment-activity';

function pill(s: RefundRow['status'], label: string) {
  const base = 'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide';
  switch (s) {
    case 'processed':
    case 'approved':
      return <span className={`${base} bg-[hsl(var(--trust)/0.18)] text-trust`}>{label}</span>;
    case 'requested':
    case 'under_review':
      return <span className={`${base} bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100`}>{label}</span>;
    case 'denied':
      return <span className={`${base} bg-danger/12 text-danger`}>{label}</span>;
    default:
      return <span className={`${base} bg-surface2 text-text2`}>{label}</span>;
  }
}

type Props = {
  row: RefundRow;
};

export function RefundStatusCard({ row }: Props) {
  const dateStr = (() => {
    try {
      return new Date(row.serviceDate + 'T12:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return row.serviceDate;
    }
  })();

  const orig =
    row.originalCents > 0
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(row.originalCents / 100)
      : '—';
  const ref =
    row.refundedCents > 0
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(row.refundedCents / 100)
      : '—';

  return (
    <div className="rounded-2xl border border-border bg-[hsl(var(--card-neutral))] p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-text">{row.serviceName}</p>
          <p className="text-sm text-text2">
            {row.proName} · {dateStr}
          </p>
        </div>
        {pill(row.status, row.statusLabel)}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-text3">Original</p>
          <p className="font-semibold tabular-nums text-text">{orig}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-text3">Refunded</p>
          <p className="font-semibold tabular-nums text-text">{ref}</p>
        </div>
      </div>
      {row.reason ? <p className="mt-3 text-xs text-text2">Reason: {row.reason}</p> : null}
      <Link
        href={`/customer/bookings/${row.bookingId}`}
        className="mt-3 inline-block text-sm font-semibold text-[hsl(var(--accent-customer))] hover:underline"
      >
        View booking
      </Link>
    </div>
  );
}
