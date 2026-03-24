'use client';

import { useState } from 'react';

export interface CancelDueToProDelayBannerProps {
  bookingId: string;
  noShowEligibleAt: string | null;
  arrivedAt: string | null;
  status: string;
}

const AWAITING_ARRIVAL_STATUSES = [
  'deposit_paid',
  'awaiting_pro_arrival',
  'pro_en_route',
  'on_the_way',
];

export function CancelDueToProDelayBanner({
  bookingId,
  noShowEligibleAt,
  arrivedAt,
  status,
}: CancelDueToProDelayBannerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCancelPenaltyFree =
    AWAITING_ARRIVAL_STATUSES.includes(status) &&
    !arrivedAt &&
    noShowEligibleAt &&
    new Date(noShowEligibleAt).getTime() <= Date.now();

  if (!canCancelPenaltyFree) return null;

  const handleCancel = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel-due-to-pro-delay`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to cancel');
        return;
      }
      window.location.reload();
    } catch (e) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border-2 border-amber-500/50 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
      <p className="font-semibold text-amber-900 dark:text-amber-100">
        Your pro has not arrived. You can cancel this booking penalty-free.
      </p>
      <p className="text-sm text-amber-800 dark:text-amber-200">
        If your pro does not check in within 60 minutes of the scheduled start time, you may cancel without penalty and receive a full refund.
      </p>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      <button
        type="button"
        onClick={handleCancel}
        disabled={loading}
        className="h-11 px-4 rounded-full text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
      >
        {loading ? 'Canceling...' : 'Cancel due to pro delay'}
      </button>
    </div>
  );
}
