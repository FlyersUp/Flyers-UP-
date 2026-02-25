'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { BookingTimeline } from '@/components/bookings/BookingTimeline';
import { LatestUpdateCard } from '@/components/bookings/LatestUpdateCard';
import { TrackBookingRealtime, type TrackBookingData } from '@/components/bookings/TrackBookingRealtime';
import { mapDbStatusToTimeline, buildTimestampsFromBooking, STATUS_LABELS } from '@/components/jobs/jobStatus';
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

function getLatestTimestamp(
  status: string,
  data: TrackBookingData
): string | null {
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

export default function TrackBookingPage({
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
      const res = await fetch(`/api/customer/bookings/${bookingId}`, {
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 401) router.replace(`/signin?next=/customer/bookings/${bookingId}/track`);
        else if (res.status === 404) setError('Booking not found');
        return null;
      }
      const b = json.booking as TrackBookingData;
      return b;
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
    return () => {
      mounted = false;
    };
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
          <div className="rounded-2xl border border-[var(--hairline)] bg-[hsl(var(--surface))] p-6">
            <p className="text-sm text-muted">{error || 'Booking not found'}</p>
            <Link
              href="/customer"
              className="mt-4 inline-block text-sm font-medium text-text hover:underline"
            >
              ← Back to home
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
          href="/customer"
          className="text-sm text-muted hover:text-text mb-4 inline-block"
        >
          ← Back
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
                  <h1 className="text-2xl font-semibold text-text">Track Booking</h1>
                  <p className="mt-1 text-sm text-muted">
                    {booking.serviceName || 'Service'} · {booking.proName || 'Pro'}
                  </p>
                  <p className="mt-0.5 text-sm text-muted">
                    {formatDateTime(booking.serviceDate, booking.serviceTime)}
                  </p>
                  <span
                    className="mt-3 inline-block rounded-full px-3 py-1 text-xs font-medium"
                    style={{
                      backgroundColor:
                        status === 'COMPLETED' ? '#B2FBA5' : status !== 'BOOKED' ? '#FFC067' : 'hsl(var(--muted))',
                      color: 'hsl(var(--text))',
                    }}
                  >
                    {STATUS_LABELS[status]}
                  </span>
                </header>

                <section className="mb-6">
                  <LatestUpdateCard
                    status={status}
                    timestamp={getLatestTimestamp(booking.status, booking)}
                  />
                </section>

                <section className="mb-6">
                  <h2 className="text-base font-semibold text-text mb-4">Status timeline</h2>
                  <div className="rounded-2xl border border-[var(--hairline)] bg-[hsl(var(--surface))] p-6">
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
              </>
            );
          }}
        </TrackBookingRealtime>
      </div>
    </AppLayout>
  );
}
