'use client';

import { useMemo, useState } from 'react';
import { AdminPageShell } from '@/components/hybrid/AdminPageShell';
import { AdminKpiCard } from '@/components/hybrid/AdminKpiCard';
import { MatchQueueTable } from '@/components/hybrid/MatchQueueTable';
import type { AdminKpiStat, MatchQueueRow } from '@/lib/hybrid-ui/types';
import { MOCK_MATCH_QUEUE_KPIS } from '@/lib/hybrid-ui/mock-data';
import { cn } from '@/lib/cn';

const FILTER_CHIPS = ['Urgent', 'Today', 'Brooklyn', 'Electrical'] as const;

export interface MatchQueueScreenProps {
  rows: MatchQueueRow[];
  kpis?: AdminKpiStat[];
}

export function MatchQueueScreen({ rows, kpis = MOCK_MATCH_QUEUE_KPIS }: MatchQueueScreenProps) {
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let out = rows;
    if (activeFilters.has('Brooklyn')) out = out.filter((r) => r.borough.toLowerCase() === 'brooklyn');
    if (activeFilters.has('Electrical')) out = out.filter((r) => r.occupation.toLowerCase().includes('electrical'));
    if (activeFilters.has('Urgent')) out = out.filter((r) => r.urgency === 'asap');
    if (activeFilters.has('Today')) out = out.filter((r) => r.urgency === 'today');
    return out;
  }, [rows, activeFilters]);

  const toggle = (label: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  return (
    <AdminPageShell
      title="Match Queue"
      subtitle="Oversee neighborhood demand, prioritize urgency, and move requests from matching to booked with confidence."
      filters={
        <div className="flex flex-wrap gap-2">
          {FILTER_CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggle(c)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                activeFilters.has(c)
                  ? 'border-[hsl(var(--trust))] bg-[hsl(222_44%_96%)] text-[hsl(var(--trust))]'
                  : 'border-border bg-surface text-text-2 hover:bg-surface2'
              )}
            >
              {c}
            </button>
          ))}
          <button
            type="button"
            className="rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-semibold text-text-3 hover:bg-surface2"
          >
            + Add filter
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <AdminKpiCard key={k.id} stat={k} />
        ))}
      </div>
      <MatchQueueTable rows={filtered} />
    </AdminPageShell>
  );
}
