'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TrackBookingRealtime, type TrackBookingData } from '@/components/bookings/TrackBookingRealtime';
import { mapDbStatusToTimeline, buildTimestampsFromBooking } from '@/components/jobs/jobStatus';
import { TrackBookingStatusHeader } from '@/components/bookings/customer/TrackBookingStatusHeader';
import { TrackBookingSummaryCard } from '@/components/bookings/customer/TrackBookingSummaryCard';
import { BookingProgressTimeline } from '@/components/bookings/customer/BookingProgressTimeline';
import { TrackBookingMessagingEntry } from '@/components/bookings/customer/TrackBookingMessagingEntry';
import { TrackBookingPaymentSummary } from '@/components/bookings/customer/TrackBookingPaymentSummary';
import { TrackBookingTrustSection } from '@/components/bookings/customer/TrackBookingTrustSection';
import { BookingActionsBar } from '@/components/bookings/customer/BookingActionsBar';
import { RescheduleModal } from '@/components/bookings/customer/RescheduleModal';
import { CancelBookingModal } from '@/components/bookings/customer/CancelBookingModal';
import { BookingRulesAccordion } from '@/components/booking/BookingRulesAccordion';
import { ArrivalVerificationCard } from '@/components/marketplace/ArrivalVerificationCard';
import { InstantRebookCard } from '@/components/marketplace/InstantRebookCard';
import { JobCompletedFlyer } from '@/components/marketplace/JobCompletedFlyer';

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
  arrival?: {
    arrivalTimestamp: string;
    arrivalPhotoUrl?: string | null;
    locationVerified: boolean;
  } | null;
  completion?: {
    id: string;
    afterPhotoUrls: string[];
    completionNote?: string | null;
    completedAt: string;
  } | null;
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
  const needsScopeLock =
    (booking as { job_request_id?: string | null }).job_request_id &&
    !(booking as { scope_confirmed_at?: string | null }).scope_confirmed_at;
  const needsDeposit =
    !needsScopeLock &&
    ['payment_required', 'accepted', 'accepted_pending_payment', 'awaiting_deposit_payment'].includes(booking.status) &&
    !booking.paidAt &&
    booking.paymentDueAt &&
    new Date(booking.paymentDueAt).getTime() > Date.now();
  const needsRemaining =
    ['completed_pending_payment', 'awaiting_payment', 'awaiting_remaining_payment'].includes(booking.status) &&
    !booking.paidRemainingAt &&
    !booking.fullyPaidAt;

  if (needsScopeLock) {
    return (
      <Link
        href={`/customer/bookings/${bookingId}/scope-lock`}
        className="flex h-11 w-full items-center justify-center rounded-full text-sm font-semibold text-black bg-[#B2FBA5] hover:brightness-95 transition-all"
      >
        Confirm Scope (required before deposit)
      </Link>
    );
  }
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
        href={`/customer/bookings/${bookingId}/complete`}
        className="flex h-11 w-full items-center justify-center rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95 transition-all"
      >
        Pay remaining {booking.amountRemaining != null ? `$${(booking.amountRemaining / 100).toFixed(2)}` : ''}
      </Link>
    );
  }
  return null;
}

