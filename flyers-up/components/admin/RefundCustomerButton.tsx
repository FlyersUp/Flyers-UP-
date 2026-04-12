'use client';

import { useCallback, useRef, useState } from 'react';

type Props = {
  bookingId: string;
  onRefunded?: () => void | Promise<void>;
  className?: string;
  buttonClassName?: string;
};

/**
 * POST /api/admin/bookings/{bookingId}/payment-lifecycle { action: "refund_customer", refundReason?, refundInternalNote? }.
 * Full customer refund, clears payout review flag, marks queue refunded.
 */
export function RefundCustomerButton({ bookingId, onRefunded, className, buttonClassName }: Props) {
  const [open, setOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [ackNoReason, setAckNoReason] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'err'; text: string } | null>(null);
  const inFlight = useRef(false);

  const close = useCallback(() => {
    setOpen(false);
    setMessage(null);
    setAckNoReason(false);
  }, []);

  const submit = useCallback(async () => {
    const reason = refundReason.trim();
    if (!reason && !ackNoReason) {
      setMessage({
        type: 'err',
        text: 'Add a short reason for the audit trail, or check the box below to proceed without one.',
      });
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/payment-lifecycle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'refund_customer',
          refundReason: reason || null,
          refundInternalNote: internalNote.trim() || null,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || json.ok === false) {
        const err = json.error ?? res.statusText;
        setMessage({ type: 'err', text: typeof err === 'string' ? err : 'Refund failed' });
        return;
      }
      setRefundReason('');
      setInternalNote('');
      setAckNoReason(false);
      await onRefunded?.();
      close();
    } catch {
      setMessage({ type: 'err', text: 'Network error' });
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [bookingId, refundReason, internalNote, ackNoReason, onRefunded, close]);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setMessage(null);
          setAckNoReason(false);
        }}
        className={
          buttonClassName ??
          'inline-flex items-center justify-center rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-900 shadow-sm hover:bg-red-100 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100 dark:hover:bg-red-950/70'
        }
      >
        Refund customer
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center sm:bg-black/30 dark:bg-black/50"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-red-200 bg-surface p-5 shadow-card dark:border-red-900/50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="refund-customer-title"
          >
            <h3 id="refund-customer-title" className="text-lg font-semibold text-red-900 dark:text-red-100">
              Refund customer
            </h3>
            <p className="mt-2 text-sm text-muted">
              This runs a <strong className="text-text">full refund</strong> on the booking&apos;s payment
              intents, clears payout review, and marks the queue as refunded. The pro will not receive a payout
              for this job.
            </p>

            <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-muted">
              Refund reason (recommended)
            </label>
            <textarea
              value={refundReason}
              onChange={(e) => {
                setRefundReason(e.target.value);
                if (e.target.value.trim()) setAckNoReason(false);
              }}
              rows={3}
              placeholder="e.g. service not completed, duplicate charge, policy exception — helps disputes and audits"
              className="mt-1 w-full rounded-xl border border-hairline bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-red-500/25"
            />

            <label className="mt-1 flex cursor-pointer items-start gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={ackNoReason}
                onChange={(e) => setAckNoReason(e.target.checked)}
                className="mt-0.5 rounded border-hairline"
              />
              <span>Proceed without a written refund reason (not recommended)</span>
            </label>

            <label className="mt-3 block text-xs font-medium uppercase tracking-wide text-muted">
              Internal note (optional)
            </label>
            <textarea
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-xl border border-hairline bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-red-500/25"
            />

            {message?.type === 'err' ? (
              <p className="mt-3 text-sm text-red-700 dark:text-red-300" role="alert">
                {message.text}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={close}
                disabled={loading}
                className="rounded-xl border border-hairline px-4 py-2 text-sm font-medium text-text hover:bg-surface2 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={loading}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {loading ? 'Processing…' : 'Confirm full refund'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
