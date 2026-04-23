'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { AdminPageShell } from '@/components/hybrid/AdminPageShell';
import { CandidateProCard } from '@/components/hybrid/CandidateProCard';
import type { CandidatePro, OutreachLogEntry } from '@/lib/hybrid-ui/types';
import { cn } from '@/lib/cn';

export interface MatchRequestDetailScreenProps {
  matchRequestId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  occupationSlug: string;
  boroughSlug: string;
  urgency: string;
  preferredTime: string | null;
  notes: string | null;
  status: string;
  budgetLabel?: string | null;
  candidates: CandidatePro[];
  outreach: OutreachLogEntry[];
  outreachAttemptCount: number;
  outreachCap: number;
}

function outreachBadgeClass(statusKey?: string): string {
  const s = (statusKey ?? '').toLowerCase();
  if (s === 'accepted') return 'bg-emerald-50 text-emerald-900 ring-emerald-100';
  if (s === 'declined' || s === 'no_response') return 'bg-amber-50 text-amber-950 ring-amber-100';
  if (s === 'push_sent' || s === 'sms_sent' || s === 'viewed' || s === 'not_contacted') {
    return 'bg-[hsl(222_44%_96%)] text-[hsl(var(--trust))] ring-[hsl(var(--trust))]/15';
  }
  return 'bg-surface2 text-text-2 ring-border';
}

export function MatchRequestDetailScreen({
  matchRequestId,
  customerName,
  customerEmail,
  customerPhone,
  occupationSlug,
  boroughSlug,
  urgency,
  preferredTime,
  notes,
  status,
  budgetLabel,
  candidates,
  outreach,
  outreachAttemptCount,
  outreachCap,
}: MatchRequestDetailScreenProps) {
  const router = useRouter();
  const [nextBusy, setNextBusy] = useState(false);

  return (
    <AdminPageShell
      title="Match Request Detail"
      subtitle="Review the request, rank candidates, and log outreach — booking links when a pro accepts."
      filters={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" size="sm" showArrow={false} type="button" disabled>
            On hold
          </Button>
          <Button variant="destructive" size="sm" showArrow={false} type="button" disabled>
            Cancel request
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <section className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-sm)]">
            <h2 className="text-xs font-bold uppercase tracking-wide text-text-3">Customer</h2>
            <p className="mt-2 text-lg font-bold text-text">{customerName}</p>
            <p className="text-sm text-text-3">Borough context · {boroughSlug}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-[hsl(222_44%_96%)] px-2.5 py-1 text-[11px] font-semibold text-[hsl(var(--trust))] ring-1 ring-[hsl(var(--trust))]/15">
                {occupationSlug}
              </span>
              <span className="rounded-full bg-surface2 px-2.5 py-1 text-[11px] font-semibold text-text-2 ring-1 ring-border">
                {boroughSlug}
              </span>
            </div>
            <p className="mt-1 text-xs text-text-3">{customerEmail}</p>
            {customerPhone ? <p className="text-xs text-text-3">{customerPhone}</p> : null}
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-sm)]">
            <h2 className="text-xs font-bold uppercase tracking-wide text-text-3">Request notes</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text-2">{notes ?? '—'}</p>
            <dl className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase text-text-3">Urgency</dt>
                <dd className="font-medium text-text">{urgency}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-text-3">Preferred time</dt>
                <dd className="font-medium text-text">{preferredTime ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-text-3">Budget</dt>
                <dd className="font-medium text-text">{budgetLabel ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-text-3">Status</dt>
                <dd className="font-medium text-text">{status}</dd>
              </div>
            </dl>
            <p className="mt-3 font-mono text-[10px] text-text-3">ID {matchRequestId}</p>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-sm)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wide text-text-3">Outreach activity</h2>
              <span className="text-[11px] font-semibold text-text-2">
                Attempts {outreachAttemptCount}/{outreachCap}
              </span>
            </div>
            <ul className="mt-3 space-y-3">
              {outreach.map((e) => (
                <li key={e.id} className="flex gap-3 text-sm">
                  <span
                    className={cn(
                      'mt-1 h-2 w-2 shrink-0 rounded-full',
                      e.tone === 'success' && 'bg-emerald-500',
                      e.tone === 'warning' && 'bg-amber-500',
                      e.tone === 'info' && 'bg-[hsl(var(--trust))]'
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs text-text-3">{new Date(e.at).toLocaleString()}</p>
                      {e.statusKey ? (
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1',
                            outreachBadgeClass(e.statusKey)
                          )}
                        >
                          {e.statusKey.replace(/_/g, ' ')}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-text-2">{e.message}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-[hsl(var(--trust))]">Ranked candidate pros</h2>
            <Button
              variant="trust"
              size="sm"
              showArrow={false}
              type="button"
              disabled={nextBusy}
              onClick={() => {
                setNextBusy(true);
                void fetch(`/api/admin/hybrid/match-requests/${encodeURIComponent(matchRequestId)}/next-outreach`, {
                  method: 'POST',
                })
                  .then(async (res) => {
                    if (!res.ok) {
                      const j = (await res.json().catch(() => ({}))) as { error?: string };
                      window.alert(j.error ?? 'Could not queue next outreach');
                      return;
                    }
                    router.refresh();
                  })
                  .finally(() => setNextBusy(false));
              }}
            >
              Next best candidate
            </Button>
          </div>
          <div className="space-y-4">
            {candidates.map((c) => (
              <CandidateProCard
                key={c.id}
                candidate={c}
                onSendOffer={() => {
                  void fetch(`/api/admin/hybrid/match-requests/${encodeURIComponent(matchRequestId)}/outreach`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ proIds: [c.id], channel: 'manual', initialStatus: 'push_sent' }),
                  }).then(() => router.refresh());
                }}
                onAssign={() => {
                  void fetch(`/api/admin/hybrid/match-requests/${encodeURIComponent(matchRequestId)}/assign`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ proId: c.id, finalize: true }),
                  }).then(() => router.refresh());
                }}
              />
            ))}
          </div>
          <p className="mt-4 text-center">
            <Link
              href="/admin/hybrid/match-queue"
              className="text-sm font-semibold text-[hsl(var(--trust))] hover:underline"
            >
              ← Back to queue
            </Link>
          </p>
        </div>
      </div>
    </AdminPageShell>
  );
}
