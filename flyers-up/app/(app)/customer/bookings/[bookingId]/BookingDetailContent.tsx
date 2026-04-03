'use client';

import { useState, useCallback, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { TrackBookingRealtime, type TrackBookingData } from '@/components/bookings/TrackBookingRealtime';
import { deriveTimelineDisplayStatus, buildTimestampsFromBooking } from '@/components/jobs/jobStatus';
import { TrackBookingStatusHeader } from '@/components/bookings/customer/TrackBookingStatusHeader';
import { TrackBookingSummaryCard } from '@/components/bookings/customer/TrackBookingSummaryCard';
import { BookingProgressTracker } from '@/components/bookings/BookingProgressTracker';
import { MultiDayBookingProgressSection } from '@/components/bookings/MultiDayBookingProgressSection';
import { BookingProgressTimeline } from '@/components/bookings/customer/BookingProgressTimeline';
import { TrackBookingMessagingEntry } from '@/components/bookings/customer/TrackBookingMessagingEntry';
import { TrackBookingPaymentSummary } from '@/components/bookings/customer/TrackBookingPaymentSummary';
import { TrackBookingTrustSection } from '@/components/bookings/customer/TrackBookingTrustSection';
import { BookingActionsBar } from '@/components/bookings/customer/BookingActionsBar';
import { RescheduleModal } from '@/components/bookings/customer/RescheduleModal';
import { CancelBookingModal } from '@/components/bookings/customer/CancelBookingModal';
import { BookingRulesAccordion } from '@/components/booking/BookingRulesAccordion';
import { ArrivalVerificationCard } from '@/components/marketplace/ArrivalVerificationCard';
import { CancelDueToProDelayBanner } from '@/components/bookings/customer/CancelDueToProDelayBanner';
import { AddToCalendarButton } from '@/components/calendar/AddToCalendarButton';
import { isCalendarCommittedStatus } from '@/lib/calendar/committed-states';
import { InstantRebookCard } from '@/components/marketplace/InstantRebookCard';
import { JobCompletedFlyer } from '@/components/marketplace/JobCompletedFlyer';
import { bottomChrome } from '@/lib/layout/bottomChrome';
import { ProPendingReschedulePanel } from '@/components/bookings/ProPendingReschedulePanel';
import { calendarWallTimesWithPending, pendingRescheduleLine } from '@/lib/bookings/pending-reschedule';
import { isCustomerMoneyFullySettled } from '@/lib/bookings/customer-payment-settled';
import {
  shouldShowCustomerConfirmCompletionCta,
  shouldShowCustomerDepositPayCta,
  shouldShowCustomerPayRemainingCta,
} from '@/lib/bookings/customer-booking-actions';

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
  refundStatus?: string | null;
  refundedTotalCents?: number | null;
  amountDeposit?: number | null;
  amountRemaining?: number | null;
  /** Confirmed successful payments only; same as receipt `totalPaidCents` when from server API. */
  paidAmountCents?: number | null;
  amountTotal?: number | null;
  /** Pro service subtotal in cents when stored on the booking */
  amountSubtotalCents?: number | null;
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
  bookingTimezone?: string | null;
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
  noShowEligibleAt?: string | null;
  scheduledStartAt?: string | null;
  gracePeriodMinutes?: number;
  pendingReschedule?: import('@/lib/bookings/pending-reschedule').PendingRescheduleInfo | null;
  /** True when a booking_reviews row exists for this booking (customer). */
  hasCustomerReview?: boolean;
  customerConfirmed?: boolean;
  confirmedByCustomerAt?: string | null;
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
    platformFeeCents: b.platformFeeCents ?? null,
    refundStatus: b.refundStatus ?? null,
    refundedTotalCents: b.refundedTotalCents ?? null,
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
    bookingTimezone: b.bookingTimezone ?? null,
    address: b.address,
    pendingReschedule: b.pendingReschedule ?? null,
    hasCustomerReview: b.hasCustomerReview ?? false,
    customerConfirmed: b.customerConfirmed,
    confirmedByCustomerAt: b.confirmedByCustomerAt ?? null,
  };
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
  const s = deriveTimelineDisplayStatus(booking.status, {
    paidAt: booking.paidAt,
    paidDepositAt: booking.paidDepositAt,
    fullyPaidAt: booking.fullyPaidAt,
  });
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
  const pathname = usePathname();
  const rescheduleViewerRole: 'pro' | 'customer' = pathname?.includes('/pro/') ? 'pro' : 'customer';
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [confirmingCompletion, setConfirmingCompletion] = useState(false);

  const fetchBooking = useCallback(async (): Promise<TrackBookingData | null> => {
    try {
      const res = await fetch(`/api/customer/bookings/${bookingId}`, {
        cache: 'no-store',
        credentials: 'include',
      });
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
        const status = deriveTimelineDisplayStatus(booking.status, {
          paidAt: booking.paidAt,
          paidDepositAt: booking.paidDepositAt,
          fullyPaidAt: booking.fullyPaidAt,
        });
        const fullBooking = { ...initialBooking, ...booking } as BookingDetailData & TrackBookingData;
        const hasAddressOrNotes = !!(fullBooking.address || fullBooking.notes);
        const needsScopeLock =
          (fullBooking as { job_request_id?: string | null }).job_request_id &&
          !(fullBooking as { scope_confirmed_at?: string | null }).scope_confirmed_at;
        const needsDeposit =
          !needsScopeLock &&
          shouldShowCustomerDepositPayCta({
            status: booking.status,
            paidDepositAt: booking.paidDepositAt,
            paidAt: booking.paidAt,
            paymentStatus: booking.paymentStatus,
          });

        const remainingDueCents = Math.max(0, Math.round(Number(booking.amountRemaining ?? 0)));
        const moneySettled = isCustomerMoneyFullySettled({
          finalPaymentStatus: booking.finalPaymentStatus,
          paidRemainingAt: booking.paidRemainingAt,
          fullyPaidAt: booking.fullyPaidAt,
          amountRemaining: booking.amountRemaining,
        });
        const customerConfirmed = fullBooking.customerConfirmed === true;
        const showPayRemaining = shouldShowCustomerPayRemainingCta({
          status: booking.status,
          remainingDueCents,
          finalPaymentStatus: booking.finalPaymentStatus,
          paidRemainingAt: booking.paidRemainingAt,
          fullyPaidAt: booking.fullyPaidAt,
          amountRemaining: booking.amountRemaining,
        });
        const showConfirmCompletion = shouldShowCustomerConfirmCompletionCta({
          status: booking.status,
          remainingDueCents,
          moneyFullySettled: moneySettled,
          customerConfirmed,
        });

        const checkoutFinalHref = `/bookings/${bookingId}/checkout?phase=final`;

        const confirmCompletionButtonClass =
          'w-full flex h-11 items-center justify-center rounded-full text-sm font-semibold text-black bg-[#B2FBA5] hover:brightness-95 disabled:opacity-60';

        const payRemainingLinkClass =
          'flex h-11 w-full items-center justify-center rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95 transition-all';

        let primaryAction: ReactNode = null;
        if (needsScopeLock) {
          primaryAction = (
            <Link
              href={`/customer/bookings/${bookingId}/scope-lock`}
              className="flex h-11 w-full items-center justify-center rounded-full text-sm font-semibold text-black bg-[#B2FBA5] hover:brightness-95 transition-all"
            >
              Confirm Scope (required before deposit)
            </Link>
          );
        } else if (needsDeposit) {
          primaryAction = (
            <Link
              href={`/customer/bookings/${bookingId}/deposit`}
              className="flex h-11 w-full items-center justify-center rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95 transition-all"
            >
              Pay deposit {booking.amountDeposit != null ? `$${(booking.amountDeposit / 100).toFixed(2)}` : ''}
            </Link>
          );
        } else if (showPayRemaining) {
          primaryAction = (
            <Link href={checkoutFinalHref} className={payRemainingLinkClass}>
              {remainingDueCents > 0
                ? `Release remaining payment${booking.amountRemaining != null ? ` ($${(booking.amountRemaining / 100).toFixed(2)})` : ''}`
                : 'Release remaining payment'}
            </Link>
          );
        } else if (showConfirmCompletion) {
          primaryAction = (
            <button
              type="button"
              disabled={confirmingCompletion}
              onClick={async () => {
                setConfirmingCompletion(true);
                try {
                  const res = await fetch(`/api/bookings/${bookingId}/confirm`, {
                    method: 'POST',
                    credentials: 'include',
                  });
                  if (res.ok) router.refresh();
                } finally {
                  setConfirmingCompletion(false);
                }
              }}
              className={confirmCompletionButtonClass}
            >
              {confirmingCompletion ? 'Confirming…' : 'Confirm job completion'}
            </button>
          );
        }

        const paymentSummaryPrimary =
          showPayRemaining ? (
            <div>
              <p className="text-xs text-muted mb-2">Pay the remaining balance — funds stay protected until you confirm the job.</p>
              <Link href={checkoutFinalHref} className={payRemainingLinkClass}>
                Release remaining payment
              </Link>
            </div>
          ) : showConfirmCompletion ? (
            <div>
              <p className="text-xs text-muted mb-2">Confirm the job is complete to release payout to your pro.</p>
              <button
                type="button"
                disabled={confirmingCompletion}
                onClick={async () => {
                  setConfirmingCompletion(true);
                  try {
                    const res = await fetch(`/api/bookings/${bookingId}/confirm`, {
                    method: 'POST',
                    credentials: 'include',
                  });
                    if (res.ok) router.refresh();
                  } finally {
                    setConfirmingCompletion(false);
                  }
                }}
                className={confirmCompletionButtonClass}
              >
                {confirmingCompletion ? 'Confirming…' : 'Confirm job completion'}
              </button>
            </div>
          ) : undefined;

        return (
          <div className={primaryAction ? bottomChrome.pbStickyBarOnly : ''} data-role="customer">
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

            {/* Progress tracker */}
            <section className="mb-5">
              <BookingProgressTracker
                status={booking.status}
                paidAt={booking.paidAt}
                paidDepositAt={booking.paidDepositAt}
                fullyPaidAt={booking.fullyPaidAt}
              />
            </section>

            <MultiDayBookingProgressSection bookingId={bookingId} mode="customer" />

            {/* 1. Status header */}
            <section className="mb-5">
              <TrackBookingStatusHeader
                status={booking.status}
                lastUpdatedAt={getLastUpdatedTimestamp(booking)}
              />
            </section>

            {/* 1b. Cancel due to pro delay - when pro has not arrived within grace period */}
            <section className="mb-5">
              <CancelDueToProDelayBanner
                bookingId={bookingId}
                noShowEligibleAt={(fullBooking as { noShowEligibleAt?: string | null }).noShowEligibleAt ?? null}
                arrivedAt={(fullBooking as { arrivedAt?: string | null }).arrivedAt ?? null}
                status={booking.status}
              />
            </section>

            {/* 2. Booking summary card */}
            <section className="mb-5">
              {fullBooking.pendingReschedule && (
                <div className="mb-3">
                  <ProPendingReschedulePanel
                    bookingId={bookingId}
                    pending={fullBooking.pendingReschedule}
                    viewerRole={rescheduleViewerRole}
                    onResolved={() => router.refresh()}
                  />
                </div>
              )}
              {booking.serviceDate &&
                booking.serviceTime &&
                isCalendarCommittedStatus(booking.status) && (
                  <div className="mb-3">
                    <AddToCalendarButton
                      bookingId={bookingId}
                      booking={{
                        ...calendarWallTimesWithPending(
                          booking.serviceDate,
                          booking.serviceTime,
                          fullBooking.pendingReschedule ?? null
                        ),
                        serviceTitle: (booking.serviceName || 'Service') + (fullBooking.pendingReschedule ? ' (requested time)' : ''),
                        address: fullBooking.address,
                        bookingTimezone: fullBooking.bookingTimezone ?? undefined,
                      }}
                    />
                  </div>
                )}
              <TrackBookingSummaryCard
                proName={booking.proName || 'Pro'}
                proPhotoUrl={(fullBooking as { proPhotoUrl?: string | null }).proPhotoUrl}
                serviceName={booking.serviceName || 'Service'}
                categoryName={(fullBooking as { categoryName?: string }).categoryName}
                serviceDate={booking.serviceDate}
                serviceTime={booking.serviceTime}
                pendingRescheduleSummary={
                  fullBooking.pendingReschedule
                    ? pendingRescheduleLine(fullBooking.pendingReschedule)
                    : null
                }
                address={fullBooking.address}
                scopeSummary={fullBooking.notes}
              />
            </section>

            {/* 3. Progress / timeline */}
            <section className="mb-5">
              <h2 className="text-sm font-medium text-[#6A6A6A] dark:text-[#A1A8B3] mb-3">Progress</h2>
              <BookingProgressTimeline
                status={booking.status}
                bookingTimezone={fullBooking.bookingTimezone ?? booking.bookingTimezone}
                createdAt={booking.createdAt}
                statusHistory={booking.statusHistory}
                acceptedAt={booking.acceptedAt}
                onTheWayAt={booking.onTheWayAt}
                enRouteAt={(booking as { enRouteAt?: string | null }).enRouteAt}
                arrivedAt={(booking as { arrivedAt?: string | null }).arrivedAt}
                startedAt={booking.startedAt}
                completedAt={booking.completedAt}
                paidAt={booking.paidAt}
                paidDepositAt={booking.paidDepositAt}
                fullyPaidAt={booking.fullyPaidAt}
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
                bookingTimezone={fullBooking.bookingTimezone ?? booking.bookingTimezone}
                status={booking.status}
                paymentStatus={booking.paymentStatus}
                finalPaymentStatus={booking.finalPaymentStatus}
                paymentDueAt={booking.paymentDueAt}
                amountDeposit={booking.amountDeposit}
                amountRemaining={booking.amountRemaining}
                amountTotal={booking.amountTotal}
                serviceSubtotalCents={fullBooking.amountSubtotalCents ?? null}
                paidAt={booking.paidAt}
                paidDepositAt={booking.paidDepositAt}
                paidRemainingAt={booking.paidRemainingAt}
                fullyPaidAt={booking.fullyPaidAt}
                refundStatus={fullBooking.refundStatus ?? null}
                refundedTotalCents={fullBooking.refundedTotalCents ?? null}
                serviceName={fullBooking.serviceName}
                proName={fullBooking.proName}
                address={fullBooking.address}
                serviceDate={booking.serviceDate}
                serviceTime={booking.serviceTime}
                primaryAction={paymentSummaryPrimary}
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
                hasCustomerReview={fullBooking.hasCustomerReview ?? false}
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
              <div
                className={`fixed left-0 right-0 z-40 border-t border-black/5 dark:border-white/10 bg-white/95 dark:bg-[#171A20]/95 backdrop-blur-sm px-4 py-3 sm:hidden ${bottomChrome.fixedAboveNav}`}
              >
                {primaryAction}
              </div>
            )}
          </div>
        );
      }}
    </TrackBookingRealtime>
  );
}
