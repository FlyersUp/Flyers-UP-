'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import JobTimelineCard from '@/components/jobs/JobTimelineCard';
import { mapDbStatusToTimeline, buildTimestampsFromBooking } from '@/components/jobs/jobStatus';
import { getBookingById, getCurrentUser, type BookingDetails } from '@/lib/api';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';

/**
 * Job Status Timeline - Operational timeline card
 */
export default function JobTimelinePage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const user = await getCurrentUser();
      if (!mounted) return;
      setSignedIn(Boolean(user));
      if (!user) {
        setBooking(null);
        setLoading(false);
        return;
      }
      const id = normalizeUuidOrNull(jobId);
      if (!id) {
        setBooking(null);
        setLoading(false);
        return;
      }
      const b = await getBookingById(id);
      if (!mounted) return;
      setBooking(b);
      setLoading(false);
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [jobId]);

  const status = booking ? mapDbStatusToTimeline(booking.status) : 'BOOKED';
  const timestamps = booking
    ? buildTimestampsFromBooking(booking.createdAt, (booking as BookingDetails & { statusHistory?: { status: string; at: string }[] }).statusHistory)
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
          <JobTimelineCard
            status={status}
            timestamps={timestamps}
          />
        )}
      </div>
    </AppLayout>
  );
}
