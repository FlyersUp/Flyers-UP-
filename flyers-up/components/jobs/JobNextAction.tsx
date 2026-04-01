'use client';

import { useState } from 'react';
import Link from 'next/link';
import { deriveTimelineDisplayStatus, getNextStatus, type Status } from './jobStatus';
import { getBookingById, type BookingDetails } from '@/lib/api';
import { ArrivalVerificationModal } from '@/components/marketplace/ArrivalVerificationModal';
import { JobCompletionModal } from '@/components/marketplace/JobCompletionModal';
import { JobStartBriefingModal } from '@/components/jobs/JobStartBriefingModal';

/** Next action button labels by current status (when not in arrival check-in flow). */
const NEXT_ACTION_LABELS: Record<Exclude<Status, 'BOOKED' | 'AWAITING_ACCEPTANCE'>, string> = {
  ACCEPTED: 'On My Way',
  ON_THE_WAY: 'Verify arrival',
  ARRIVED: 'Start Job',
  IN_PROGRESS: 'Complete Job',
  COMPLETED: '',
  PAID: '',
};

function needsArrivalCheckIn(booking: BookingDetails): boolean {
  if (booking.arrivalStartedAt) return false;
  const s = String(booking.status);
  return s === 'pro_en_route' || s === 'on_the_way' || s === 'arrived';
}

interface JobNextActionProps {
  booking: BookingDetails;
  onUpdated: (b: BookingDetails) => void;
  jobId: string;
}

function isProDeclinableStatus(dbStatus: string): boolean {
  const s = (dbStatus || '').toLowerCase();
  return s === 'requested' || s === 'pending';
}

