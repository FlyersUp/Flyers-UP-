'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layouts/AppLayout';
import { BookingDetailContent } from './BookingDetailContent';
import { BookingSignInPrompt } from '@/components/bookings/customer/BookingSignInPrompt';
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (serverBooking || serverError === 'unauthorized' || serverError === 'forbidden') return;
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
          <p className="text-sm text-muted">Loading booking…</p>
        </div>
      </AppLayout>
    );
  }

  if (apiError === 'not_found' || (serverError === 'forbidden' && !loading)) {
    return (
      <AppLayout mode="customer">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="rounded-2xl border border-black/5 p-6 shadow-sm" style={{ backgroundColor: '#FAF8F6' }}>
            <p className="text-sm text-muted">Booking not found or you don&apos;t have access.</p>
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
        <p className="text-sm text-muted">Loading…</p>
      </div>
    </AppLayout>
  );
}
