'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirect /customer/bookings/[id]/track to /customer/bookings/[id]
 * Both URLs show the same booking details page.
 */
export default function TrackBookingRedirect({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/customer/bookings/${bookingId}`);
  }, [bookingId, router]);

  return null;
}
