'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookingStatusBadge } from '@/components/bookings/BookingStatusBadge';
import { LatestUpdateCard } from '@/components/bookings/LatestUpdateCard';
import { TrackBookingRealtime, type TrackBookingData } from '@/components/bookings/TrackBookingRealtime';
import { BookingEventsAccordion } from '@/components/bookings/BookingEventsAccordion';
import { BookingRulesAccordion } from '@/components/booking/BookingRulesAccordion';
import { mapDbStatusToTimeline, buildTimestampsFromBooking } from '@/components/jobs/jobStatus';
import { BookingHeaderCard } from '@/components/bookings/customer/BookingHeaderCard';
import { BookingProgressTimeline } from '@/components/bookings/customer/BookingProgressTimeline';
import { PaymentStatusModule } from '@/components/bookings/customer/PaymentStatusModule';
import { BookingActionsBar } from '@/components/bookings/customer/BookingActionsBar';

export interface BookingDetailData {
  id: string;
  proId?: string | null;
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
  arrivedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  statusHistory?: { status: string; at: string }[];
  serviceName?: string;
  proName?: string;
  categoryName?: string;
  proPhotoUrl?: string | null;
  serviceDate?: string;
  serviceTime?: string;
  address?: string;
  notes?: string;
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
    proId: b.proId,
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
    arrivedAt: b.arrivedAt,
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

function getPrimaryAction(booking: BookingDetailData & TrackBookingData, bookingId: string) {
  const needsDeposit =
    ['payment_required', 'accepted', 'accepted_pending_payment', 'awaiting_deposit_payment'].includes(booking.status) &&
    !booking.paidAt &&
    booking.paymentDueAt &&
    new Date(booking.paymentDueAt).getTime() > Date.now();
  const needsRemaining =
    ['completed_pending_payment', 'awaiting_payment', 'awaiting_remaining_payment'].includes(booking.status) &&
    !booking.paidRemainingAt &&
    !booking.fullyPaidAt;

  if (needsDeposit) {
    return (
      <Link
        href={`/customer/bookings/${bookingId}/checkout`}
        className="flex h-11 w-full items-center justify-center rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95 transition-all"
      >
        Pay deposit {booking.amountDeposit != null ? `$${(booking.amountDeposit / 100).toFixed(2)}` : ''}
      </Link>
    );
  }
  if (needsRemaining) {
    return (
      <Link
        href={`/customer/bookings/${bookingId}/checkout?phase=final`}
        className="flex h-11 w-full items-center justify-center rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95 transition-all"
      >
        Pay remaining {booking.amountRemaining != null ? `$${(booking.amountRemaining / 100).toFixed(2)}` : ''}
      </Link>
    );
  }
  if (booking.status === 'awaiting_customer_confirmation') {
    return null; // handled by confirm button
  }
  return null;
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
        const hasAddressOrNotes = !!(fullBooking.address || fullBooking.notes);
        const primaryAction = getPrimaryAction(fullBooking, bookingId);
        const showConfirmSlot = booking.status === 'awaiting_customer_confirmation';

        return (
          <div className={primaryAction ? 'pb-24' : ''}>
            {/* A) Top bar */}
            <div className="flex items-center justify-between gap-4 mb-6">
              <Link
                href="/customer/bookings"
                className="text-sm text-muted hover:text-text transition-colors"
              >
                ← Back to bookings
              </Link>
              <h1 className="text-lg font-semibold text-text">Track booking</h1>
              <BookingStatusBadge status={booking.status} />
            </div>

            {/* B) Header card */}
            <div className="mb-6">
              <BookingHeaderCard
                serviceName={booking.serviceName || 'Service'}
                proName={booking.proName || 'Pro'}
                categoryName={(fullBooking as { categoryName?: string }).categoryName}
                serviceDate={booking.serviceDate}
                serviceTime={booking.serviceTime}
                status={booking.status}
                proPhotoUrl={(fullBooking as { proPhotoUrl?: string | null }).proPhotoUrl}
              />
            </div>

            {/* C) Payment status (critical - show first) */}
            <section className="mb-6">
              <h2 className="text-base font-semibold text-text mb-4">Payment</h2>
              <div className="space-y-4">
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
                />
                {showConfirmSlot && (
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await fetch(`/api/bookings/${bookingId}/confirm`, { method: 'POST' });
                      if (res.ok) router.refresh();
                    }}
                    className="w-full flex h-11 items-center justify-center rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95"
                  >
                    Confirm completion
                  </button>
                )}
                <div className="mt-4">
                  <BookingRulesAccordion />
                </div>
              </div>
            </section>

