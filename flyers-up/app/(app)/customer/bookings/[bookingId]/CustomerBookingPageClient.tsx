'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layouts/AppLayout';
import { BookingDetailContent } from './BookingDetailContent';
import { BookingSignInPrompt } from '@/components/bookings/customer/BookingSignInPrompt';
import { BookingLoadErrorPage } from '@/components/checkout/BookingLoadErrorPage';
import { TrackBookingSkeleton } from '@/components/bookings/customer/TrackBookingSkeleton';
import type { BookingDetailData } from './BookingDetailContent';

/**
 * When server returns null (e.g. cookie/session not passed to RSC), try fetching
 * from API - client fetch includes cookies and often succeeds.
 */
export function CustomerBookingPageClient({
  bookingId,
  serverBooking,
  serverError,
}: {
  bookingId: string;
  serverBooking: BookingDetailData | null;
  serverError: 'unauthorized' | 'forbidden' | null;
}) {
  const [apiBooking, setApiBooking] = useState<BookingDetailData | null>(null);
  const [apiError, setApiError] = useState<'unauthorized' | 'not_found' | null>(null);
  /** Show skeleton while client fetch runs (server had no booking or non-unauthorized edge cases). */
  const [loading, setLoading] = useState(() => !serverBooking && serverError !== 'unauthorized');

  useEffect(() => {
    // Still fetch from API when server returned forbidden (e.g. stale RSC role check) or null booking.
    if (serverBooking || serverError === 'unauthorized') return;
    let cancelled = false;
    const fetchApi = async () => {
      setLoading(true);
      setApiError(null);
      try {
        const res = await fetch(`/api/customer/bookings/${bookingId}`, {
          cache: 'no-store',
          credentials: 'include',
        });
        const json = await res.json();
        if (cancelled) return;
        if (res.ok && json.booking) {
          setApiBooking(json.booking as BookingDetailData);
        } else if (res.status === 401) {
          setApiError('unauthorized');
        } else {
          setApiError('not_found');
        }
      } catch {
        if (!cancelled) setApiError('not_found');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchApi();
    return () => { cancelled = true; };
  }, [bookingId, serverBooking, serverError]);

  if (serverError === 'unauthorized' || apiError === 'unauthorized') {
    return (
      <AppLayout mode="customer">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <BookingSignInPrompt bookingId={bookingId} />
        </div>
      </AppLayout>
    );
  }

  const booking = serverBooking ?? apiBooking;
  if (booking) {
    return (
      <AppLayout mode="customer">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <BookingDetailContent booking={booking} bookingId={bookingId} />
        </div>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout mode="customer">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <TrackBookingSkeleton />
        </div>
      </AppLayout>
    );
  }

  if (!loading && apiError === 'not_found') {
    return (
      <AppLayout mode="customer">
        <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col items-center min-h-[50vh]">
          <BookingLoadErrorPage
            title="Couldn't load this booking"
            errorStatus={404}
            primaryHref="/customer/bookings"
            primaryLabel="View all bookings"
            secondaryHref="/customer/categories"
            secondaryLabel="Find a pro"
            onRetry={() => window.location.reload()}
            compact={false}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    </AppLayout>
  );
}
