'use client';

import { useCallback, useRef, useState } from 'react';

type Props = {
  bookingId: string;
  onHeld?: () => void | Promise<void>;
  /** Extra wrapper classes for layout (e.g. shrink-0). */
  className?: string;
  buttonClassName?: string;
};

/**
 * POST /api/admin/bookings/{bookingId}/payment-lifecycle { action: "keep_payout_on_hold", holdReason, internalNote }.
 * Does not release payout or clear admin review — sets queue to held and records notes.
 */
export function KeepPayoutOnHoldButton({ bookingId, onHeld, className, buttonClassName }: Props) {
  const [open, setOpen] = useState(false);
  const [holdReason, setHoldReason] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const inFlight = useRef(false);

  const close = useCallback(() => {
    setOpen(false);
    setMessage(null);
  }, []);

  const submit = useCallback(async () => {
    const reason = holdReason.trim();
    if (!reason) {
      setMessage({ type: 'err', text: 'Add a short reason so the team knows why this is still held.' });
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
          action: 'keep_payout_on_hold',
          holdReason: reason,
          internalNote: internalNote.trim() || null,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || json.ok === false) {
        const err = json.error ?? res.statusText;
        setMessage({ type: 'err', text: typeof err === 'string' ? err : 'Could not update hold' });
        return;
      }
      setHoldReason('');
      setInternalNote('');
      await onHeld?.();
      close();
    } catch {
      setMessage({ type: 'err', text: 'Network error' });
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [bookingId, holdReason, internalNote, onHeld, close]);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setMessage(null);
        }}
        className={
          buttonClassName ??
          'inline-flex items-center justify-center rounded-xl border border-hairline bg-surface px-4 py-2.5 text-sm font-semibold text-text shadow-sm hover:bg-surface2 disabled:opacity-60 disabled:pointer-events-none'
        }
      >
        Keep on hold
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
            className="w-full max-w-md rounded-2xl border border-hairline bg-surface p-5 shadow-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="keep-on-hold-title"
          >
            <h3 id="keep-on-hold-title" className="text-lg font-semibold text-text">
              Keep on hold
            </h3>
            <p className="mt-2 text-sm text-muted">Keep this payout blocked pending further review?</p>

            <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-muted">
              Reason
            </label>
            <textarea
              value={holdReason}
              onChange={(e) => setHoldReason(e.target.value)}
              rows={3}
              placeholder="e.g. waiting for customer response, photos unclear, duration mismatch"
              className="mt-1 w-full rounded-xl border border-hairline bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
            />

            <label className="mt-3 block text-xs font-medium uppercase tracking-wide text-muted">
              Add internal note (optional)
            </label>
            <textarea
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-xl border border-hairline bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
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
                className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
              >
                {loading ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
