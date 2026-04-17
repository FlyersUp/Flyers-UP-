'use client';

import { BookingTimeline } from '@/components/bookings/BookingTimeline';
import { BookingStatusPill } from '@/components/bookings/BookingStatusPill';
import { BookingProgressTracker } from '@/components/bookings/BookingProgressTracker';
import { MultiDayBookingProgressSection } from '@/components/bookings/MultiDayBookingProgressSection';
import { ProMilestonePlanForm } from '@/components/bookings/ProMilestonePlanForm';
import { ProJobCompletedCard } from '@/components/bookings/ProJobCompletedCard';
import { ProYouGotPaidCard } from '@/components/bookings/ProYouGotPaidCard';
import { JobNextAction } from '@/components/jobs/JobNextAction';
import { PaymentStatusModule } from '@/components/booking/PaymentStatusModule';
import { BookingPaymentStatusCard } from '@/components/bookings/BookingPaymentStatusCard';
import { BookingEventsAccordion } from '@/components/bookings/BookingEventsAccordion';
import { deriveTimelineDisplayStatus, buildTimestampsFromBooking } from '@/components/jobs/jobStatus';
import type { BookingDetails } from '@/lib/api';
import Link from 'next/link';
import { ProCustomerPreferenceActions } from '@/components/bookings/ProCustomerPreferenceActions';
import { ProBookingJobNotes } from '@/components/bookings/ProBookingJobNotes';
import { ProEarningsBreakdownCard } from '@/components/bookings/ProEarningsBreakdownCard';
import { ProPendingReschedulePanel } from '@/components/bookings/ProPendingReschedulePanel';
import { formatWallDateLong } from '@/lib/bookings/pending-reschedule';
import { bookingDetailsToMoneyStateInput, getMoneyState } from '@/lib/bookings/money-state';
import {
  computeProYouGotPaidVisibleFromMoney,
  proPayoutStripeToMoneySnapshot,
} from '@/lib/bookings/pro-payout-display';
import { buildSimplePayoutStateInputFromProBooking, deriveSimplePayoutState } from '@/lib/bookings/pro-simple-payout-ui';
import { ProPayoutStatusCard } from '@/components/bookings/ProPayoutStatusCard';
import { useProPayoutStripeVerify } from '@/hooks/useProPayoutStripeVerify';
import { useMemo, type Dispatch, type SetStateAction } from 'react';