            {/* D) Progress timeline */}
            <section className="mb-6">
              <h2 className="text-base font-semibold text-text mb-4">Progress</h2>
              <BookingProgressTimeline
                status={booking.status}
                createdAt={booking.createdAt}
                statusHistory={booking.statusHistory}
                acceptedAt={booking.acceptedAt}
                onTheWayAt={booking.onTheWayAt}
                enRouteAt={(booking as { enRouteAt?: string | null }).enRouteAt}
                arrivedAt={(booking as { arrivedAt?: string | null }).arrivedAt}
                startedAt={booking.startedAt}
                completedAt={booking.completedAt}
                paidAt={booking.paidAt}
              />
            </section>

            {/* E) Latest update card */}
            <section className="mb-6">
              <LatestUpdateCard
                status={status}
                timestamp={getLatestTimestamp(booking.status, booking)}
              />
            </section>

            {/* F) Need Help */}
            <section className="mb-6">
              <h2 className="text-base font-semibold text-text mb-4">Need Help</h2>
              <div className="rounded-2xl border border-black/5 p-4 space-y-2" style={{ backgroundColor: '#FFFFFF' }}>
                <div className="flex flex-wrap gap-2">
                  {[
                    { type: 'pro_late', label: 'Pro is late' },
                    { type: 'work_incomplete', label: 'Work incomplete' },
                    { type: 'wrong_service', label: 'Wrong service' },
                    { type: 'contact_support', label: 'Contact Support' },
                  ].map(({ type, label }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/bookings/${bookingId}/issues`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ issueType: type }),
                          });
                          if (res.ok) {
                            alert('Thanks for reporting. We\'ll look into it.');
                          }
                        } catch {
                          alert('Could not submit. Please try again.');
                        }
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-medium border border-black/10 bg-white hover:bg-black/[0.03] transition-colors"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* G) Service details (collapsible) */}
            {(hasAddressOrNotes || booking.id) && (
              <section className="mb-6">
                <h2 className="text-base font-semibold text-text mb-4">Service details</h2>
                <div className="rounded-2xl border border-black/5 bg-white overflow-hidden shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
                  <button
                    type="button"
                    onClick={() => setDetailsOpen(!detailsOpen)}
                    className="w-full flex items-center justify-between px-6 py-4 text-left text-sm font-medium text-text hover:bg-black/[0.02] transition-colors"
                  >
                    <span>Address, notes, booking ID</span>
                    <span className="text-muted">{detailsOpen ? '−' : '+'}</span>
                  </button>
                  {detailsOpen && (
                    <div className="px-6 pb-6 pt-0 space-y-3 text-sm text-muted border-t border-black/5">
                      {fullBooking.address && (
                        <div>
                          <span className="font-medium text-text">Address:</span> {fullBooking.address}
                        </div>
                      )}
                      {fullBooking.notes && (
                        <div>
                          <span className="font-medium text-text">Notes:</span> {fullBooking.notes}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text">Booking ID:</span>
                        <code className="text-xs bg-black/5 px-2 py-1 rounded font-mono">{booking.id}</code>
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

            {/* Events accordion (debug) */}
            <div className="mb-6">
              <BookingEventsAccordion bookingId={bookingId} />
            </div>

            {/* H) Actions */}
            <section className="mb-6">
              <h2 className="text-base font-semibold text-text mb-4">Actions</h2>
              <BookingActionsBar
                bookingId={bookingId}
                status={booking.status}
                primaryAction={primaryAction}
                proId={fullBooking.proId}
                serviceName={fullBooking.serviceName}
                address={fullBooking.address}
                notes={fullBooking.notes}
              />
            </section>

            {/* Sticky bottom bar for primary action (mobile) */}
            {primaryAction && (
              <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-black/5 bg-white/95 backdrop-blur-sm px-4 py-3 safe-area-pb sm:hidden">
                {primaryAction}
              </div>
            )}
          </div>
        );
      }}
    </TrackBookingRealtime>
  );
}
