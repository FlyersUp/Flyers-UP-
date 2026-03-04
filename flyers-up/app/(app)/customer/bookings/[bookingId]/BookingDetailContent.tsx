'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookingTimeline } from '@/components/bookings/BookingTimeline';
import { BookingStatusBadge } from '@/components/bookings/BookingStatusBadge';
import { LatestUpdateCard } from '@/components/bookings/LatestUpdateCard';
import { TrackBookingRealtime, type TrackBookingData } from '@/components/bookings/TrackBookingRealtime';
import { PaymentStatusModule } from '@/components/booking/PaymentStatusModule';
import { BookingPaymentStatusCard } from '@/components/bookings/BookingPaymentStatusCard';
import { BookingEventsAccordion } from '@/components/bookings/BookingEventsAccordion';
import { mapDbStatusToTimeline, buildTimestampsFromBooking } from '@/components/jobs/jobStatus';

export interface BookingDetailData {
  id: string;
  status: string;
  paymentStatus?: string;
  paidAt?: string | null;
  paidDepositAt?: string | null;
  paidRemainingAt?: string | null;
  finalPaymentStatus?: string | null;
  fullyPaidAt?: string | null;
  paymentDueAt?: string | null;
  remainingDueAt?: string | null;
  autoConfirmAt?: string | null;
  platformFeeCents?: number | null;
  refundedTotalCents?: number | null;
  amountDeposit?: number | null;
  amountRemaining?: number | null;
  amountTotal?: number | null;
  price?: number;
  createdAt: string;
  acceptedAt?: string | null;
  onTheWayAt?: string | null;
  enRouteAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  statusHistory?: { status: string; at: string }[];
  serviceName?: string;
  proName?: string;
  serviceDate?: string;
  serviceTime?: string;
  address?: string;
  notes?: string;
}

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

function formatPrice(price: number | undefined): string {
  if (price == null || Number.isNaN(price)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(price));
}

function getLatestTimestamp(status: string, data: TrackBookingData): string | null {
  const ts = buildTimestampsFromBooking(
    data.createdAt,
    data.statusHistory,
    {
      acceptedAt: data.acceptedAt,
      onTheWayAt: data.onTheWayAt ?? data.enRouteAt,
      enRouteAt: data.enRouteAt,
      startedAt: data.startedAt,
      completedAt: data.completedAt,
      paidAt: data.paidAt,
    }
  );
  const s = mapDbStatusToTimeline(status);
  return ts[s] ?? null;
}

function toTrackBookingData(b: BookingDetailData): TrackBookingData {
  return {
    id: b.id,
    status: b.status,
    paymentStatus: b.paymentStatus,
    paidAt: b.paidAt,
    paidDepositAt: b.paidDepositAt,
    paidRemainingAt: b.paidRemainingAt,
    finalPaymentStatus: b.finalPaymentStatus,
    fullyPaidAt: b.fullyPaidAt,
    paymentDueAt: b.paymentDueAt,
    remainingDueAt: (b as { remainingDueAt?: string | null }).remainingDueAt,
    autoConfirmAt: (b as { autoConfirmAt?: string | null }).autoConfirmAt,
    platformFeeCents: (b as { platformFeeCents?: number | null }).platformFeeCents,
    refundedTotalCents: (b as { refundedTotalCents?: number | null }).refundedTotalCents,
    amountDeposit: b.amountDeposit,
    amountRemaining: b.amountRemaining,
    amountTotal: b.amountTotal,
    price: b.price,
    createdAt: b.createdAt,
    acceptedAt: b.acceptedAt,
    onTheWayAt: b.onTheWayAt ?? b.enRouteAt,
    enRouteAt: b.enRouteAt ?? b.onTheWayAt,
    startedAt: b.startedAt,
    completedAt: b.completedAt,
    statusHistory: b.statusHistory,
    serviceName: b.serviceName,
    proName: b.proName,
    serviceDate: b.serviceDate,
    serviceTime: b.serviceTime,
    address: b.address,
  };
}

