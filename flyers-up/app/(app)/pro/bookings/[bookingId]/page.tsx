'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { ProBookingRealtime } from '@/components/bookings/ProBookingRealtime';
import { ProBookingDetailRealtimePane } from '@/components/bookings/ProBookingDetailRealtimePane';
import { getBookingById, getCurrentUser, type BookingDetails } from '@/lib/api';
import Link from 'next/link';
import { use, useEffect, useState } from 'react';
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
  const [progressRevision, setProgressRevision] = useState(0);
  const [scheduleRevision, setScheduleRevision] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const user = await getCurrentUser();
        if (!mounted) return;
        setSignedIn(Boolean(user));
        if (!user) {
          setInitialBooking(null);
          return;
        }
        const id = normalizeUuidOrNull(bookingId);
        if (!id) {
          setInitialBooking(null);
          return;
        }
        const b = await getBookingById(id);
        if (!mounted) return;
        setInitialBooking(b);
      } catch {
        if (mounted) setInitialBooking(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, [bookingId, reloadKey]);

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
            style={{ backgroundColor: '#F5F5F5' }}
          >
            <p className="text-sm font-medium text-text">We couldn&apos;t load this booking</p>
            <p className="mt-2 text-sm text-muted">
              It may not exist, you may not have access, or data may still be updating after a payment. Try
              again in a moment.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setReloadKey((k) => k + 1)}
                className="inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold bg-text text-[hsl(var(--bg))] hover:opacity-90"
              >
                Try again
              </button>
              <Link
                href="/pro/bookings"
                className="inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium text-text border border-border hover:bg-hover"
              >
                ← Back to bookings
              </Link>
            </div>
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

        <ProBookingRealtime
          bookingId={bookingId}
          initialBooking={initialBooking}
          reloadKey={scheduleRevision}
        >
          {(booking) =>
            booking ? (
              <ProBookingDetailRealtimePane
                booking={booking}
                bookingId={bookingId}
                onBookingUpdated={setInitialBooking}
                progressRevision={progressRevision}
                setProgressRevision={setProgressRevision}
                setScheduleRevision={setScheduleRevision}
              />
            ) : null
          }
        </ProBookingRealtime>
      </div>
    </AppLayout>
  );
}
