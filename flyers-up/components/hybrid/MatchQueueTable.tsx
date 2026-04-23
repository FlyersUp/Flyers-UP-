'use client';

import Link from 'next/link';
import type { MatchQueueRow } from '@/lib/hybrid-ui/types';
import { cn } from '@/lib/cn';

export interface MatchQueueTableProps {
  rows: MatchQueueRow[];
  className?: string;
}

function urgencyClass(u: MatchQueueRow['urgency']): string {
  if (u === 'asap') return 'text-red-700 bg-red-50 ring-1 ring-red-100';
  if (u === 'today') return 'text-amber-900 bg-amber-50 ring-1 ring-amber-100';
  return 'text-text-2 bg-surface2 ring-1 ring-border';
}

function statusClass(s: string): string {
  if (s === 'offer_sent') return 'bg-[hsl(222_44%_96%)] text-[hsl(var(--trust))] ring-1 ring-[hsl(var(--trust))]/15';
  if (s === 'pending_review' || s === 'candidate_selected') return 'bg-amber-50 text-amber-900 ring-1 ring-amber-100';
  return 'bg-surface2 text-text-2 ring-1 ring-border';
}

export function MatchQueueTable({ rows, className }: MatchQueueTableProps) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-sm)]', className)}>
      <div className="overflow-x-auto">
        <table className="min-w-[720px] w-full text-left text-sm">
          <thead className="border-b border-border bg-surface2/80 text-xs font-semibold uppercase tracking-wide text-text-3">
            <tr>
              <th className="px-4 py-3">Request</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Occupation</th>
              <th className="px-4 py-3">Borough</th>
              <th className="px-4 py-3">Urgency</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/80 last:border-0 hover:bg-surface2/40">
                <td className="px-4 py-3 font-mono text-xs font-semibold text-[hsl(var(--trust))]">{r.displayId}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 shrink-0 rounded-full bg-[hsl(var(--trust))]/15" aria-hidden />
                    <span className="font-medium text-text">{r.customerName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-text-2">{r.occupation}</td>
                <td className="px-4 py-3 text-text-2">{r.borough}</td>
                <td className="px-4 py-3">
                  <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', urgencyClass(r.urgency))}>
                    {r.urgencyLabel}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', statusClass(r.status))}>
                    {r.statusLabel}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-text-3 whitespace-nowrap">
                  {new Date(r.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/hybrid/match-queue/${r.id}`}
                    className="inline-flex min-h-9 items-center justify-center rounded-xl border-2 border-trust/35 bg-bg px-3.5 py-2 text-xs font-semibold text-trust hover:bg-surface2"
                  >
                    Review
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 ? <p className="p-6 text-center text-sm text-text-3">No requests in queue.</p> : null}
    </div>
  );
}