export function BookingDetailContent({
  booking: initialBooking,
  bookingId,
}: {
  booking: BookingDetailData;
  bookingId: string;
}) {
  const router = useRouter();
  const [detailsOpen, setDetailsOpen] = useState(false);

  const fetchBooking = useCallback(async (): Promise<TrackBookingData | null> => {
    try {
      const res = await fetch(`/api/customer/bookings/${bookingId}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) return null;
      return json.booking as TrackBookingData;
    } catch {
      return null;
    }
  }, [bookingId]);

  const trackData = toTrackBookingData(initialBooking);

  return (
    <TrackBookingRealtime
      bookingId={bookingId}
      initialBooking={trackData}
      fetchBooking={fetchBooking}
    >
      {(booking) => {
        const status = mapDbStatusToTimeline(booking.status);
        const timestamps = buildTimestampsFromBooking(
          booking.createdAt,
          booking.statusHistory,
          {
            acceptedAt: booking.acceptedAt,
            onTheWayAt: booking.onTheWayAt,
            startedAt: booking.startedAt,
            completedAt: booking.completedAt,
          }
        );
        const fullBooking = { ...initialBooking, ...booking } as BookingDetailData & TrackBookingData;
        const paymentStatus = fullBooking.paymentStatus ?? 'UNPAID';
        const paidAt = fullBooking.paidAt;
        const price = fullBooking.price;
        const hasAddressOrNotes = !!(fullBooking.address || fullBooking.notes);

        return (
          <>
            {/* A) Top bar */}
            <div className="flex items-center justify-between gap-4 mb-6">
              <Link
                href="/customer/bookings"
                className="text-sm text-muted hover:text-text transition-colors"
              >
                ← Back to bookings
              </Link>
              <h1 className="text-lg font-semibold text-text">Booking details</h1>
              <BookingStatusBadge status={booking.status} />
            </div>

            {/* B) Header card */}
            <div className="mb-6 rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
              <div className="space-y-1">
                <p className="text-base font-semibold text-text">{booking.serviceName || 'Service'}</p>
                <p className="text-sm text-muted">
                  {booking.proName || 'Pro'} · Pro
                </p>
                <p className="text-sm text-muted">
                  {formatDateTime(booking.serviceDate, booking.serviceTime)}
                </p>
                <div className="pt-3">
                  <BookingStatusBadge status={booking.status} className="text-xs" />
                </div>
              </div>
            </div>

            {/* C) Progress section */}
            <section className="mb-6">
              <h2 className="text-base font-semibold text-text mb-4">Progress</h2>
              <div className="rounded-2xl border border-black/10 p-6 bg-[#F2F2F0] shadow-sm">
                <BookingTimeline
                  status={status}
                  timestamps={{
                    booked: timestamps.BOOKED,
                    accepted: timestamps.ACCEPTED,
                    onTheWay: timestamps.ON_THE_WAY,
                    started: timestamps.IN_PROGRESS,
                    completed: timestamps.COMPLETED,
                    paid: timestamps.PAID,
                  }}
                />
              </div>
            </section>

            {/* D) Latest update card */}
            <section className="mb-6">
              <LatestUpdateCard
                status={status}
                timestamp={getLatestTimestamp(booking.status, booking)}
              />
            </section>

            {/* E) Payment section */}
            <section className="mb-6">
              <h2 className="text-base font-semibold text-text mb-4">Payment</h2>
              <div className="space-y-4">
                <BookingPaymentStatusCard
                  status={booking.status}
                  paymentDueAt={booking.paymentDueAt}
                  remainingDueAt={(fullBooking as { remainingDueAt?: string | null }).remainingDueAt}
                  autoConfirmAt={(fullBooking as { autoConfirmAt?: string | null }).autoConfirmAt}
                  paidDepositAt={booking.paidDepositAt ?? booking.paidAt}
                  paidRemainingAt={booking.paidRemainingAt ?? booking.fullyPaidAt}
                  amountDeposit={booking.amountDeposit}
                  amountRemaining={booking.amountRemaining}
                  amountTotal={booking.amountTotal}
                  view="customer"
                  payDepositSlot={
                    (booking.status === 'awaiting_deposit_payment' || booking.status === 'payment_required' || booking.status === 'accepted') &&
                    !booking.paidAt ? (
                      <Link
                        href={`/bookings/${bookingId}/checkout`}
                        className="inline-flex items-center justify-center h-10 px-4 rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95"
                      >
                        Pay deposit {booking.amountDeposit != null ? `$${(booking.amountDeposit / 100).toFixed(2)}` : ''}
                      </Link>
                    ) : undefined
                  }
                  payRemainingSlot={
                    booking.status === 'awaiting_remaining_payment' && !booking.paidRemainingAt ? (
                      <Link
                        href={`/bookings/${bookingId}/checkout?phase=final`}
                        className="inline-flex items-center justify-center h-10 px-4 rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95"
                      >
                        Pay remaining {booking.amountRemaining != null ? `$${(booking.amountRemaining / 100).toFixed(2)}` : ''}
                      </Link>
                    ) : undefined
                  }
                  confirmSlot={
                    booking.status === 'awaiting_customer_confirmation' ? (
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await fetch(`/api/bookings/${bookingId}/confirm`, { method: 'POST' });
                          if (res.ok) router.refresh();
                        }}
                        className="inline-flex items-center justify-center h-10 px-4 rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95"
                      >
                        Confirm completion
                      </button>
                    ) : undefined
                  }
                />
                <PaymentStatusModule
                  bookingId={bookingId}
                  status={booking.status}
                  paymentStatus={booking.paymentStatus}
                  finalPaymentStatus={booking.finalPaymentStatus}
                  paymentDueAt={booking.paymentDueAt}
                  amountDeposit={booking.amountDeposit}
                  amountRemaining={booking.amountRemaining}
                  amountTotal={booking.amountTotal}
                  paidAt={booking.paidAt}
                  fullyPaidAt={booking.fullyPaidAt}
                  view="customer"
                />
              </div>
            </section>

            {/* F) Service details (collapsible) */}
            {(hasAddressOrNotes || booking.id) && (
              <section className="mb-6">
                <h2 className="text-base font-semibold text-text mb-4">Service details</h2>
                <div className="rounded-2xl border border-black/10 bg-white overflow-hidden shadow-sm">
                  <button
                    type="button"
                    onClick={() => setDetailsOpen(!detailsOpen)}
                    className="w-full flex items-center justify-between px-6 py-4 text-left text-sm font-medium text-text hover:bg-black/[0.02] transition-colors"
                  >
                    <span>Address, notes, booking ID</span>
                    <span className="text-muted">{detailsOpen ? '−' : '+'}</span>
                  </button>
                  {detailsOpen && (
                    <div className="px-6 pb-6 pt-0 space-y-3 text-sm text-muted border-t border-black/10">
                      {fullBooking.address && (
                        <div>
                          <span className="font-medium text-text">Address:</span>{' '}
                          {fullBooking.address}
                        </div>
                      )}
                      {fullBooking.notes && (
                        <div>
                          <span className="font-medium text-text">Notes:</span>{' '}
                          {fullBooking.notes}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text">Booking ID:</span>
                        <code className="text-xs bg-black/5 px-2 py-1 rounded font-mono">
                          {booking.id}
                        </code>
                        <button
                          type="button"
                          onClick={() => navigator.clipboard?.writeText(booking.id)}
                          className="text-xs text-accent hover:underline"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* F.5) Events accordion (debug) */}
            <div className="mb-6">
              <BookingEventsAccordion bookingId={bookingId} />
            </div>

            {/* G) Actions section */}
            <section className="mb-6">
              <h2 className="text-base font-semibold text-text mb-4">Actions</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href={`/customer/chat/${bookingId}`}
                  className="flex-1 h-11 flex items-center justify-center rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95 transition-all"
                >
                  Message pro
                </Link>
                <Link
                  href="/customer/settings/help-support"
                  className="flex-1 h-11 flex items-center justify-center rounded-full text-sm font-medium border border-black/15 text-black/80 hover:bg-black/5 transition-colors"
                >
                  Help / Support
                </Link>
                {(status === 'COMPLETED' || status === 'PAID') && (
                  <Link
                    href={`/jobs/${bookingId}`}
                    className="flex-1 h-11 flex items-center justify-center rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95 transition-all"
                  >
                    Leave a review
                  </Link>
                )}
              </div>
            </section>
          </>
        );
      }}
    </TrackBookingRealtime>
  );
}
