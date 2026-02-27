'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { BookingTimeline } from '@/components/bookings/BookingTimeline';
import { BookingStatusBadge } from '@/components/bookings/BookingStatusBadge';
import { JobNextAction } from '@/components/jobs/JobNextAction';
import { ProBookingRealtime } from '@/components/bookings/ProBookingRealtime';
import { mapDbStatusToTimeline, buildTimestampsFromBooking } from '@/components/jobs/jobStatus';
import { getBookingById, getCurrentUser, type BookingDetails } from '@/lib/api';
import Link from 'next/link';
import { use, useEffect, useMemo, useState } from 'react';
import { normalizeUuidOrNull } from '@/lib/isUuid';

export default function ProBookingDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = use(params);
  const [initialBooking, setInitialBooking] = useState<BookingDetails | null>(null);
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
        setInitialBooking(null);
        setLoading(false);
        return;
      }
      const id = normalizeUuidOrNull(bookingId);
      if (!id) {
        setInitialBooking(null);
        setLoading(false);
        return;
      }
      const b = await getBookingById(id);
      if (!mounted) return;
      setInitialBooking(b);
      setLoading(false);
    };
    void load();
    return () => { mounted = false; };
  }, [bookingId]);

  const formattedDate = useMemo(() => {
    if (!initialBooking) return null;
    const d = new Date(initialBooking.serviceDate);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [initialBooking]);

  if (loading && !initialBooking) {
    return (
      <AppLayout mode="pro">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <p className="text-sm text-muted">Loading…</p>
        </div>
      </AppLayout>
    );
  }

  if (!signedIn) {
    return (
      <AppLayout mode="pro">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <p className="text-sm text-muted mb-4">Please sign in to view this booking.</p>
          <Link
            href={`/signin?next=${encodeURIComponent(`/pro/bookings/${bookingId}`)}`}
            className="text-sm font-medium text-text hover:underline"
          >
            Sign in →
          </Link>
        </div>
      </AppLayout>
    );
  }

  if (!initialBooking) {
    return (
      <AppLayout mode="pro">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div
            className="rounded-2xl border border-[var(--hairline)] p-6"
            style={{ backgroundColor: '#F2F2F0' }}
          >
            <p className="text-sm text-muted">Booking not found.</p>
            <Link
              href="/pro/bookings"
              className="mt-4 inline-block text-sm font-medium text-text hover:underline"
            >
              ← Back to bookings
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout mode="pro">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Link
          href="/pro/bookings"
          className="text-sm text-muted hover:text-text mb-4 inline-block"
        >
          ← Back to bookings
        </Link>

        <ProBookingRealtime bookingId={bookingId} initialBooking={initialBooking}>
          {(booking) => {
            if (!booking) return null;
            const status = mapDbStatusToTimeline(booking.status);
            const timestamps = buildTimestampsFromBooking(
              booking.createdAt,
              booking.statusHistory,
              {
                acceptedAt: booking.acceptedAt,
                onTheWayAt: booking.onTheWayAt,
                startedAt: booking.startedAt,
                completedAt: booking.completedAt,
              }
            );

            return (
              <>
                <header className="mb-6">
                  <h1 className="text-2xl font-semibold text-text">Booking Details</h1>
                  <p className="mt-1 text-sm text-muted">
                    {formattedDate || '—'} {booking.serviceTime ? `at ${booking.serviceTime}` : ''}
                  </p>
                  <p className="mt-0.5 text-sm text-muted">
                    Created {new Date(booking.createdAt).toLocaleDateString()}
                  </p>
                  <div className="mt-3">
                    <BookingStatusBadge status={booking.status} />
                  </div>
                </header>

                <div
                  className="rounded-2xl border border-[var(--hairline)] p-5 mb-6"
                  style={{ backgroundColor: '#F2F2F0' }}
                >
                  <div className="text-sm font-medium text-muted mb-2">Customer</div>
                  <p className="text-text">Customer ID: {booking.customerId.slice(0, 8)}…</p>
                  {booking.address && (
                    <p className="mt-2 text-sm text-text">{booking.address}</p>
                  )}
                  {booking.notes && (
                    <p className="mt-2 text-sm text-muted">Notes: {booking.notes}</p>
                  )}
                  <p className="mt-2 text-sm font-semibold text-text">
                    {booking.price != null ? `$${booking.price}` : 'TBD'}
                  </p>
                </div>

                <section className="mb-6">
                  <h2 className="text-base font-semibold text-text mb-4">Status timeline</h2>
                  <div
                    className="rounded-2xl border border-[var(--hairline)] overflow-hidden"
                    style={{ backgroundColor: '#F2F2F0' }}
                  >
                    <div className="p-6">
                      <BookingTimeline
                        status={status}
                        timestamps={{
                          booked: timestamps.BOOKED,
                          accepted: timestamps.ACCEPTED,
                          onTheWay: timestamps.ON_THE_WAY,
                          started: timestamps.IN_PROGRESS,
                          completed: timestamps.COMPLETED,
                        }}
                      />
                    </div>
                    <JobNextAction
                      booking={booking}
                      onUpdated={setInitialBooking}
                      jobId={bookingId}
                    />
                  </div>
                </section>

                <div className="flex gap-3">
                  <Link
                    href={`/pro/jobs/${bookingId}`}
                    className="text-sm font-medium text-text hover:underline"
                  >
                    View full job details →
                  </Link>
                  <Link
                    href={`/pro/chat/${bookingId}`}
                    className="text-sm font-medium text-text hover:underline"
                  >
                    Message customer
                  </Link>
                </div>

                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-8 p-3 rounded-lg bg-black/5 text-xs font-mono text-muted">
                    Debug: id={booking.id} status={booking.status}
                  </div>
                )}
              </>
            );
          }}
        </ProBookingRealtime>
      </div>
    </AppLayout>
  );
}
