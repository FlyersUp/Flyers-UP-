
'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { getBookingById, type BookingDetails } from '@/lib/api';

function BookingSuccessContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const [booking, setBooking] = useState<BookingDetails | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!bookingId) return;
      const b = await getBookingById(bookingId);
      if (!mounted) return;
      setBooking(b);
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [bookingId]);

  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="bg-surface border border-border rounded-2xl p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-semibold text-text mb-2">Request Sent</h1>
          <p className="text-muted mb-6">
            Your request is with the pro now. If they accept, you can message to confirm scope and details.
          </p>

          {booking ? (
            <div className="mb-5 flex items-center justify-center">
              <StatusBadge status={booking.status} />
            </div>
          ) : null}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {bookingId ? (
              <Link href={`/customer/bookings/${bookingId}`}>
                <Button>Track your booking</Button>
              </Link>
            ) : (
              <Button disabled>Track your booking</Button>
            )}
            {bookingId ? (
              <Link href={`/customer/chat/${bookingId}`}>
                <Button variant="secondary">Message the pro</Button>
              </Link>
            ) : (
              <Button variant="secondary" disabled>Message the pro</Button>
            )}
            <Link href="/customer">
              <Button variant="ghost">Back to dashboard</Button>
            </Link>
          </div>

          {!bookingId && (
            <p className="text-xs text-muted/60 mt-4">
              Missing bookingId in URL. (Expected <code>?</code>bookingId=...)
            </p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense
      fallback={
        <AppLayout mode="customer">
          <div className="max-w-4xl mx-auto px-4 py-10">
            <p className="text-muted/70 text-center">Loading…</p>
          </div>
        </AppLayout>
      }
    >
      <BookingSuccessContent />
    </Suspense>
  );
}






