'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import Link from 'next/link';
import { use, useEffect, useState } from 'react';

function formatDateTime(serviceDate?: string, serviceTime?: string): string {
  if (!serviceDate) return '—';
  try {
    const d = new Date(serviceDate);
    if (Number.isNaN(d.getTime())) return serviceDate;
    const dateStr = d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    return serviceTime ? `${dateStr} at ${serviceTime}` : dateStr;
  } catch {
    return serviceDate;
  }
}

type BookingSummary = {
  id: string;
  status: string;
  paymentStatus?: string;
  paidAt?: string | null;
  price?: number;
  serviceName?: string;
  proName?: string;
  serviceDate?: string;
  serviceTime?: string;
  address?: string;
};

export default function ConfirmedPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = use(params);
  const [booking, setBooking] = useState<BookingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBooking = async () => {
    try {
      const res = await fetch(`/api/customer/bookings/${bookingId}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) return null;
      return json.booking as BookingSummary;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      const b = await fetchBooking();
      if (!mounted) return;
      if (b) {
        setBooking(b);
      } else {
        setError('Could not load booking');
      }
      setLoading(false);
    };
    void run();
    return () => { mounted = false; };
  }, [bookingId]);

  // Poll when payment is still processing
  useEffect(() => {
    if (!booking || booking.paymentStatus === 'PAID') return;
    const interval = setInterval(async () => {
      const b = await fetchBooking();
      if (b && b.paymentStatus === 'PAID') {
        setBooking(b);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [bookingId, booking?.paymentStatus]);

  return (
    <AppLayout mode="customer">
      <div className="min-h-screen" style={{ backgroundColor: '#F5F5F5' }}>
        <div className="max-w-lg mx-auto px-4 py-8">
          <h1 className="text-2xl font-semibold text-[#111111] mb-6">Booking confirmed</h1>

          {loading ? (
            <div className="rounded-2xl border border-black/5 bg-gray-200 p-6 shadow-sm animate-pulse h-48" />
          ) : error ? (
            <div
              className="rounded-2xl border border-black/10 p-6"
              style={{ backgroundColor: '#F5F5F5' }}
            >
              <p className="text-sm text-[#3A3A3A] mb-4">{error}</p>
              <Link
                href={`/customer/bookings/${bookingId}`}
                className="text-sm font-medium text-[#111111] hover:underline"
              >
                Return to booking
              </Link>
            </div>
          ) : booking ? (
            <div className="space-y-4">
              <div
                className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
                style={{ backgroundColor: '#FFFFFF' }}
              >
                <div className="space-y-3">
                  <p className="font-semibold text-[#111111]">{booking.serviceName ?? 'Service'}</p>
                  <p className="text-sm text-[#6A6A6A]">{booking.proName ?? 'Pro'}</p>
                  <p className="text-sm text-[#3A3A3A]">
                    {formatDateTime(booking.serviceDate, booking.serviceTime)}
                  </p>
                  {booking.price != null && (
                    <p className="text-sm font-medium text-[#111111]">
                      Total: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(booking.price))}
                    </p>
                  )}
                  <div className="flex items-center gap-2 pt-2">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                        booking.paymentStatus === 'PAID'
                          ? 'bg-[#B2FBA5] text-[#111111]'
                          : ['REQUIRES_ACTION', 'UNPAID', 'PROCESSING'].includes(booking.paymentStatus ?? '')
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-[#F5F5F5] text-[#3A3A3A]'
                      }`}
                    >
                      {booking.paymentStatus === 'PAID'
                        ? 'Paid'
                        : ['REQUIRES_ACTION', 'UNPAID', 'PROCESSING'].includes(booking.paymentStatus ?? '')
                          ? 'Processing…'
                          : booking.paymentStatus ?? 'Processing…'}
                    </span>
                    {booking.paidAt && (
                      <span className="text-xs text-[#6A6A6A]">
                        Paid at {new Date(booking.paidAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href={`/customer/bookings/${bookingId}`}
                  className="flex-1 h-11 flex items-center justify-center rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95 transition-all"
                >
                  Track booking
                </Link>
                <Link
                  href={`/customer/chat/${bookingId}`}
                  className="flex-1 h-11 flex items-center justify-center rounded-full text-sm font-medium border border-black/15 text-black/80 hover:bg-black/5 transition-colors"
                >
                  Message pro
                </Link>
              </div>

              {!['PAID', 'FAILED'].includes(booking.paymentStatus ?? '') && (
                <p className="text-xs text-[#6A6A6A] text-center">
                  Payment is processing. This page will update when the payment completes.
                </p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </AppLayout>
  );
}
