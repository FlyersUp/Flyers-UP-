'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { BookingTimeline } from '@/components/bookings/BookingTimeline';
import { BookingStatusBadge } from '@/components/bookings/BookingStatusBadge';
import { LatestUpdateCard } from '@/components/bookings/LatestUpdateCard';
import { TrackBookingRealtime, type TrackBookingData } from '@/components/bookings/TrackBookingRealtime';
import { mapDbStatusToTimeline, buildTimestampsFromBooking } from '@/components/jobs/jobStatus';
import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

function formatDateTime(serviceDate?: string, serviceTime?: string): string {
  if (!serviceDate) return '—';
  try {
    const d = new Date(serviceDate);
    if (Number.isNaN(d.getTime())) return serviceDate;
    const dateStr = d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    return serviceTime ? `${dateStr} at ${serviceTime}` : dateStr;
  } catch {
    return serviceDate;
  }
}

function getLatestTimestamp(status: string, data: TrackBookingData): string | null {
  const ts = buildTimestampsFromBooking(
    data.createdAt,
    data.statusHistory,
    {
      acceptedAt: data.acceptedAt,
      onTheWayAt: data.onTheWayAt,
      startedAt: data.startedAt,
      completedAt: data.completedAt,
    }
  );
  const s = mapDbStatusToTimeline(status);
  return ts[s] ?? null;
}

export default function CustomerBookingDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = use(params);
  const router = useRouter();
  const [initialBooking, setInitialBooking] = useState<TrackBookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBooking = async (): Promise<TrackBookingData | null> => {
    try {
      const res = await fetch(`/api/customer/bookings/${bookingId}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 401) router.replace(`/signin?next=/customer/bookings/${bookingId}`);
        else if (res.status === 404) setError('Booking not found');
        else setError('Booking not found');
        return null;
      }
      return json.booking as TrackBookingData;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      const b = await fetchBooking();
      if (!mounted) return;
      setInitialBooking(b ?? null);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [bookingId]);

  if (loading && !initialBooking) {
    return (
      <AppLayout mode="customer">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <p className="text-sm text-muted">Loading…</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !initialBooking) {
    return (
      <AppLayout mode="customer">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div
            className="rounded-2xl border border-[var(--hairline)] p-6"
            style={{ backgroundColor: '#F2F2F0' }}
          >
            <p className="text-sm text-muted">{error || 'Booking not found'}</p>
            <Link
              href="/customer/bookings"
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
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Link
          href="/customer/bookings"
          className="text-sm text-muted hover:text-text mb-4 inline-block"
        >
          ← Back to bookings
        </Link>

        <TrackBookingRealtime
          bookingId={bookingId}
          initialBooking={initialBooking}
          fetchBooking={fetchBooking}
        >
          {(booking) => {
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
                    {booking.serviceName || 'Service'} · {booking.proName || 'Pro'}
                  </p>
                  <p className="mt-0.5 text-sm text-muted">
                    {formatDateTime(booking.serviceDate, booking.serviceTime)}
                  </p>
                  <div className="mt-3">
                    <BookingStatusBadge status={booking.status} />
                  </div>
                </header>

                <section className="mb-6">
                  <LatestUpdateCard
                    status={status}
                    timestamp={getLatestTimestamp(booking.status, booking)}
                  />
                </section>

                <section className="mb-6">
                  <h2 className="text-base font-semibold text-text mb-4">Status timeline</h2>
                  <div
                    className="rounded-2xl border border-[var(--hairline)] p-6"
                    style={{ backgroundColor: '#F2F2F0' }}
                  >
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
                </section>

                {booking.status === 'awaiting_payment' && (
                  <div
                    className="mb-6 rounded-2xl border-2 p-6"
                    style={{ borderColor: '#B2FBA5', backgroundColor: 'rgba(178,251,165,0.15)' }}
                  >
                    <h3 className="font-semibold text-text mb-1">Payment due</h3>
                    <p className="text-sm text-muted mb-4">
                      Your pro marked the job complete. Please pay to close out the booking.
                    </p>
                    <Link
                      href={`/customer/booking/pay?bookingId=${encodeURIComponent(bookingId)}`}
                      className="inline-flex items-center justify-center h-11 px-6 rounded-full text-sm font-semibold text-black bg-[#B2FBA5] hover:brightness-95 transition-all"
                    >
                      Pay now →
                    </Link>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href={`/customer/chat/${bookingId}`}
                    className="flex-1 h-11 flex items-center justify-center rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95 transition-all"
                  >
                    Message Pro
                  </Link>
                  <Link
                    href="/customer/settings/help-support"
                    className="flex-1 h-11 flex items-center justify-center rounded-full text-sm font-medium border border-black/15 text-black/80 hover:bg-black/5 transition-colors"
                  >
                    Help / Support
                  </Link>
                </div>

                {status === 'COMPLETED' && (
                  <div className="mt-6">
                    <Link
                      href={`/jobs/${bookingId}`}
                      className="text-sm font-medium text-text hover:underline"
                    >
                      Leave a review →
                    </Link>
                  </div>
                )}

                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-8 p-3 rounded-lg bg-black/5 text-xs font-mono text-muted">
                    Debug: id={booking.id} status={booking.status}
                  </div>
                )}
              </>
            );
          }}
        </TrackBookingRealtime>
      </div>
    </AppLayout>
  );
}
