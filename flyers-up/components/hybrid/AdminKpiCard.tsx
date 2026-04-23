'use client';

import type { AdminKpiStat } from '@/lib/hybrid-ui/types';
import { cn } from '@/lib/cn';

export interface AdminKpiCardProps {
  stat: AdminKpiStat;
  className?: string;
}

export function AdminKpiCard({ stat, className }: AdminKpiCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-sm)]',
        className
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-text-3">{stat.label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-[hsl(var(--trust))]">{stat.value}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {stat.trendLabel ? (
          <span
            className={cn(
              'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
              stat.trend === 'up' && 'bg-[hsl(222_44%_94%)] text-[hsl(var(--trust))]',
              stat.trend === 'down' && 'bg-red-50 text-red-700',
              !stat.trend && 'bg-surface2 text-text-3'
            )}
          >
            {stat.trendLabel}
          </span>
        ) : null}
        {stat.hint ? <span className="text-xs text-emerald-700">{stat.hint}</span> : null}
      </div>
    </div>
  );
}
