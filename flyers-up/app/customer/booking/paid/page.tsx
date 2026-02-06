'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getBookingById, type BookingDetails } from '@/lib/api';

function PaidContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const [booking, setBooking] = useState<BookingDetails | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!bookingId) return;
      const b = await getBookingById(bookingId);
      if (!mounted) return;
      setBooking(b);
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [bookingId]);

  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Card className="p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-semibold text-text mb-2">Payment received</h1>
          <p className="text-muted mb-6">Thanks—your payment was successful.</p>

          {booking ? (
            <div className="mb-5 flex items-center justify-center">
              <StatusBadge status={booking.status} />
            </div>
          ) : null}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {bookingId ? (
              <Link href={`/jobs/${bookingId}`}>
                <Button>View request</Button>
              </Link>
            ) : (
              <Button disabled>View request</Button>
            )}
            <Link href="/customer">
              <Button variant="secondary">Back to dashboard</Button>
            </Link>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

export default function PaidPage() {
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
      <PaidContent />
    </Suspense>
  );
}

