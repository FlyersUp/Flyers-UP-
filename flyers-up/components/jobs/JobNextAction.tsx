'use client';

import { useState } from 'react';
import { deriveTimelineDisplayStatus, getNextStatus, type Status } from './jobStatus';
import { getBookingById, type BookingDetails } from '@/lib/api';

/** Next action button labels by current status */
const NEXT_ACTION_LABELS: Record<Exclude<Status, 'BOOKED' | 'AWAITING_ACCEPTANCE'>, string> = {
  ACCEPTED: 'On My Way',
  ON_THE_WAY: 'Arrived',
  ARRIVED: 'Start Job',
  IN_PROGRESS: 'Complete Job',
  COMPLETED: '',
  PAID: '',
};

interface JobNextActionProps {
  booking: BookingDetails;
  onUpdated: (b: BookingDetails) => void;
  jobId: string;
}

export function JobNextAction({ booking, onUpdated, jobId }: JobNextActionProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timelineStatus = deriveTimelineDisplayStatus(booking.status, {
    paidAt: booking.paidAt,
    paidDepositAt: booking.paidDepositAt,
    fullyPaidAt: booking.fullyPaidAt,
  });
  const nextStatus = getNextStatus(timelineStatus);
  const isCompleted = timelineStatus === 'COMPLETED' || timelineStatus === 'PAID';

  const handleAccept = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${jobId}/accept`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Failed to accept booking');
        return;
      }
      const updated = await getBookingById(booking.id);
      if (updated) onUpdated(updated);
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleAdvance = async () => {
    if (!nextStatus) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nextStatus }),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Failed to update status');
        return;
      }
      const updated = await getBookingById(booking.id);
      if (updated) onUpdated(updated);
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (isCompleted) {
    return (
      <div className="border-t border-border bg-[hsl(var(--card-neutral))] px-6 py-5">
        <p className="text-sm font-medium text-[hsl(var(--accent-customer))]">✓ Job completed</p>
        <p className="text-xs text-muted mt-1">You keep 100% of your service price</p>
      </div>
    );
  }

  if (timelineStatus === 'BOOKED' || timelineStatus === 'AWAITING_ACCEPTANCE') {
    return (
      <div className="border-t border-border bg-[hsl(var(--card-neutral))] px-6 py-5">
        <div className="space-y-3">
          <p className="text-sm text-muted">Review the details and accept to confirm this booking.</p>
          <button
            type="button"
            onClick={handleAccept}
            disabled={loading}
            className="w-full h-11 flex items-center justify-center rounded-full text-sm font-semibold text-[hsl(var(--accent-contrast))] bg-[hsl(var(--accent-pro))] hover:brightness-95 disabled:opacity-70 transition-all"
          >
            {loading ? 'Accepting…' : 'Accept Booking'}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </div>
    );
  }

  const label = NEXT_ACTION_LABELS[timelineStatus];
  if (!label || !nextStatus) return null;

  return (
    <div className="border-t border-black/10 bg-white/40 px-6 py-5">
      <div className="space-y-3">
        <button
          type="button"
          onClick={handleAdvance}
          disabled={loading}
          className="w-full h-11 flex items-center justify-center rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95 disabled:opacity-70 transition-all"
        >
          {loading ? 'Updating…' : label}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
