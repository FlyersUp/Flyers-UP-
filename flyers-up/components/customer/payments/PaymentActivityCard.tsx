'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import type { PaymentActivityItem } from '@/lib/customer/payment-activity';

function ServiceGlyph({ name }: { name: string }) {
  const n = name.toLowerCase();
  let glyph = '✨';
  if (n.includes('clean')) glyph = '🧹';
  else if (n.includes('pet') || n.includes('dog') || n.includes('walk')) glyph = '🐕';
  else if (n.includes('lawn') || n.includes('yard')) glyph = '🌿';
  else if (n.includes('photo')) glyph = '📷';
  return (
    <span
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface2 text-lg"
      aria-hidden
    >
      {glyph}
    </span>
  );
}

function statusPill(status: PaymentActivityItem['status'], label: string) {
  const base = 'shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide';
  switch (status) {
    case 'paid':
      return <span className={`${base} bg-[hsl(var(--trust)/0.18)] text-trust`}>{label}</span>;
    case 'pending':
      return <span className={`${base} bg-[hsl(var(--accent-customer)/0.12)] text-[hsl(var(--accent-customer))]`}>{label}</span>;
    case 'failed':
      return <span className={`${base} bg-danger/12 text-danger`}>{label}</span>;
    case 'refunded':
      return <span className={`${base} bg-text3/15 text-text2`}>{label}</span>;
    default:
      return <span className={`${base} bg-surface2 text-text2`}>{label}</span>;
  }
}

type Props = {
  item: PaymentActivityItem;
  href: string;
};

export function PaymentActivityCard({ item, href }: Props) {
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

  return (
    <Link
      href={href}
      className="flex min-w-0 gap-3 rounded-2xl border border-border bg-[hsl(var(--card-neutral))] p-4 shadow-[var(--shadow-card)] transition-colors hover:border-[hsl(var(--accent-customer)/0.35)] hover:bg-surface2/40 active:scale-[0.99]"
    >
      <ServiceGlyph name={item.serviceName} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-text">{item.serviceName}</p>
            <p className="mt-0.5 truncate text-sm text-text2">
              {item.proName} <span className="text-text3">•</span> {dateStr}
            </p>
          </div>
          {statusPill(item.status, item.statusLabel)}
        </div>
        <div className="mt-3 flex items-end justify-between gap-2">
          <div>
            <p className="text-xl font-bold tabular-nums text-text">{item.amountLabel}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-text3">{item.phase}</p>
          </div>
          <Sparkles className="h-4 w-4 shrink-0 text-text3/50" aria-hidden />
        </div>
      </div>
    </Link>
  );
}