export function JobNextAction({ booking, onUpdated, jobId }: JobNextActionProps) {
  const [loading, setLoading] = useState(false);
  const [declineLoading, setDeclineLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [arrivalModalOpen, setArrivalModalOpen] = useState(false);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [startBriefingOpen, setStartBriefingOpen] = useState(false);
  const [declineModalOpen, setDeclineModalOpen] = useState(false);

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
        setError((data as { error?: string }).error || 'Failed to accept booking');
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

  const handleDeclineConfirm = async () => {
    setDeclineLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${jobId}/decline`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error || 'Failed to decline request');
        return;
      }
      setDeclineModalOpen(false);
      const updated = await getBookingById(booking.id);
      if (updated) onUpdated(updated);
    } catch {
      setError('Something went wrong');
    } finally {
      setDeclineLoading(false);
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
        if (data.code === 'arrival_required') {
          setArrivalModalOpen(true);
        }
        if (data.code === 'completion_photos_required') {
          setCompletionModalOpen(true);
        }
        setError(data.error || 'Failed to update status');
        return;
      }
      const updated = await getBookingById(booking.id);
      if (updated) onUpdated(updated);
      setStartBriefingOpen(false);
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const refreshBooking = async () => {
    const updated = await getBookingById(booking.id);
    if (updated) onUpdated(updated);
  };

  const dbStatusLower = (booking.status || '').toLowerCase();
  if (dbStatusLower === 'declined') {
    return (
      <div className="border-t border-border bg-[hsl(var(--card-neutral))] px-6 py-5">
        <p className="text-sm font-medium text-text">You declined this request</p>
        <p className="text-xs text-muted mt-1">The customer has been notified. This job no longer counts as an active request.</p>
        <Link
          href="/pro/jobs"
          className="mt-4 inline-block text-sm font-semibold text-[hsl(var(--accent-pro))] hover:underline"
        >
          Back to jobs
        </Link>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="border-t border-border bg-[hsl(var(--card-neutral))] px-6 py-5">
        <p className="text-sm font-medium text-[hsl(var(--accent-customer))]">✓ Job completed</p>
        <p className="text-xs text-muted mt-1">You keep 100% of your service price</p>
      </div>
    );
  }

  if (timelineStatus === 'BOOKED' || timelineStatus === 'AWAITING_ACCEPTANCE') {
    const showDecline = isProDeclinableStatus(booking.status);
    return (
      <div className="border-t border-border bg-[hsl(var(--card-neutral))] px-6 py-5">
        <div className="space-y-3">
          <p className="text-sm text-muted">Review the details and accept to confirm this booking.</p>
          <button
            type="button"
            onClick={handleAccept}
            disabled={loading || declineLoading}
            className="w-full h-11 flex items-center justify-center rounded-full text-sm font-semibold text-[hsl(var(--accent-contrast))] bg-[hsl(var(--accent-pro))] hover:brightness-95 disabled:opacity-70 transition-all"
          >
            {loading ? 'Accepting…' : 'Accept Booking'}
          </button>
          {showDecline ? (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setDeclineModalOpen(true);
              }}
              disabled={loading || declineLoading}
              className="w-full h-11 flex items-center justify-center rounded-full text-sm font-semibold border-2 border-red-600/70 text-red-700 dark:text-red-400 bg-transparent hover:bg-red-600/10 disabled:opacity-60 transition-colors"
            >
              Decline Request
            </button>
          ) : null}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {declineModalOpen ? (
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4 bg-black/50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="decline-request-title"
          >
            <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-lg">
              <h3 id="decline-request-title" className="text-base font-semibold text-text">
                Decline this request?
              </h3>
              <p className="mt-2 text-sm text-muted">
                Are you sure you want to decline this request? The customer will be notified and you won&apos;t be able to
                accept it afterward.
              </p>
              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (!declineLoading) setDeclineModalOpen(false);
                  }}
                  className="w-full sm:w-auto rounded-full px-4 py-2.5 text-sm font-medium border border-border text-text hover:bg-hover"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeclineConfirm()}
                  disabled={declineLoading}
                  className="w-full sm:w-auto rounded-full px-4 py-2.5 text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {declineLoading ? 'Declining…' : 'Decline request'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  const label = NEXT_ACTION_LABELS[timelineStatus];
  if (!label || !nextStatus) return null;

  const showArrivalModalCta =
    needsArrivalCheckIn(booking) && (timelineStatus === 'ON_THE_WAY' || timelineStatus === 'ARRIVED');

  const showCompletionModalCta = timelineStatus === 'IN_PROGRESS';

  const arrivalLabel =
    timelineStatus === 'ON_THE_WAY' ? 'Verify arrival' : 'Verify arrival to start job';

  const shouldBriefBeforeStart =
    timelineStatus === 'ARRIVED' && !showArrivalModalCta && nextStatus === 'IN_PROGRESS';

  const handlePrimaryAdvance = () => {
    if (shouldBriefBeforeStart) {
      setError(null);
      setStartBriefingOpen(true);
      return;
    }
    void handleAdvance();
  };

  return (
    <div className="border-t border-black/10 bg-white/40 px-6 py-5">
      <div className="space-y-3">
        {showCompletionModalCta ? (
          <>
            <p className="text-xs text-muted">
              Add at least 2 after photos to mark the job complete and request the remaining balance.
            </p>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setCompletionModalOpen(true);
              }}
              disabled={loading}
              className="w-full h-11 flex items-center justify-center rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95 disabled:opacity-70 transition-all"
            >
              {label}
            </button>
          </>
        ) : showArrivalModalCta ? (
          <>
            <p className="text-xs text-muted">
              Confirm you&apos;re on site before starting work. Required for accountability.
            </p>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setArrivalModalOpen(true);
              }}
              disabled={loading}
              className="w-full h-11 flex items-center justify-center rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95 disabled:opacity-70 transition-all"
            >
              {arrivalLabel}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handlePrimaryAdvance}
            disabled={loading}
            className="w-full h-11 flex items-center justify-center rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95 disabled:opacity-70 transition-all"
          >
            {loading ? 'Updating…' : label}
          </button>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <JobStartBriefingModal
          open={startBriefingOpen}
          onClose={() => {
            if (!loading) setStartBriefingOpen(false);
          }}
          onConfirmStart={() => void handleAdvance()}
          address={booking.address ?? ''}
          notes={booking.notes}
          bookingAddonSnapshots={booking.bookingAddonSnapshots}
          loading={loading}
        />
        <ArrivalVerificationModal
          isOpen={arrivalModalOpen}
          onClose={() => setArrivalModalOpen(false)}
          onSuccess={refreshBooking}
          bookingId={jobId}
        />
        <JobCompletionModal
          isOpen={completionModalOpen}
          onClose={() => setCompletionModalOpen(false)}
          onSuccess={refreshBooking}
          bookingId={jobId}
        />
      </div>
    </div>
  );
}
