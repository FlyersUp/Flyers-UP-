'use client';

import { useState } from 'react';
import type { PendingRescheduleInfo } from '@/lib/bookings/pending-reschedule';
import { pendingRescheduleLine } from '@/lib/bookings/pending-reschedule';

type Props = {
  bookingId: string;
  pending: PendingRescheduleInfo;
  /** Who is viewing: the other party gets accept/decline. */
  viewerRole: 'pro' | 'customer';
  onResolved?: () => void;
  className?: string;
};

export function ProPendingReschedulePanel({
  bookingId,
  pending,
  viewerRole,
  onResolved,
  className = '',
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const respond = async (action: 'accept' | 'decline') => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/reschedule/${pending.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not update reschedule.');
        return;
      }
      onResolved?.();
    } catch {
      setError('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const who =
    pending.requestedByRole === 'customer'
      ? viewerRole === 'pro'
        ? 'Customer requested'
        : 'You requested'
      : viewerRole === 'customer'
        ? 'Your pro requested'
        : 'You requested';

  const showResponderActions =
    (viewerRole === 'pro' && pending.requestedByRole === 'customer') ||
    (viewerRole === 'customer' && pending.requestedByRole === 'pro');

  return (
    <div
      className={`rounded-xl border border-amber-500/40 bg-amber-500/10 dark:bg-amber-500/15 px-4 py-3 text-sm ${className}`}
    >
      <p className="font-semibold text-text">Pending reschedule</p>
      <p className="mt-1 text-muted">
        {who} a new time:{' '}
        <span className="font-medium text-text">{pendingRescheduleLine(pending)}</span>
      </p>
      {pending.message ? (
        <p className="mt-2 text-xs text-muted whitespace-pre-wrap border-t border-amber-500/20 pt-2">
          {pending.message}
        </p>
      ) : null}
      <p className="mt-2 text-xs text-muted">
        {viewerRole === 'pro'
          ? 'Details below still show the current agreed slot until you accept this request.'
          : 'Details below still show the current agreed slot until the other party accepts.'}
      </p>
      {showResponderActions && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => void respond('accept')}
            className="rounded-full px-4 py-2 text-sm font-semibold bg-[hsl(var(--accent-pro))] text-[hsl(var(--accent-contrast))] disabled:opacity-60"
          >
            {loading ? '…' : 'Accept new time'}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void respond('decline')}
            className="rounded-full px-4 py-2 text-sm font-medium border border-border bg-surface2 disabled:opacity-60"
          >
            Decline
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
