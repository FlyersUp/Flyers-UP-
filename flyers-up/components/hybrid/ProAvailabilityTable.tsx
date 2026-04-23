'use client';

import { BadgeCheck } from 'lucide-react';
import { Switch } from '@/components/ui/Switch';
import type { ProAvailabilityRow } from '@/lib/hybrid-ui/types';
import { cn } from '@/lib/cn';

export interface ProAvailabilityTableProps {
  rows: ProAvailabilityRow[];
  onToggleActiveWeek?: (id: string, value: boolean) => void;
  onTogglePaused?: (id: string, value: boolean) => void;
  className?: string;
}

export function ProAvailabilityTable({
  rows,
  onToggleActiveWeek,
  onTogglePaused,
  className,
}: ProAvailabilityTableProps) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-sm)]', className)}>
      <div className="overflow-x-auto">
        <table className="min-w-[960px] w-full text-left text-sm">
          <thead className="border-b border-border bg-surface2/80 text-xs font-semibold uppercase tracking-wide text-text-3">
            <tr>
              <th className="px-4 py-3">Pro</th>
              <th className="px-4 py-3">Occupation</th>
              <th className="px-4 py-3">Neighborhoods</th>
              <th className="px-4 py-3">Borough</th>
              <th className="px-4 py-3">Verified</th>
              <th className="px-4 py-3">Activity</th>
              <th className="px-4 py-3 text-center">Active week</th>
              <th className="px-4 py-3 text-center">Paused</th>
              <th className="px-4 py-3 text-center">Matchable</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/70 last:border-0 hover:bg-surface2/25">
                <td className="px-4 py-3">
                  <div className="font-semibold text-text">{r.name}</div>
                  <div className="text-xs text-text-3">{r.email}</div>
                </td>
                <td className="px-4 py-3 text-text-2">{r.occupation}</td>
                <td className="max-w-[180px] px-4 py-3 text-xs text-text-3">{r.neighborhoods}</td>
                <td className="px-4 py-3 text-text-2">{r.borough}</td>
                <td className="px-4 py-3">
                  {r.verified ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                      <BadgeCheck className="h-4 w-4" />
                      Verified
                    </span>
                  ) : (
                    <span className="text-xs text-text-3">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'text-xs font-medium',
                      r.activityTone === 'good' && 'text-emerald-700',
                      r.activityTone === 'warn' && 'text-amber-800',
                      r.activityTone === 'muted' && 'text-text-3'
                    )}
                  >
                    {r.activityLabel}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <Switch
                    checked={r.activeThisWeek}
                    onCheckedChange={(v) => onToggleActiveWeek?.(r.id, v)}
                    aria-label={`Active this week ${r.name}`}
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <Switch checked={r.paused} onCheckedChange={(v) => onTogglePaused?.(r.id, v)} aria-label={`Paused ${r.name}`} />
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={cn(
                      'text-xs font-bold',
                      r.matchable ? 'text-emerald-700' : 'text-text-3'
                    )}
                  >
                    {r.matchable ? 'Yes' : 'No'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
