'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { FlaggedPayoutReviewItem } from '@/lib/admin/flagged-payout-review';
import { ApprovePayoutNowButton } from '@/components/admin/ApprovePayoutNowButton';
import { KeepPayoutOnHoldButton } from '@/components/admin/KeepPayoutOnHoldButton';

function formatMoney(cents: number | null) {
  if (cents == null || cents <= 0) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function Pill({ children, tone }: { children: ReactNode; tone: 'amber' | 'red' | 'emerald' | 'neutral' }) {
  const map = {
    amber: 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200',
    red: 'bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-200',
    emerald: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200',
    neutral: 'bg-surface2 text-muted',
  } as const;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[tone]}`}>
      {children}
    </span>
  );
}

function queueStatusLabel(status: string | null | undefined) {
  const s = status ?? 'pending_review';
  switch (s) {
    case 'pending_review':
      return 'Pending review';
    case 'held':
      return 'Held';
    case 'approved':
      return 'Approved';
    case 'refunded':
      return 'Refunded';
    case 'rejected':
      return 'Rejected';
    case 'escalated':
      return 'Escalated';
    default:
      return s;
  }
}

function queueStatusPillTone(status: string | null | undefined): 'amber' | 'red' | 'emerald' | 'neutral' {
  const s = status ?? 'pending_review';
  if (s === 'pending_review' || s === 'held') return 'amber';
  if (s === 'escalated') return 'red';
  if (s === 'approved') return 'emerald';
  return 'neutral';
}

export function FlaggedPayoutReviewPageClient() {
  const [items, setItems] = useState<FlaggedPayoutReviewItem[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setError(null);
    const res = await fetch('/api/admin/payments/payout-review', { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.error) {
      setError(typeof json.error === 'string' ? json.error : 'Failed to load');
      setItems([]);
      setCount(0);
      return;
    }
    setItems(json.items ?? []);
    setCount(Number(json.count) || 0);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await refetch();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refetch]);

  if (loading) {
    return <div className="text-sm text-muted">Loading payout review queue…</div>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
        {error}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-hairline bg-surface p-8 text-center text-muted shadow-card">
        No bookings require payout review. Automatic release will process eligible jobs on schedule.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        <span className="font-semibold text-text">{count}</span> booking{count === 1 ? '' : 's'} flagged (
        <code className="text-xs">requires_admin_review</code>).
      </p>
      {items.map((item) => (
        <article
          key={item.bookingId}
          className="rounded-[18px] border border-hairline bg-surface p-5 shadow-card space-y-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/admin/bookings/${item.bookingId}`}
                  className="font-mono text-sm font-medium text-accent hover:underline break-all"
                >
                  {item.bookingId}
                </Link>
                <Pill tone="amber">Under review</Pill>
                <Pill tone={queueStatusPillTone(item.queueStatus)}>{queueStatusLabel(item.queueStatus)}</Pill>
              </div>
              <p className="mt-1 text-xs text-muted">
                {item.serviceDate ?? '—'} {item.serviceTime ?? ''} · {item.categoryName ?? 'Service'}
              </p>
            </div>
            <div className="flex flex-shrink-0 flex-wrap items-start justify-end gap-2">
              <KeepPayoutOnHoldButton
                bookingId={item.bookingId}
                onHeld={async () => {
                  await refetch();
                }}
              />
              <ApprovePayoutNowButton
                bookingId={item.bookingId}
                onReleased={async () => {
                  await refetch();
                }}
              />
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted text-xs">Pro</dt>
              <dd className="font-medium">{item.proName ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted text-xs">Customer</dt>
              <dd className="font-medium">{item.customerName ?? item.customerEmail ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted text-xs">Payout (est.)</dt>
              <dd className="font-medium">{formatMoney(item.payoutAmountCents)}</dd>
            </div>
            <div>
              <dt className="text-muted text-xs">Lifecycle</dt>
              <dd className="font-mono text-xs break-all">{item.paymentLifecycleStatus ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted text-xs">Booking hold reason</dt>
              <dd>{item.payoutHoldReason ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted text-xs">Admin hold reason</dt>
              <dd className="text-xs">{item.queueHoldReason ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted text-xs">Internal note</dt>
              <dd className="text-xs">{item.queueInternalNote ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted text-xs">Completed</dt>
              <dd className="text-xs">{item.completedAt ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted text-xs">Duration (actual / min expected)</dt>
              <dd>
                {item.actualDurationMinutes != null ? `${item.actualDurationMinutes} min` : '—'}
                {item.minimumExpectedDurationMinutes != null ? ` / ${item.minimumExpectedDurationMinutes} min` : ''}
              </dd>
            </div>
            <div>
              <dt className="text-muted text-xs">Deposit / Final paid</dt>
              <dd>
                {item.depositPaid ? <Pill tone="emerald">Deposit</Pill> : <Pill tone="neutral">No deposit</Pill>}{' '}
                {item.finalPaid ? <Pill tone="emerald">Final</Pill> : <Pill tone="neutral">No final</Pill>}
              </dd>
            </div>
            <div>
              <dt className="text-muted text-xs">After photos</dt>
              <dd>{item.afterPhotoCount}</dd>
            </div>
            <div>
              <dt className="text-muted text-xs">Dispute</dt>
              <dd>
                {item.disputeOpen ? <Pill tone="red">Open</Pill> : <Pill tone="neutral">{item.disputeStatus ?? 'none'}</Pill>}
              </dd>
            </div>
            <div>
              <dt className="text-muted text-xs">Refund</dt>
              <dd>{item.refundStatus ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted text-xs">Connect</dt>
              <dd>
                {!item.connectDestinationPresent ? (
                  <Pill tone="red">No destination</Pill>
                ) : item.stripeChargesEnabled === true ? (
                  <Pill tone="emerald">Ready</Pill>
                ) : item.stripeChargesEnabled === false ? (
                  <Pill tone="amber">Charges off</Pill>
                ) : (
                  <Pill tone="neutral">Unknown</Pill>
                )}
              </dd>
            </div>
          </dl>

          {item.suspiciousCompletion ? (
            <p className="text-xs text-amber-800 dark:text-amber-200">
              <strong>Suspicious completion:</strong> {item.suspiciousCompletionReason ?? 'flagged'}
            </p>
          ) : null}
          {item.payoutWarnings.length > 0 ? (
            <p className="text-xs text-amber-800 dark:text-amber-200">Warnings: {item.payoutWarnings.join('; ')}</p>
          ) : null}

          <div className="flex flex-wrap gap-2 border-t border-hairline pt-3">
            <Link
              href={`/admin/bookings/${item.bookingId}`}
              className="text-sm font-medium text-accent hover:underline"
            >
              Open booking
            </Link>
            <span className="text-muted">·</span>
            <Link href={`/admin/bookings/${item.bookingId}/payments`} className="text-sm text-muted hover:text-text">
              Payment audit
            </Link>
            <span className="text-muted">·</span>
            <Link href={`/admin/disputes/${item.bookingId}`} className="text-sm text-muted hover:text-text">
              Dispute / evidence
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
