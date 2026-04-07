'use client';

/**
 * Client body for /bookings/[id]/confirmed — reads ?phase=final for remaining-payment copy + polling.
 */

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BookingConfirmedContent } from '@/components/checkout/BookingConfirmedContent';
import { trackGaEvent } from '@/lib/analytics/trackGa';

export type BookingData = {
  id: string;
  status: string;
  paymentStatus?: string;
  finalPaymentStatus?: string | null;
  paidAt?: string | null;
  paidDepositAt?: string | null;
  amountDeposit?: number | null;
  amountRemaining?: number | null;
  amountTotal?: number | null;
  serviceName?: string;
  proName?: string;
  proPhotoUrl?: string | null;
  serviceDate?: string;
  serviceTime?: string;
  address?: string | null;
};

async function fetchBooking(bookingId: string): Promise<BookingData | null> {
  try {
    const res = await fetch(`/api/customer/bookings/${bookingId}`, {
      cache: 'no-store',
      credentials: 'include',
    });
    const json = await res.json();
    if (!res.ok) return null;
    return json.booking as BookingData;
  } catch {
    return null;
  }
}

function toCents(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v);
  return null;
}

function paymentProcessingDeposit(booking: BookingData): boolean {
  const st = (booking.paymentStatus ?? 'UNPAID').toUpperCase();
  return !['PAID', 'FAILED'].includes(st) && ['REQUIRES_ACTION', 'UNPAID', 'PROCESSING'].includes(st);
}

function paymentProcessingFinal(booking: BookingData): boolean {
  const st = (booking.finalPaymentStatus ?? 'UNPAID').toUpperCase();
  const remaining = toCents(booking.amountRemaining) ?? 0;
  if (st === 'PAID' || st === 'FAILED' || remaining <= 0) return false;
  return ['REQUIRES_ACTION', 'UNPAID', 'PROCESSING'].includes(st);
}

export function ConfirmedPageClient({ bookingId }: { bookingId: string }) {
  const searchParams = useSearchParams();
  const paymentPhase = searchParams.get('phase') === 'final' ? 'final' : 'deposit';

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      const b = await fetchBooking(bookingId);
      if (!mounted) return;
      if (b) {
        setBooking(b);
      } else {
        setError('Could not load booking. Check your connection or sign in again.');
      }
      setLoading(false);
    };
    void run();
    return () => { mounted = false };
  }, [bookingId, reloadToken]);

  const isFinalPhase = paymentPhase === 'final';

  useEffect(() => {
    if (!booking) return;
    const done = isFinalPhase
      ? (booking.finalPaymentStatus ?? '').toUpperCase() === 'PAID' ||
        (toCents(booking.amountRemaining) ?? 0) <= 0
      : (booking.paymentStatus ?? '').toUpperCase() === 'PAID';
    if (done) return;

    const interval = setInterval(async () => {
      const b = await fetchBooking(bookingId);
      if (!b) return;
      setBooking(b);
    }, 3000);
    return () => clearInterval(interval);
  }, [bookingId, booking, isFinalPhase]);

  const isProcessing = booking
    ? isFinalPhase
      ? paymentProcessingFinal(booking)
      : paymentProcessingDeposit(booking)
    : false;

  useEffect(() => {
    if (!booking || loading || typeof window === 'undefined') return;
    if (isFinalPhase) {
      const paid =
        (booking.finalPaymentStatus ?? '').toUpperCase() === 'PAID' ||
        (toCents(booking.amountRemaining) ?? 0) <= 0;
      const key = `fu_ga_purchase_${bookingId}`;
      if (paid && !sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        const totalCents = toCents(booking.amountTotal);
        const value = totalCents != null ? totalCents / 100 : 0;
        trackGaEvent('purchase', {
          transaction_id: `booking-${bookingId}`,
          value,
          currency: 'USD',
        });
      }
    } else {
      const paid = (booking.paymentStatus ?? '').toUpperCase() === 'PAID';
      const key = `fu_ga_deposit_${bookingId}`;
      if (paid && !sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        const depCents = toCents(booking.amountDeposit);
        const value = depCents != null ? depCents / 100 : 0;
        trackGaEvent('deposit_paid', { value, currency: 'USD' });
      }
    }
  }, [booking, loading, isFinalPhase, bookingId]);

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-lg md:max-w-xl mx-auto px-4 md:px-6 py-8">
        {loading && (
          <div className="space-y-5 animate-pulse">
            <div className="flex flex-col items-center py-6">
              <div className="h-14 w-14 rounded-full bg-[#E5E5E5] dark:bg-[#2D2D2D]" />
              <div className="mt-4 h-6 w-48 rounded bg-[#E5E5E5] dark:bg-[#2D2D2D]" />
              <div className="mt-2 h-4 w-64 rounded bg-[#E5E5E5] dark:bg-[#2D2D2D]" />
            </div>
            <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-6 h-32" />
            <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-6 h-24" />
            <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-6 h-40" />
          </div>
        )}

        {!loading && error && (
          <div
            className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#171A20] p-6 shadow-sm"
            role="alert"
          >
            <p className="text-sm font-medium text-[#111111] dark:text-[#F5F7FA] mb-2">
              Something went wrong
            </p>
            <p className="text-sm text-[#6A6A6A] dark:text-[#A1A8B3] mb-4">{error}</p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setReloadToken((t) => t + 1)}
                className="inline-flex items-center justify-center h-11 px-5 rounded-full text-sm font-semibold border border-black/15 dark:border-white/20 text-[#111111] dark:text-[#F5F7FA] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
              >
                Try again
              </button>
              <Link
                href={`/customer/bookings/${bookingId}`}
                className="inline-flex items-center justify-center h-11 px-5 rounded-full text-sm font-semibold bg-[#058954] text-white hover:bg-[#047a48] transition-colors"
              >
                View booking
              </Link>
            </div>
          </div>
        )}

        {!loading && !error && booking && (
          <BookingConfirmedContent
            bookingId={bookingId}
            paymentPhase={paymentPhase}
            data={{
              serviceName: booking.serviceName ?? 'Service',
              proName: booking.proName ?? 'Pro',
              proPhotoUrl: booking.proPhotoUrl ?? null,
              serviceDate: booking.serviceDate ?? '',
              serviceTime: booking.serviceTime ?? '',
              address: booking.address,
              status: booking.status,
              paymentStatus: booking.paymentStatus ?? 'UNPAID',
              amountDeposit: toCents(booking.amountDeposit),
              amountRemaining: toCents(booking.amountRemaining),
              amountTotal: toCents(booking.amountTotal),
              paidDepositAt: booking.paidDepositAt ?? booking.paidAt,
            }}
            isProcessing={!!isProcessing}
          />
        )}

        {!loading && !error && booking && isProcessing && (
          <p className="mt-6 text-center text-xs text-[#6A6A6A] dark:text-[#A1A8B3]">
            {isFinalPhase
              ? 'Syncing your final payment with the booking. You can open View booking — amounts usually update within a minute.'
              : 'Payment is processing. This page will update when the booking is confirmed.'}
          </p>
        )}
      </div>
    </div>
  );
}
