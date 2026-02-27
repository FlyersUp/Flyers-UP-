'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import JobTimelineCard from '@/components/jobs/JobTimelineCard';
import { JobNextAction } from '@/components/jobs/JobNextAction';
import { mapDbStatusToTimeline, buildTimestampsFromBooking } from '@/components/jobs/jobStatus';
import { getBookingById, getCurrentUser, type BookingDetails } from '@/lib/api';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/**
 * Job Status Timeline - Operational timeline card
 */
export default function JobTimelinePage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  const router = useRouter();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const user = await getCurrentUser();
        if (!mounted) return;
        setSignedIn(Boolean(user));
        if (!user) {
          setBooking(null);
          return;
        }
        const id = normalizeUuidOrNull(jobId);
        if (!id) {
          setBooking(null);
          return;
        }
        const b = await getBookingById(id);
        if (!mounted) return;
        if (b && user.id === b.customerId) {
          router.replace(`/customer/bookings/${id}`);
          return;
        }
        setBooking(b);
      } catch {
        if (mounted) setBooking(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [jobId]);

  const status = booking ? mapDbStatusToTimeline(booking.status) : 'BOOKED';
  const timestamps = booking
    ? buildTimestampsFromBooking(booking.createdAt, booking.statusHistory, {
        acceptedAt: booking.acceptedAt,
        onTheWayAt: booking.onTheWayAt,
        startedAt: booking.startedAt,
        completedAt: booking.completedAt,
      })
    : {};

  return (
    <AppLayout mode="pro">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold text-text mb-6">
          Job Timeline
        </h1>

        {loading ? (
          <div className="rounded-2xl border border-[var(--hairline)] bg-[hsl(var(--surface))] p-8 text-center text-muted">
            Loading…
          </div>
        ) : !signedIn ? (
          <div className="rounded-2xl border border-[var(--hairline)] bg-[hsl(var(--surface))] p-6">
            <p className="text-sm text-muted mb-4">Please sign in to view the job timeline.</p>
            <Link
              href={`/signin?next=${encodeURIComponent(`/pro/jobs/${jobId}/timeline`)}`}
              className="text-sm font-medium text-text hover:underline"
            >
              Sign in →
            </Link>
          </div>
        ) : !booking ? (
          <div className="rounded-2xl border border-[var(--hairline)] bg-[hsl(var(--surface))] p-6">
            <p className="text-sm text-muted">No job found.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-black/10 shadow-sm overflow-hidden bg-[hsl(var(--surface))]">
            <JobTimelineCard
              status={status}
              timestamps={timestamps}
              className="rounded-t-2xl border-0 shadow-none mb-0"
            />
            <JobNextAction booking={booking} onUpdated={setBooking} jobId={jobId} />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
