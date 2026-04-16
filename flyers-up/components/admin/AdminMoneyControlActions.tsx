'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { AdminMoneyControlState } from '@/lib/bookings/admin-money-control-state';

export function AdminMoneyControlActions({
  bookingId,
  state,
}: {
  bookingId: string;
  state: AdminMoneyControlState;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const showRetryRefund =
    state.refundPipeline === 'partially_failed' || state.refundPipeline === 'failed';

  const showMarkReview = !state.flags.requiresAdminReview;

  async function postLifecycle(action: string, extra?: Record<string, unknown>) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/payment-lifecycle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, ...extra }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        retry?: { kind?: string; message?: string };
      };
      if (!res.ok) {
        const parts = [
          data.retry?.kind === 'retry_not_needed'
            ? 'Already refunded'
            : data.retry?.kind === 'retry_blocked_manual_review'
              ? 'Manual review required before retry'
              : data.retry?.kind === 'retry_conflicts_with_existing_refund_state'
                ? 'Refund state conflict detected'
                : null,
          data.message,
          data.error,
        ].filter((p): p is string => Boolean(p && String(p).trim()));
        setMsg(parts.length ? parts.join(' — ') : `HTTP ${res.status}`);
        return;
      }
      setMsg(data.message ?? 'Saved.');
      window.location.reload();
    } catch {
      setMsg('Request failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted uppercase tracking-wide">Actions</p>
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/admin/bookings/${bookingId}/payments#admin-canonical-stripe`}
          className="rounded-lg border border-hairline bg-surface px-3 py-1.5 text-sm font-medium hover:bg-surface2"
        >
          Canonical Stripe metadata
        </Link>
        {showRetryRefund ? (
          <button
            type="button"
            disabled={busy}
            title="Uses app ledger preflight: only missing legs are sent to Stripe; ambiguous state requires manual review first."
            className="rounded-lg border border-hairline bg-surface px-3 py-1.5 text-sm font-medium hover:bg-surface2 disabled:opacity-50"
            onClick={() => void postLifecycle('retry_refund_customer')}
          >
            Retry remaining refund
          </button>
        ) : null}
        {showMarkReview ? (
          <button
            type="button"
            disabled={busy}
            className="rounded-lg border border-hairline px-3 py-1.5 text-sm text-muted hover:bg-surface2 disabled:opacity-50"
            onClick={() => void postLifecycle('mark_manual_review_required')}
          >
            Mark manual review required
          </button>
        ) : null}
      </div>
      {msg ? <p className="text-xs text-muted">{msg}</p> : null}
    </div>
  );
}
