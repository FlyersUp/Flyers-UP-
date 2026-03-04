'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

/**
 * Shown when server didn't recognize session. Checks client-side session;
 * if user is actually signed in, refreshes the page so server can re-fetch with cookies.
 */
export function BookingSignInPrompt({ bookingId }: { bookingId: string }) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled || !session) return;
        // Client has session — server may have missed cookies. Refresh to re-fetch.
        router.refresh();
      } catch {
        // ignore
      }
    };
    void check();
    return () => { cancelled = true; };
  }, [router]);

  return (
    <>
      <Link
        href="/customer/bookings"
        className="text-sm text-muted hover:text-text transition-colors"
      >
        ← Back to bookings
      </Link>
      <div
        className="mt-6 rounded-2xl border border-black/5 p-6 shadow-sm"
        style={{ backgroundColor: '#FAF8F6' }}
      >
        <h1 className="text-lg font-semibold text-text">Track booking</h1>
        <p className="mt-2 text-sm text-muted">
          Please sign in to view this booking.
        </p>
        <Link
          href={`/auth?next=${encodeURIComponent(`/customer/bookings/${bookingId}`)}`}
          className="mt-4 inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95"
        >
          Sign in
        </Link>
      </div>
    </>
  );
}