export function ProBookingDetailRealtimePane({
  booking,
  bookingId,
  onBookingUpdated,
  progressRevision,
  setProgressRevision,
  setScheduleRevision,
}: {
  booking: BookingDetails;
  bookingId: string;
  onBookingUpdated: (b: BookingDetails | null) => void;
  progressRevision: number;
  setProgressRevision: Dispatch<SetStateAction<number>>;
  setScheduleRevision: Dispatch<SetStateAction<number>>;
}) {
  const baseMoneyInput = useMemo(() => bookingDetailsToMoneyStateInput(booking), [booking]);
  const roughMoney = useMemo(() => getMoneyState(baseMoneyInput, {}), [baseMoneyInput]);
  const payoutStripe = useProPayoutStripeVerify(booking.id, roughMoney.payout);
  const moneyState = useMemo(
    () => getMoneyState(baseMoneyInput, proPayoutStripeToMoneySnapshot(payoutStripe)),
    [baseMoneyInput, payoutStripe]
  );

  const headerDate = formatWallDateLong(booking.serviceDate);
  const proposedDateLabel = booking.pendingReschedule
    ? formatWallDateLong(booking.pendingReschedule.proposedServiceDate)
    : null;
  const paymentCtx = {
    paidAt: booking.paidAt,
    paidDepositAt: booking.paidDepositAt,
    fullyPaidAt: booking.fullyPaidAt,
  };
  const status = deriveTimelineDisplayStatus(booking.status, paymentCtx);
  const timestamps = buildTimestampsFromBooking(booking.createdAt, booking.statusHistory, {
    acceptedAt: booking.acceptedAt,
    onTheWayAt: booking.onTheWayAt,
    arrivedAt: booking.arrivedAt,
    startedAt: booking.startedAt,
    completedAt: booking.completedAt,
    paidAt: booking.paidAt,
  });
  if (status === 'AWAITING_ACCEPTANCE') {
    const t = booking.paidDepositAt ?? booking.paidAt;
    if (t) timestamps.AWAITING_ACCEPTANCE = t;
  }

  const isJobCompleted = [
    'completed_pending_payment',
    'awaiting_payment',
    'awaiting_remaining_payment',
    'awaiting_customer_confirmation',
  ].includes(booking.status);

  const proEarnings = Math.max(
    0,
    (booking.amountTotal ?? 0) - (booking.platformFeeCents ?? 0) - (booking.refundedTotalCents ?? 0)
  );

  const showYouGotPaid = computeProYouGotPaidVisibleFromMoney(proEarnings, moneyState);

  const proPayoutUi = useMemo(
    () => deriveSimplePayoutState(buildSimplePayoutStateInputFromProBooking(booking, moneyState, payoutStripe)),
    [booking, moneyState, payoutStripe]
  );

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-text">Booking Details</h1>
        {booking.pendingReschedule && (
          <div className="mt-2 mb-3">
            <ProPendingReschedulePanel
              bookingId={bookingId}
              pending={booking.pendingReschedule}
              viewerRole="pro"
              onResolved={() => setScheduleRevision((n) => n + 1)}
            />
          </div>
        )}
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {booking.pendingReschedule ? 'Currently scheduled' : 'Scheduled'}
        </p>
        <p className="mt-1 text-sm text-muted">
          {headerDate || '—'} {booking.serviceTime ? `at ${booking.serviceTime}` : ''}
        </p>
        {booking.pendingReschedule && (
          <p className="mt-2 text-sm font-medium text-amber-900 dark:text-amber-200">
            Requested new time: {proposedDateLabel || booking.pendingReschedule.proposedServiceDate} at{' '}
            {booking.pendingReschedule.proposedServiceTime}
          </p>
        )}
        <p className="mt-0.5 text-sm text-muted">
          Created {new Date(booking.createdAt).toLocaleDateString()}
        </p>
        <div className="mt-3">
          <BookingStatusPill status={booking.status} />
        </div>
        {booking.proClawbackRemediationStatus === 'open' ? (
          <div className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/90 dark:bg-amber-950/35 dark:border-amber-800/50 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
            <p className="font-semibold">Remediation under review</p>
            <p className="mt-1 text-xs leading-relaxed opacity-95">
              A customer refund touched this booking after a payout had already been sent. Flyers Up is tracking any
              balance adjustment — you do not need to take action unless our team contacts you.
            </p>
          </div>
        ) : null}
      </header>

      <section className="mb-6">
        <BookingProgressTracker
          status={booking.status}
          paidAt={booking.paidAt}
          paidDepositAt={booking.paidDepositAt}
          fullyPaidAt={booking.fullyPaidAt}
        />
      </section>

      <ProMilestonePlanForm
        bookingId={bookingId}
        bookingStatus={booking.status}
        reloadKey={progressRevision}
        onSaved={() => setProgressRevision((n) => n + 1)}
      />
      <MultiDayBookingProgressSection bookingId={bookingId} mode="pro" revision={progressRevision} />

      {showYouGotPaid && (
        <section className="mb-6">
          <ProYouGotPaidCard amountCents={proEarnings} />
        </section>
      )}

      {isJobCompleted && !showYouGotPaid && (
        <section className="mb-6">
          <ProJobCompletedCard
            amountTotal={booking.amountTotal ?? 0}
            platformFeeCents={booking.platformFeeCents ?? 0}
            refundedTotalCents={booking.refundedTotalCents ?? 0}
            awaitingConfirmation={booking.status === 'awaiting_customer_confirmation'}
          />
        </section>
      )}

      <div
        className="rounded-2xl border border-[var(--hairline)] p-5 mb-6"
        style={{ backgroundColor: '#F5F5F5' }}
      >
        <div className="text-sm font-medium text-muted mb-2">Customer</div>
        <p className="text-text text-base font-semibold">
          {booking.customerDisplayName?.trim() || 'Customer'}
        </p>
        {booking.address && <p className="mt-2 text-sm text-text">{booking.address}</p>}
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Job notes</p>
          <ProBookingJobNotes
            notes={booking.notes}
            bookingAddonSnapshots={booking.bookingAddonSnapshots}
          />
        </div>
        <ProCustomerPreferenceActions customerUserId={booking.customerId} />
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Your earnings</p>
          <ProEarningsBreakdownCard
            bookingId={bookingId}
            amountTotalCents={booking.amountTotal}
            platformFeeCents={booking.platformFeeCents}
            amountSubtotalCents={booking.amountSubtotalCents}
            priceDollars={booking.price}
            refundedTotalCents={booking.refundedTotalCents}
          />
        </div>
      </div>

      <section className="mb-6">
        <h2 className="text-base font-semibold text-text mb-4">Payment</h2>
        <div className="mb-4">
          <ProPayoutStatusCard
            state={proPayoutUi.state}
            holdUiKey={proPayoutUi.holdUiKey}
            notReadyReason={proPayoutUi.notReadyReason}
          />
        </div>
        <div className="space-y-4">
          <BookingPaymentStatusCard
            status={booking.status}
            paymentDueAt={booking.paymentDueAt}
            remainingDueAt={booking.remainingDueAt}
            autoConfirmAt={booking.autoConfirmAt}
            paidDepositAt={booking.paidDepositAt ?? booking.paidAt}
            paidRemainingAt={booking.paidRemainingAt ?? booking.fullyPaidAt}
            amountDeposit={booking.amountDeposit}
            amountRemaining={booking.amountRemaining}
            amountTotal={booking.amountTotal}
            serviceSubtotalCents={booking.amountSubtotalCents}
            platformFeeCents={booking.platformFeeCents}
            refundedTotalCents={booking.refundedTotalCents}
            view="pro"
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
            view="pro"
            proMoneyState={moneyState}
          />
        </div>
      </section>

      <section className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-text">Status timeline</h2>
          <Link href="/booking-rules" className="text-xs text-muted hover:text-text hover:underline">
            Booking Rules
          </Link>
        </div>
        <div
          className="rounded-2xl border border-[var(--hairline)] overflow-hidden"
          style={{ backgroundColor: '#F5F5F5' }}
        >
          <div className="p-6">
            {(booking.status || '').toLowerCase() === 'declined' ? (
              <p className="text-sm text-muted">This request was declined and will not continue.</p>
            ) : (
              <BookingTimeline
                status={status}
                timeZone={booking.bookingTimezone ?? undefined}
                timestamps={{
                  booked: timestamps.BOOKED,
                  awaitingAcceptance: timestamps.AWAITING_ACCEPTANCE,
                  accepted: timestamps.ACCEPTED,
                  onTheWay: timestamps.ON_THE_WAY,
                  arrived: timestamps.ARRIVED,
                  started: timestamps.IN_PROGRESS,
                  completed: timestamps.COMPLETED,
                  paid: timestamps.PAID,
                }}
              />
            )}
          </div>
          <JobNextAction booking={booking} onUpdated={onBookingUpdated} jobId={bookingId} />
        </div>
      </section>

      <div className="flex gap-3">
        <Link href={`/pro/jobs/${bookingId}`} className="text-sm font-medium text-text hover:underline">
          View full job details →
        </Link>
        <Link href={`/pro/chat/${bookingId}`} className="text-sm font-medium text-text hover:underline">
          Message customer
        </Link>
      </div>

      <div className="mt-6">
        <BookingEventsAccordion bookingId={bookingId} />
      </div>

      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-3 rounded-lg bg-black/5 text-xs font-mono text-muted">
          Debug: id={booking.id} status={booking.status}
        </div>
      )}
    </>
  );
}
