'use client';

import Link from 'next/link';
import { FileText, Mail, Download } from 'lucide-react';

export type ReceiptListItem = {
  bookingId: string;
  serviceName: string;
  proName: string;
  serviceDate: string;
  amountLabel: string;
  reference: string | null;
};

type Props = {
  item: ReceiptListItem;
};

export function ReceiptCard({ item }: Props) {
  const dateStr = (() => {
    try {
      return new Date(item.serviceDate + 'T12:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return item.serviceDate;
    }
  })();

  const jsonHref = `/api/customer/bookings/${item.bookingId}/receipt`;
  const htmlHref = `${jsonHref}?format=html`;

  return (
    <div className="rounded-2xl border border-border bg-[hsl(var(--card-neutral))] p-4 shadow-[var(--shadow-card)]">
      <div className="flex gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--accent-customer)/0.1)] text-[hsl(var(--accent-customer))]">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-text">{item.serviceName}</p>
          <p className="text-sm text-text2">
            {item.proName} · {dateStr}
          </p>
          <p className="mt-2 text-lg font-bold tabular-nums text-text">{item.amountLabel}</p>
          {item.reference ? (
            <p className="mt-1 font-mono text-xs text-text3">Ref {item.reference}</p>
          ) : (
            <p className="mt-1 text-xs text-text3">Booking {item.bookingId.slice(0, 8)}…</p>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
        <Link
          href={htmlHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-1 min-w-[7rem] items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-text hover:bg-surface2 sm:flex-none"
        >
          <FileText className="h-4 w-4" />
          View receipt
        </Link>
        <a
          href={htmlHref}
          download
          className="inline-flex flex-1 min-w-[7rem] items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-text hover:bg-surface2 sm:flex-none"
        >
          <Download className="h-4 w-4" />
          Download
        </a>
        <Link
          href="/customer/settings/help-support"
          className="inline-flex flex-1 min-w-[7rem] items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-text hover:bg-surface2 sm:flex-none"
        >
          <Mail className="h-4 w-4" />
          Email help
        </Link>
      </div>
    </div>
  );
}
