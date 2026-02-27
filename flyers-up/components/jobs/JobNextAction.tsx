'use client';

import { useState } from 'react';
import { mapDbStatusToTimeline, getNextStatus, type Status } from './jobStatus';
import { getBookingById, type BookingDetails } from '@/lib/api';

/** Next action button labels by current status */
const NEXT_ACTION_LABELS: Record<Exclude<Status, 'BOOKED'>, string> = {
  ACCEPTED: "I'm on my way",
  ON_THE_WAY: 'Start work',
  IN_PROGRESS: 'Mark as complete',
  COMPLETED: '',
};

interface JobNextActionProps {
  booking: BookingDetails;
  onUpdated: (b: BookingDetails) => void;
  jobId: string;
}

export function JobNextAction({ booking, onUpdated, jobId }: JobNextActionProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timelineStatus = mapDbStatusToTimeline(booking.status);
  const nextStatus = getNextStatus(timelineStatus);
  const isCompleted = timelineStatus === 'COMPLETED' || timelineStatus === 'PAID';

  const handleAdvance = async () => {
    if (!nextStatus) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nextStatus }),
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
      <div className="border-t border-black/10 bg-white/40 px-6 py-5">
        <p className="text-sm text-black/70 font-medium">Completed</p>
      </div>
    );
  }

  if (timelineStatus === 'BOOKED') {
    return (
      <div className="border-t border-black/10 bg-white/40 px-6 py-5">
        <p className="text-sm text-black/70">Waiting for acceptance</p>
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
