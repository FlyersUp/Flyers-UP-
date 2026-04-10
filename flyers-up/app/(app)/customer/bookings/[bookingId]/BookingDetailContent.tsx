'use client';

import { useState, useCallback, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { TrackBookingRealtime, type TrackBookingData } from '@/components/bookings/TrackBookingRealtime';
import { deriveTimelineDisplayStatus } from '@/components/jobs/jobStatus';
import { MultiDayBookingProgressSection } from '@/components/bookings/MultiDayBookingProgressSection';
import { BookingProgressTimeline } from '@/components/bookings/customer/BookingProgressTimeline';
import { TrackBookingMessagingEntry } from '@/components/bookings/customer/TrackBookingMessagingEntry';
import { TrackBookingPaymentSummary } from '@/components/bookings/customer/TrackBookingPaymentSummary';
import { RescheduleModal } from '@/components/bookings/customer/RescheduleModal';
import { CancelBookingModal } from '@/components/bookings/customer/CancelBookingModal';
import { BookingRulesAccordion } from '@/components/booking/BookingRulesAccordion';
import { ArrivalVerificationCard } from '@/components/marketplace/ArrivalVerificationCard';
import { CancelDueToProDelayBanner } from '@/components/bookings/customer/CancelDueToProDelayBanner';
import { AddToCalendarButton } from '@/components/calendar/AddToCalendarButton';
import { isCalendarCommittedStatus } from '@/lib/calendar/committed-states';
import { bottomChrome } from '@/lib/layout/bottomChrome';
import { ProPendingReschedulePanel } from '@/components/bookings/ProPendingReschedulePanel';
import { calendarWallTimesWithPending, pendingRescheduleLine } from '@/lib/bookings/pending-reschedule';
import { isCustomerMoneyFullySettled } from '@/lib/bookings/customer-payment-settled';
import {
  shouldShowCustomerConfirmCompletionCta,
  shouldShowCustomerDepositPayCta,
} from '@/lib/bookings/customer-booking-actions';
import { normalizeCustomerPaymentCardNow } from '@/lib/bookings/customer-payment-card-normalize';
import { finalPaymentReceiptNoteFromKind } from '@/lib/bookings/customer-final-payment-receipt-note';
import { BookingPaymentStatusCard } from '@/components/bookings/customer/BookingPaymentStatusCard';
import { PaymentHeldCustomerCard, PaymentHoldWhyCallout } from '@/components/payments/payment-held';
import { buildPaymentHeldUiStateFromBooking } from '@/lib/bookings/payment-held-ui-state';
import { BookingDetailHeader } from '@/components/bookings/customer/booking-detail/BookingDetailHeader';
import { BookingStepTracker } from '@/components/bookings/customer/booking-detail/BookingStepTracker';
import { BookingProviderCard } from '@/components/bookings/customer/booking-detail/BookingProviderCard';
import { BookingCompletionHighlightCard } from '@/components/bookings/customer/booking-detail/BookingCompletionHighlightCard';
import { BookingTimelineCard } from '@/components/bookings/customer/booking-detail/BookingTimelineCard';
import { BookingProtectionCard } from '@/components/bookings/customer/booking-detail/BookingProtectionCard';
import { BookingRebookCard } from '@/components/bookings/customer/booking-detail/BookingRebookCard';
import { BookingSafetyLinks } from '@/components/bookings/customer/booking-detail/BookingSafetyLinks';
import { BookingDetailActionBar } from '@/components/bookings/customer/booking-detail/BookingDetailActionBar';
import { cn } from '@/lib/cn';

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
  paidAmountCents?: number | null;
  amountTotal?: number | null;
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
  hasCustomerReview?: boolean;
  customerConfirmed?: boolean;
  confirmedByCustomerAt?: string | null;
  proUserId?: string | null;
  paymentLifecycleStatus?: string | null;
  customerReviewDeadlineAt?: string | null;
  payoutReleased?: boolean | null;
  requiresAdminReview?: boolean | null;
  payoutHoldReason?: string | null;
  suspiciousCompletion?: boolean | null;
  suspiciousCompletionReason?: string | null;
  adminHold?: boolean | null;
  /** Coalesced final / remaining Stripe PaymentIntent id for accurate payment-card normalization. */
  finalPaymentIntentId?: string | null;
  finalPaymentIntentStripeStatus?: string | null;
  finalPaymentIntentStripeLiveChecked?: boolean;
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
    remainingDueAt: b.remainingDueAt ?? null,
    autoConfirmAt: b.autoConfirmAt ?? null,
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
    paymentLifecycleStatus: b.paymentLifecycleStatus ?? null,
    customerReviewDeadlineAt: b.customerReviewDeadlineAt ?? null,
    payoutReleased: b.payoutReleased ?? null,
    requiresAdminReview: b.requiresAdminReview ?? null,
    payoutHoldReason: b.payoutHoldReason ?? null,
    suspiciousCompletion: b.suspiciousCompletion ?? null,
    suspiciousCompletionReason: b.suspiciousCompletionReason ?? null,
    adminHold: b.adminHold ?? null,
    finalPaymentIntentId: b.finalPaymentIntentId ?? null,
    finalPaymentIntentStripeStatus: b.finalPaymentIntentStripeStatus ?? null,
    finalPaymentIntentStripeLiveChecked: b.finalPaymentIntentStripeLiveChecked ?? undefined,
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
    <TrackBookingRealtime bookingId={bookingId} initialBooking={trackData} fetchBooking={fetchBooking}>
      {(booking) => {
        const timelineKey = deriveTimelineDisplayStatus(booking.status, {
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

        const remainingPaymentInput = {
          status: fullBooking.status ?? booking.status,
          paymentStatus: booking.paymentStatus ?? fullBooking.paymentStatus,
          finalPaymentStatus: booking.finalPaymentStatus ?? fullBooking.finalPaymentStatus,
          paymentLifecycleStatus: fullBooking.paymentLifecycleStatus ?? null,
          paidDepositAt: booking.paidDepositAt ?? fullBooking.paidDepositAt,
          paidAt: booking.paidAt ?? fullBooking.paidAt,
          paidRemainingAt: booking.paidRemainingAt ?? fullBooking.paidRemainingAt,
          fullyPaidAt: booking.fullyPaidAt ?? fullBooking.fullyPaidAt,
          completedAt: fullBooking.completedAt ?? booking.completedAt,
          remainingDueAt: fullBooking.remainingDueAt ?? booking.remainingDueAt,
          customerReviewDeadlineAt: fullBooking.customerReviewDeadlineAt ?? null,
          amountRemaining: booking.amountRemaining ?? fullBooking.amountRemaining,
          finalPaymentIntentId: fullBooking.finalPaymentIntentId ?? null,
          finalPaymentIntentStripeStatus: fullBooking.finalPaymentIntentStripeStatus ?? null,
          finalPaymentIntentStripeLiveChecked: fullBooking.finalPaymentIntentStripeLiveChecked === true,
        };
        const paymentNormalized = normalizeCustomerPaymentCardNow(remainingPaymentInput);

        const customerConfirmed = fullBooking.customerConfirmed === true;
        const showConfirmCompletion = shouldShowCustomerConfirmCompletionCta({
          status: booking.status,
          remainingDueCents,
          moneyFullySettled: moneySettled,
          customerConfirmed,
        });

        const confirmCompletionButtonClass =
          'w-full flex h-12 items-center justify-center rounded-full text-sm font-semibold text-black bg-[#B2FBA5] hover:brightness-95 disabled:opacity-60';

        let primaryAction: ReactNode = null;
        if (needsScopeLock) {
          primaryAction = (
            <Link
              href={`/customer/bookings/${bookingId}/scope-lock`}
              className="flex h-12 w-full items-center justify-center rounded-full text-sm font-semibold text-black bg-[#B2FBA5] hover:brightness-95 transition-all"
            >
              Confirm scope (required before deposit)
            </Link>
          );
        } else if (needsDeposit) {
          primaryAction = (
            <Link
              href={`/customer/bookings/${bookingId}/deposit`}
              className="flex h-12 w-full items-center justify-center rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95 transition-all"
            >
              Pay deposit {booking.amountDeposit != null ? `$${(booking.amountDeposit / 100).toFixed(2)}` : ''}
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

        const finalPaymentNote = finalPaymentReceiptNoteFromKind(paymentNormalized.kind);

        const showCompletionHighlight =
          !!fullBooking.completion && (timelineKey === 'COMPLETED' || timelineKey === 'PAID');

        const showRebookStrip =
          (timelineKey === 'COMPLETED' || timelineKey === 'PAID') &&
          fullBooking.proId &&
          fullBooking.proName;

        const firstAfterPhoto = fullBooking.completion?.afterPhotoUrls?.[0] ?? null;

        const paymentHeldCustomerState = buildPaymentHeldUiStateFromBooking(
          'customer',
          {
            payoutReleased: fullBooking.payoutReleased ?? null,
            paymentLifecycleStatus: fullBooking.paymentLifecycleStatus ?? null,
            requiresAdminReview: fullBooking.requiresAdminReview ?? null,
            payoutHoldReason: fullBooking.payoutHoldReason ?? null,
            suspiciousCompletion: fullBooking.suspiciousCompletion ?? null,
            suspiciousCompletionReason: fullBooking.suspiciousCompletionReason ?? null,
            adminHold: fullBooking.adminHold ?? null,
          },
          {
            deposit: fullBooking.paidDepositAt ?? fullBooking.paidAt ?? null,
            completed: fullBooking.completedAt ?? null,
          }
        );

        const actionBar = (
          <BookingDetailActionBar
            bookingId={bookingId}
            status={booking.status}
            hasCustomerReview={fullBooking.hasCustomerReview ?? false}
            primaryAction={primaryAction}
            onRescheduleClick={() => setRescheduleOpen(true)}
            onCancelClick={() => setCancelOpen(true)}
          />
        );

        return (
          <div
            className={cn(
              'min-w-0 max-w-lg mx-auto px-4 md:px-6 py-5 pb-6',
              bottomChrome.pbStickyBarOnly,
              'bg-[#F5F4F1] dark:bg-[#0c0e12] min-h-screen'
            )}
            data-role="customer"
          >
            <BookingDetailHeader />

            <section className="mb-4">
              <BookingStepTracker
                status={booking.status}
                paidAt={booking.paidAt}
                paidDepositAt={booking.paidDepositAt}
                fullyPaidAt={booking.fullyPaidAt}
              />
            </section>

            <MultiDayBookingProgressSection bookingId={bookingId} mode="customer" />

            <section className="mb-3">
              <CancelDueToProDelayBanner
                bookingId={bookingId}
                noShowEligibleAt={(fullBooking as { noShowEligibleAt?: string | null }).noShowEligibleAt ?? null}
                arrivedAt={(fullBooking as { arrivedAt?: string | null }).arrivedAt ?? null}
                status={booking.status}
              />
            </section>

            {fullBooking.pendingReschedule && (
              <section className="mb-4">
                <ProPendingReschedulePanel
                  bookingId={bookingId}
                  pending={fullBooking.pendingReschedule}
                  viewerRole={rescheduleViewerRole}
                  onResolved={() => router.refresh()}
                />
              </section>
            )}

            {paymentNormalized.kind !== 'none' ? (
              <section
                className={cn(
                  'mb-4',
                  paymentNormalized.kind === 'scheduled' &&
                    'rounded-2xl ring-2 ring-amber-200/55 dark:ring-amber-700/40 ring-offset-2 ring-offset-[#F5F4F1] dark:ring-offset-[#0c0e12]'
                )}
              >
                <BookingPaymentStatusCard
                  bookingId={bookingId}
                  paymentInput={remainingPaymentInput}
                  bookingTimezone={fullBooking.bookingTimezone ?? booking.bookingTimezone ?? null}
                />
              </section>
            ) : null}

            <section className="mb-4">
              <BookingProviderCard
                proName={booking.proName || 'Pro'}
                proPhotoUrl={(fullBooking as { proPhotoUrl?: string | null }).proPhotoUrl}
                serviceName={booking.serviceName || 'Service'}
                categoryName={(fullBooking as { categoryName?: string }).categoryName ?? null}
                serviceDate={booking.serviceDate}
                serviceTime={booking.serviceTime}
                address={fullBooking.address}
                pendingRescheduleSummary={
                  fullBooking.pendingReschedule ? pendingRescheduleLine(fullBooking.pendingReschedule) : null
                }
              />
              {booking.serviceDate &&
                booking.serviceTime &&
                isCalendarCommittedStatus(booking.status) && (
                  <div className="mt-2 flex justify-end">
                    <AddToCalendarButton
                      bookingId={bookingId}
                      booking={{
                        ...calendarWallTimesWithPending(
                          booking.serviceDate,
                          booking.serviceTime,
                          fullBooking.pendingReschedule ?? null
                        ),
                        serviceTitle:
                          (booking.serviceName || 'Service') +
                          (fullBooking.pendingReschedule ? ' (requested time)' : ''),
                        address: fullBooking.address,
                        bookingTimezone: fullBooking.bookingTimezone ?? undefined,
                      }}
                    />
                  </div>
                )}
            </section>

            {Boolean(fullBooking.arrival || (booking as { arrival?: unknown }).arrival) && (
              <section className="mb-4">
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

            {showCompletionHighlight && fullBooking.completion && fullBooking.proName && (
              <section className="mb-4">
                <BookingCompletionHighlightCard
                  proName={fullBooking.proName}
                  serviceName={fullBooking.serviceName || 'Service'}
                  contextLine={fullBooking.address?.split(',')[0]?.trim() ?? null}
                  completionNote={fullBooking.completion.completionNote ?? null}
                  afterPhotoUrl={firstAfterPhoto}
                />
              </section>
            )}

            <section className="mb-4">
              <TrackBookingMessagingEntry
                bookingId={bookingId}
                className="rounded-2xl border border-sky-200/35 dark:border-sky-800/30 bg-sky-50/60 dark:bg-sky-950/20 shadow-sm"
              />
            </section>

            <section className="mb-4">
              <BookingTimelineCard>
                <BookingProgressTimeline
                  withCardShell={false}
                  timelineTone="customer"
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
              </BookingTimelineCard>
            </section>

            <section className="mb-4">
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
                finalPaymentCustomerNote={finalPaymentNote}
                layoutVariant="compact"
              />
            </section>

            {paymentHeldCustomerState ? (
              <section className="mb-4 space-y-3">
                <PaymentHeldCustomerCard
                  state={paymentHeldCustomerState}
                  bookingHref={`/customer/bookings/${bookingId}`}
                  supportHref="/support"
                />
                {paymentHeldCustomerState.whyCallout ? (
                  <PaymentHoldWhyCallout
                    headline={paymentHeldCustomerState.whyCallout.headline}
                    body={paymentHeldCustomerState.whyCallout.body}
                  />
                ) : null}
              </section>
            ) : null}

            <section className="mb-4">
              <BookingProtectionCard />
            </section>

            {showRebookStrip && fullBooking.proId && fullBooking.proName && (
              <section className="mb-4">
                <BookingRebookCard
                  proName={fullBooking.proName}
                  proId={fullBooking.proId}
                  bookingId={bookingId}
                />
              </section>
            )}

            {fullBooking.proUserId ? (
              <section className="mb-4 pl-0.5">
                <BookingSafetyLinks
                  bookingId={bookingId}
                  proUserId={fullBooking.proUserId}
                  proDisplayName={fullBooking.proName ?? 'Pro'}
                />
              </section>
            ) : (
              <section className="mb-4">
                <Link
                  href={`/customer/bookings/${bookingId}/issues/new`}
                  className="text-xs font-medium text-[#6A6A6A] dark:text-[#A1A8B3] hover:text-[#b91c1c] hover:underline"
                >
                  Report booking issue
                </Link>
              </section>
            )}

            <section className="mb-6 hidden sm:block">{actionBar}</section>

            {(hasAddressOrNotes || booking.id) && (
              <section className="mb-4">
                <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#171A20] overflow-hidden shadow-sm">
                  <button
                    type="button"
                    onClick={() => setDetailsOpen(!detailsOpen)}
                    className="w-full flex items-center justify-between px-4 py-3.5 text-left text-sm font-medium text-[#111111] dark:text-[#F5F7FA] hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <span>Notes &amp; booking ID</span>
                    <span className="text-[#6A6A6A] dark:text-[#A1A8B3]">{detailsOpen ? '−' : '+'}</span>
                  </button>
                  {detailsOpen && (
                    <div className="px-4 pb-4 pt-0 space-y-3 text-sm text-[#6A6A6A] dark:text-[#A1A8B3] border-t border-black/5 dark:border-white/10">
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
                      <div className="flex items-center gap-2 flex-wrap">
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

            <section className="mb-8">
              <BookingRulesAccordion />
            </section>

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

            <div
              className={cn(
                'sm:hidden fixed left-0 right-0 z-40 border-t border-black/[0.08] dark:border-white/[0.08]',
                'bg-[#F5F4F1]/95 dark:bg-[#0c0e12]/95 backdrop-blur-md px-4 py-3 shadow-[0_-6px_24px_rgba(0,0,0,0.08)]',
                bottomChrome.fixedAboveNav
              )}
            >
              {actionBar}
            </div>
          </div>
        );
      }}
    </TrackBookingRealtime>
  );
}
