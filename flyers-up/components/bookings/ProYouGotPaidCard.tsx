'use client';

/**
 * Pro "You got paid" celebration — subtle, not childish.
 * Shown when payout succeeds.
 */

import Link from 'next/link';
import { DollarSign, Search, TrendingUp, Share2 } from 'lucide-react';
import { cn } from '@/lib/cn';

function formatCents(cents: number | null | undefined): string {
  if (cents == null || Number.isNaN(cents)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export interface ProYouGotPaidCardProps {
  amountCents: number;
  className?: string;
}

export function ProYouGotPaidCard({ amountCents, className }: ProYouGotPaidCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border-2 border-[hsl(var(--accent-customer)/0.4)] bg-[hsl(var(--accent-customer)/0.08)] p-6 shadow-[var(--shadow-card)] text-center',
        className
      )}
    >
      <div
        className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[hsl(var(--accent-customer)/0.2)] mb-4"
        aria-hidden
      >
        <DollarSign className="w-7 h-7 text-[hsl(var(--accent-customer))]" strokeWidth={2} />
      </div>
      <h3 className="text-2xl font-semibold text-text">You got paid 💸</h3>
      <p className="text-3xl font-bold text-text mt-1">{formatCents(amountCents)}</p>
      <p className="text-sm text-muted mt-1">Sent to your bank account</p>
      <p className="text-xs text-muted mt-3">Nice work. Keep it going.</p>

      <div className="mt-6 pt-5 border-t border-border space-y-2">
        <p className="text-xs font-medium text-muted mb-3">Pros who stay active get booked more</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link
            href="/pro/jobs"
            className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--accent-pro)/0.6)] bg-[hsl(var(--accent-pro))] px-4 py-2 text-sm font-semibold text-[hsl(var(--accent-contrast))] hover:brightness-95 transition-all"
          >
            <Search className="w-4 h-4" />
            Find more jobs
          </Link>
          <Link
            href="/pro/profile"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-text hover:bg-hover transition-all"
          >
            <TrendingUp className="w-4 h-4" />
            Boost your profile
          </Link>
          <button
            type="button"
            onClick={() => navigator.share?.({ title: 'Flyers Up', text: 'I just got paid through Flyers Up!' })}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-text hover:bg-hover transition-all"
          >
            <Share2 className="w-4 h-4" />
            Share your work
          </button>
        </div>
      </div>
    </div>
  );
}
