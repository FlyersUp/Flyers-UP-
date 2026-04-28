'use client';

import { useCallback, useRef, useState } from 'react';
import {
  resolveApprovePayoutMessage,
  type ApprovePayoutResponseJson,
} from '@/lib/admin/resolve-approve-payout-message';

type Props = {
  bookingId: string;
  /** Called after successful release (before optional delay). */
  onReleased?: () => void | Promise<void>;
  className?: string;
  /**
   * `retry` after a failed transfer attempt — same server action as approve, clearer admin label.
   */
  mode?: 'approve' | 'retry' | 'retry_stuck';
};

/**
 * Calls POST /api/admin/bookings/{bookingId}/payment-lifecycle { action: "approve_payout" }.
 * Server runs evaluatePayoutTransferEligibility + releasePayout — no duplicated payout logic.
 */
export function ApprovePayoutNowButton({ bookingId, onReleased, className, mode = 'approve' }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const inFlight = useRef(false);

  const onClick = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/payment-lifecycle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: mode === 'retry_stuck' ? 'retry_payout' : 'approve_payout' }),
      });
      const json = (await res.json().catch(() => ({}))) as ApprovePayoutResponseJson;
      const resolved = resolveApprovePayoutMessage(res, json);
      if (resolved.type === 'ok') {
        setMessage({ type: 'ok', text: resolved.text });
        if (resolved.shouldNotifyParent) {
          await onReleased?.();
        }
      } else {
        setMessage({ type: 'err', text: resolved.text });
      }
    } catch {
      setMessage({
        type: 'err',
        text: 'Could not reach the server. Check your connection and retry.',
      });
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [bookingId, onReleased, mode]);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void onClick()}
        disabled={loading}
        className={
          className ??
          'inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60 disabled:pointer-events-none'
        }
      >
        {loading
          ? mode === 'retry' || mode === 'retry_stuck'
            ? 'Retrying…'
            : 'Releasing…'
          : mode === 'retry' || mode === 'retry_stuck'
            ? 'Retry payout'
            : 'Approve & release payout now'}
      </button>
      {message?.type === 'ok' ? (
        <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
          {message.text}
        </div>
      ) : null}
      {message?.type === 'err' ? (
        <div
          className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
          role="alert"
          aria-live="polite"
        >
          {message.text}
        </div>
      ) : null}
    </div>
  );
}
