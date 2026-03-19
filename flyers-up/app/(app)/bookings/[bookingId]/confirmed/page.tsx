'use client';

/**
 * Booking Confirmed — Post-deposit payment success
 *
 * Immediate next screen after Stripe redirect.
 * Eliminates uncertainty: payment clarity, what happens next, trust, clear actions.
 *
 * States: loading, processing (webhook delay), success, error
 */

import { AppLayout } from '@/components/layouts/AppLayout';
import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { BookingConfirmedContent } from '@/components/checkout/BookingConfirmedContent';

type BookingData = {
  id: string;
  status: string;
  paymentStatus?: string;
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
    const res = await fetch(`/api/customer/bookings/${bookingId}`, { cache: 'no-store' });
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

export default function ConfirmedPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = use(params);
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setError('Could not load booking');
      }
      setLoading(false);
    };
    void run();
    return () => { mounted = false };
  }, [bookingId]);

  // Poll when payment is still processing (webhook delay)
  useEffect(() => {
    if (!booking || booking.paymentStatus === 'PAID') return;
    const interval = setInterval(async () => {
      const b = await fetchBooking(bookingId);
      if (b && b.paymentStatus === 'PAID') {
        setBooking(b);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [bookingId, booking?.paymentStatus]);

  const isProcessing =
    booking &&
    !['PAID', 'FAILED'].includes(booking.paymentStatus ?? '') &&
    ['REQUIRES_ACTION', 'UNPAID', 'PROCESSING'].includes(booking.paymentStatus ?? '');

  return (
    <AppLayout mode="customer">
      <div className="min-h-screen bg-bg">
        <div className="max-w-lg md:max-w-xl mx-auto px-4 md:px-6 py-8">
          {/* LOADING STATE */}
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

          {/* ERROR STATE */}
          {!loading && error && (
            <div
              className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#171A20] p-6 shadow-sm"
              role="alert"
            >
              <p className="text-sm font-medium text-[#111111] dark:text-[#F5F7FA] mb-2">
                Something went wrong
              </p>
              <p className="text-sm text-[#6A6A6A] dark:text-[#A1A8B3] mb-4">{error}</p>
              <Link
                href={`/customer/bookings/${bookingId}`}
                className="inline-flex items-center justify-center h-11 px-5 rounded-full text-sm font-semibold bg-[#058954] text-white hover:bg-[#047a48] transition-colors"
              >
                View booking
              </Link>
            </div>
          )}

          {/* SUCCESS / PROCESSING STATE */}
          {!loading && !error && booking && (
            <BookingConfirmedContent
              bookingId={bookingId}
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

          {/* Processing footnote */}
          {!loading && !error && booking && isProcessing && (
            <p className="mt-6 text-center text-xs text-[#6A6A6A] dark:text-[#A1A8B3]">
              Payment is processing. This page will update when the booking is confirmed.
            </p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
