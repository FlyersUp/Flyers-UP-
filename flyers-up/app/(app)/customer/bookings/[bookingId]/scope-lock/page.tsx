'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { ScopeLockCard } from '@/components/scope-lock';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { computeMoneyBreakdown } from '@/lib/bookings/money';

type BookingData = {
  id: string;
  price: number;
  notes: string | null;
  service_date: string;
  service_time: string;
  address: string;
  job_request_id: string | null;
  scope_confirmed_at: string | null;
  job_details_snapshot: Record<string, unknown> | null;
  photos_snapshot: Array<{ category: string; url: string }> | null;
};

export default function ScopeLockPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params?.bookingId as string | undefined;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingData | null>(null);

  useEffect(() => {
    if (!bookingId) return;

    const load = async () => {
      try {
        const res = await fetch(`/api/customer/bookings/${bookingId}`, {
          cache: 'no-store',
          credentials: 'include',
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? 'Booking not found');
          setLoading(false);
          return;
        }
        const b = json.booking;
        if (!b) {
          setError('Booking not found');
          setLoading(false);
          return;
        }
        if (b.scope_confirmed_at) {
          router.replace(`/customer/bookings/${bookingId}/deposit`);
          return;
        }
        if (!b.job_request_id) {
          router.replace(`/customer/bookings/${bookingId}`);
          return;
        }
        setBooking({
          id: b.id,
          price: Number(b.price ?? 0),
          notes: b.notes ?? null,
          service_date: b.serviceDate ?? b.service_date ?? '',
          service_time: b.serviceTime ?? b.service_time ?? '',
          address: b.address ?? '',
          job_request_id: b.job_request_id ?? null,
          scope_confirmed_at: b.scope_confirmed_at ?? null,
          job_details_snapshot: b.job_details_snapshot ?? null,
          photos_snapshot: b.photos_snapshot ?? null,
        });
      } catch {
        setError('Could not load booking');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [bookingId, router]);

  const handleConfirmScope = async () => {
    if (!bookingId) return;
    const res = await fetch(`/api/bookings/${bookingId}/scope-lock`, {
      method: 'POST',
      credentials: 'include',
    });
    const json = await res.json();
    if (res.ok) {
      router.push(`/customer/bookings/${bookingId}/deposit`);
    } else {
      setError(json.error ?? 'Failed to confirm scope');
    }
  };

  if (!bookingId || loading) {
    return (
      <AppLayout mode="customer">
        <div className="min-h-[40vh] flex items-center justify-center">
          <p className="text-sm text-muted/70">Loading…</p>
        </div>
      </AppLayout>
    );
  }

  if (error && !booking) {
    return (
      <AppLayout mode="customer">
        <div className="max-w-lg mx-auto px-4 py-8">
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <Link href="/customer/bookings" className="text-sm font-medium text-[#111] hover:underline">
            ← Back to bookings
          </Link>
        </div>
      </AppLayout>
    );
  }

  if (!booking) return null;

  const totalCents = Math.round(booking.price * 100);
  const breakdown = computeMoneyBreakdown(totalCents, 50);
  const depositCents = breakdown.deposit_amount_cents;
  const remainingCents = breakdown.remaining_amount_cents;

  return (
    <AppLayout mode="customer">
      <div className="min-h-screen bg-[#F5F5F5]">
        <div className="max-w-lg mx-auto px-4 py-8">
          <Link
            href={`/customer/bookings/${bookingId}`}
            className="text-sm text-black/70 hover:text-black mb-6 inline-block"
          >
            ← Back to booking
          </Link>

          <h1 className="text-xl font-semibold text-[#111] mb-2">Confirm Job Scope</h1>
          <p className="text-sm text-black/60 mb-6">
            Review the job details and photos before paying the deposit. Your deposit will only be charged after you confirm.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
              {error}
            </div>
          )}

          <ScopeLockCard
            jobSummary={{
              title: booking.notes?.split('\n')[0] ?? 'Cleaning service',
              address: booking.address,
              date: booking.service_date,
              time: booking.service_time,
              jobDetails: booking.job_details_snapshot ?? undefined,
            }}
            photos={booking.photos_snapshot ?? []}
            proPrice={booking.price}
            depositAmount={depositCents}
            remainingBalance={remainingCents}
            onConfirmScope={handleConfirmScope}
            onEditDetails={() => router.push(`/customer/bookings/${bookingId}`)}
          />
        </div>
      </div>
    </AppLayout>
  );
}
