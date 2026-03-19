'use client';

/**
 * Customer checkout — redirects to canonical /bookings/[id]/checkout
 * Keeps /customer/bookings/:id/checkout links working.
 */
import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CustomerCheckoutPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = use(params);
  const router = useRouter();

  useEffect(() => {
    const phase = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('phase') : null;
    const query = phase === 'final' ? '?phase=final' : '';
    router.replace(`/bookings/${bookingId}/checkout${query}`);
  }, [bookingId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <p className="text-sm text-muted">Redirecting to checkout…</p>
    </div>
  );
}
