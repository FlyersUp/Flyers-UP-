'use client';

import { useCallback, useRef, useState } from 'react';

type Props = {
  bookingId: string;
  /** Called after successful release (before optional delay). */
  onReleased?: () => void | Promise<void>;
  className?: string;
};

/**
 * Calls POST /api/admin/bookings/{bookingId}/payment-lifecycle { action: "approve_payout" }.
 * Server runs evaluatePayoutTransferEligibility + releasePayout — no duplicated payout logic.
 */
export function ApprovePayoutNowButton({ bookingId, onReleased, className }: Props) {
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
        body: JSON.stringify({ action: 'approve_payout' }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        code?: string;
        error?: string;
        transferId?: string | null;
      };
      if (!res.ok || json.ok === false) {
        const code = json.code ?? json.error ?? res.statusText;
        setMessage({ type: 'err', text: typeof code === 'string' ? code : 'Release failed' });
        return;
      }
      setMessage({ type: 'ok', text: 'Payout released. Transfer is processing.' });
      await onReleased?.();
    } catch {
      setMessage({ type: 'err', text: 'Network error' });
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [bookingId, onReleased]);

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
        {loading ? 'Releasing…' : 'Approve & release payout now'}
      </button>
      {message?.type === 'ok' ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-300">{message.text}</p>
      ) : null}
      {message?.type === 'err' ? (
        <p className="text-sm text-red-700 dark:text-red-300" role="alert">
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
