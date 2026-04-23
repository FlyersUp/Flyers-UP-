'use client';

import { Pencil, Settings2 } from 'lucide-react';
import type { BoroughHealthRow, SupplyState } from '@/lib/hybrid-ui/types';
import { cn } from '@/lib/cn';

export interface BoroughHealthMatrixProps {
  rows: BoroughHealthRow[];
  className?: string;
}

function statePill(state: SupplyState): string {
  if (state === 'strong') return 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100';
  if (state === 'weak') return 'bg-amber-50 text-amber-900 ring-1 ring-amber-100';
  return 'bg-surface2 text-text-3 ring-1 ring-border';
}

export function BoroughHealthMatrix({ rows, className }: BoroughHealthMatrixProps) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-sm)]', className)}>
      <div className="border-b border-border bg-surface2/60 px-4 py-3">
        <h2 className="text-sm font-bold text-[hsl(var(--trust))]">Occupation vitality matrix</h2>
        <p className="text-xs text-text-3">Supply vs. visibility — connect to `category_borough_status` for live data.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[900px] w-full text-left text-sm">
          <thead className="border-b border-border text-xs font-semibold uppercase tracking-wide text-text-3">
            <tr>
              <th className="px-4 py-3">Occupation</th>
              <th className="px-4 py-3">Active pros</th>
              <th className="px-4 py-3">Visibility</th>
              <th className="px-4 py-3">Avg response</th>
              <th className="px-4 py-3">Weak signals</th>
              <th className="px-4 py-3">Ops note</th>
              <th className="px-4 py-3 text-center">Force V</th>
              <th className="px-4 py-3 text-center">Force H</th>
              <th className="px-4 py-3 w-20" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/70 last:border-0 hover:bg-surface2/30">
                <td className="px-4 py-3 font-medium text-text">{r.occupation}</td>
                <td className="px-4 py-3 tabular-nums text-text-2">{r.activePros}</td>
                <td className="px-4 py-3">
                  <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase', statePill(r.state))}>
                    {r.state}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-2">{r.responseReliability}</td>
                <td className="px-4 py-3 text-xs text-text-3">{r.weakSignals}</td>
                <td className="max-w-[200px] px-4 py-3 text-xs text-text-3 truncate" title={r.opsNote}>
                  {r.opsNote ?? '—'}
                </td>
                <td className="px-4 py-3 text-center text-xs">{r.forceVisible ? '✓' : '—'}</td>
                <td className="px-4 py-3 text-center text-xs">{r.forceHidden ? '✓' : '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button type="button" className="rounded-lg p-2 text-text-3 hover:bg-surface2 hover:text-text" aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" className="rounded-lg p-2 text-text-3 hover:bg-surface2 hover:text-text" aria-label="Settings">
                      <Settings2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
