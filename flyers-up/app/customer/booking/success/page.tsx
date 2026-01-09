
'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/Button';

function BookingSuccessContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');

  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Booking Confirmed</h1>
          <p className="text-gray-600 mb-6">
            Your booking was created successfully.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {bookingId ? (
              <Link href={`/jobs/${bookingId}`}>
                <Button>View Job Details</Button>
              </Link>
            ) : (
              <Button disabled>View Job Details</Button>
            )}
            <Link href="/customer">
              <Button variant="secondary">Back to Dashboard</Button>
            </Link>
          </div>

          {!bookingId && (
            <p className="text-xs text-gray-400 mt-4">
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
            <p className="text-gray-500 text-center">Loading…</p>
          </div>
        </AppLayout>
      }
    >
      <BookingSuccessContent />
    </Suspense>
  );
}