function getLastUpdatedTimestamp(booking: TrackBookingData): string | null {
  const ts = buildTimestampsFromBooking(
    booking.createdAt,
    booking.statusHistory,
    {
      acceptedAt: booking.acceptedAt,
      onTheWayAt: booking.onTheWayAt ?? booking.enRouteAt,
      enRouteAt: booking.enRouteAt,
      startedAt: booking.startedAt,
      completedAt: booking.completedAt,
      paidAt: booking.paidAt,
    }
  );
  const s = mapDbStatusToTimeline(booking.status);
  return ts[s] ?? null;
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
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

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
        const fullBooking = { ...initialBooking, ...booking } as BookingDetailData & TrackBookingData;
        const hasAddressOrNotes = !!(fullBooking.address || fullBooking.notes);
        const primaryAction = getPrimaryAction(fullBooking, bookingId);
        const showConfirmSlot = booking.status === 'awaiting_customer_confirmation';

        return (
          <div className={primaryAction ? 'pb-24' : ''} data-role="customer">
            {/* Back + page title */}
            <div className="flex items-center justify-between gap-4 mb-6">
              <Link
                href="/customer/bookings"
                className="text-sm text-[#6A6A6A] dark:text-[#A1A8B3] hover:text-[#111111] dark:hover:text-[#F5F7FA] transition-colors"
              >
                ← Back to bookings
              </Link>
              <h1 className="text-lg font-semibold text-[#111111] dark:text-[#F5F7FA]">Track booking</h1>
            </div>

            {/* 1. Status header */}
            <section className="mb-5">
              <TrackBookingStatusHeader
                status={booking.status}
                lastUpdatedAt={getLastUpdatedTimestamp(booking)}
              />
            </section>

            {/* 2. Booking summary card */}
            <section className="mb-5">
              <TrackBookingSummaryCard
                proName={booking.proName || 'Pro'}
                proPhotoUrl={(fullBooking as { proPhotoUrl?: string | null }).proPhotoUrl}
                serviceName={booking.serviceName || 'Service'}
                categoryName={(fullBooking as { categoryName?: string }).categoryName}
                serviceDate={booking.serviceDate}
                serviceTime={booking.serviceTime}
                address={fullBooking.address}
                scopeSummary={fullBooking.notes}
              />
            </section>

            {/* 3. Progress / timeline */}
            <section className="mb-5">
              <h2 className="text-sm font-medium text-[#6A6A6A] dark:text-[#A1A8B3] mb-3">Progress</h2>
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

            {/* 4. Messaging entry */}
            <section className="mb-5">
              <TrackBookingMessagingEntry bookingId={bookingId} />
            </section>

            {/* 5. Payment summary */}
            <section className="mb-5">
              <TrackBookingPaymentSummary
                bookingId={bookingId}
                status={booking.status}
                paymentStatus={booking.paymentStatus}
                paymentDueAt={booking.paymentDueAt}
                amountDeposit={booking.amountDeposit}
                amountRemaining={booking.amountRemaining}
                amountTotal={booking.amountTotal}
                paidAt={booking.paidAt}
                fullyPaidAt={booking.fullyPaidAt}
                primaryAction={
                  showConfirmSlot ? (
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
                  ) : undefined
                }
              />
            </section>

            {/* 6. Trust / support */}
            <section className="mb-5">
              <TrackBookingTrustSection bookingId={bookingId} />
            </section>

            {/* 7. Action area */}
            <section className="mb-6">
              <h2 className="text-sm font-medium text-[#6A6A6A] dark:text-[#A1A8B3] mb-3">Actions</h2>
              <BookingActionsBar
                bookingId={bookingId}
                status={booking.status}
                primaryAction={primaryAction}
                proId={fullBooking.proId}
                serviceName={fullBooking.serviceName}
                address={fullBooking.address}
                notes={fullBooking.notes}
                onRescheduleClick={() => setRescheduleOpen(true)}
                onCancelClick={() => setCancelOpen(true)}
              />
            </section>

            {/* Reschedule modal */}
            <RescheduleModal
              open={rescheduleOpen}
              onClose={() => setRescheduleOpen(false)}
              bookingId={bookingId}
              currentDate={booking.serviceDate}
              currentTime={booking.serviceTime}
              onSuccess={() => {
                setRescheduleOpen(false);
                router.refresh();
              }}
            />

            {/* Cancel modal */}
            <CancelBookingModal
              open={cancelOpen}
              onClose={() => setCancelOpen(false)}
              bookingId={bookingId}
              amountDeposit={fullBooking.amountDeposit}
              onSuccess={() => {
                setCancelOpen(false);
                router.refresh();
              }}
            />

            {/* Arrival verification (when Pro has arrived) */}
            {Boolean(fullBooking.arrival || (booking as { arrival?: unknown }).arrival) && (
              <section className="mb-5">
                <ArrivalVerificationCard
                  arrivalTimestamp={
                    (fullBooking.arrival ?? (booking as { arrival?: { arrivalTimestamp: string } }).arrival)
                      ?.arrivalTimestamp ?? ''
                  }
                  locationVerified={
                    (fullBooking.arrival ?? (booking as { arrival?: { locationVerified: boolean } }).arrival)
                      ?.locationVerified ?? false
                  }
                  arrivalPhotoUrl={
                    (fullBooking.arrival ?? (booking as { arrival?: { arrivalPhotoUrl?: string | null } }).arrival)
                      ?.arrivalPhotoUrl ?? undefined
                  }
                />
              </section>
            )}

            {/* Service details (collapsible) */}
            {(hasAddressOrNotes || booking.id) && (
              <section className="mb-5">
                <h2 className="text-sm font-medium text-[#6A6A6A] dark:text-[#A1A8B3] mb-3">Service details</h2>
                <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] overflow-hidden shadow-sm">
                  <button
                    type="button"
                    onClick={() => setDetailsOpen(!detailsOpen)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-medium text-[#111111] dark:text-[#F5F7FA] hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <span>Address, notes, booking ID</span>
                    <span className="text-[#6A6A6A] dark:text-[#A1A8B3]">{detailsOpen ? '−' : '+'}</span>
                  </button>
                  {detailsOpen && (
                    <div className="px-5 pb-5 pt-0 space-y-3 text-sm text-[#6A6A6A] dark:text-[#A1A8B3] border-t border-black/5 dark:border-white/10">
                      {fullBooking.address && (
                        <div>
                          <span className="font-medium text-[#111111] dark:text-[#F5F7FA]">Address:</span>{' '}
                          {fullBooking.address}
                        </div>
                      )}
                      {fullBooking.notes && (
                        <div>
                          <span className="font-medium text-[#111111] dark:text-[#F5F7FA]">Notes:</span>{' '}
                          {fullBooking.notes}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#111111] dark:text-[#F5F7FA]">Booking ID:</span>
                        <code className="text-xs bg-black/5 dark:bg-white/5 px-2 py-1 rounded font-mono">
                          {booking.id}
                        </code>
                        <button
                          type="button"
                          onClick={() => navigator.clipboard?.writeText(booking.id)}
                          className="text-xs text-[#058954] hover:underline"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Booking rules accordion */}
            <section className="mb-5">
              <BookingRulesAccordion />
            </section>

            {/* Instant Rebook + Job Completed Flyer (when completed) */}
            {(status === 'COMPLETED' || status === 'PAID') &&
              fullBooking.proId &&
              fullBooking.proName &&
              fullBooking.serviceName && (
                <section className="mb-6 space-y-4">
                  <InstantRebookCard
                    proName={fullBooking.proName}
                    proId={fullBooking.proId}
                    lastServiceType={fullBooking.serviceName}
                    lastDate={
                      fullBooking.serviceDate && fullBooking.serviceTime
                        ? `${fullBooking.serviceDate} ${fullBooking.serviceTime}`
                        : fullBooking.completedAt ?? ''
                    }
                    rating={5}
                    bookingId={bookingId}
                  />
                  {fullBooking.completion && fullBooking.completion.afterPhotoUrls.length >= 2 && (
                    <JobCompletedFlyer
                      proName={fullBooking.proName}
                      serviceType={fullBooking.serviceName}
                      neighborhood={fullBooking.address ?? 'Local'}
                      rating={5}
                      beforePhotoUrls={[]}
                      afterPhotoUrls={fullBooking.completion.afterPhotoUrls}
                      completionId={fullBooking.completion.id}
                    />
                  )}
                </section>
              )}

            {/* Sticky bottom bar for primary action (mobile) */}
            {primaryAction && (
              <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-black/5 dark:border-white/10 bg-white/95 dark:bg-[#171A20]/95 backdrop-blur-sm px-4 py-3 safe-area-pb sm:hidden">
                {primaryAction}
              </div>
            )}
          </div>
        );
      }}
    </TrackBookingRealtime>
  );
}
