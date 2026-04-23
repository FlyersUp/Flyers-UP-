'use client';

import { BadgeCheck, Headphones, Wallet } from 'lucide-react';
import type { TrustStripItem } from '@/lib/hybrid-ui/types';
import { cn } from '@/lib/cn';

const icons = {
  check: BadgeCheck,
  wallet: Wallet,
  headset: Headphones,
};

export interface TrustBadgeRowProps {
  items: TrustStripItem[];
  className?: string;
}

export function TrustBadgeRow({ items, className }: TrustBadgeRowProps) {
  return (
    <ul className={cn('space-y-4 px-4', className)}>
      {items.map((row) => {
        const Icon = icons[row.icon];
        return (
          <li key={row.id} className="flex gap-3 rounded-2xl border border-border/80 bg-surface/90 px-3 py-3 shadow-[var(--shadow-sm)]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
              <Icon className="h-5 w-5" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text">{row.title}</p>
              <p className="mt-0.5 text-xs leading-snug text-text-3">{row.description}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
