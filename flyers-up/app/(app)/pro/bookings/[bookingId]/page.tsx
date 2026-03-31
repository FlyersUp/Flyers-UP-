'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { BookingTimeline } from '@/components/bookings/BookingTimeline';
import { BookingStatusPill } from '@/components/bookings/BookingStatusPill';
import { BookingProgressTracker } from '@/components/bookings/BookingProgressTracker';
import { MultiDayBookingProgressSection } from '@/components/bookings/MultiDayBookingProgressSection';
import { ProMilestonePlanForm } from '@/components/bookings/ProMilestonePlanForm';
import { ProJobCompletedCard } from '@/components/bookings/ProJobCompletedCard';
import { PayoutTimeline } from '@/components/bookings/PayoutTimeline';
import { ProYouGotPaidCard } from '@/components/bookings/ProYouGotPaidCard';
import { JobNextAction } from '@/components/jobs/JobNextAction';
import { ProBookingRealtime } from '@/components/bookings/ProBookingRealtime';
import { PaymentStatusModule } from '@/components/booking/PaymentStatusModule';
import { BookingPaymentStatusCard } from '@/components/bookings/BookingPaymentStatusCard';
import { BookingEventsAccordion } from '@/components/bookings/BookingEventsAccordion';
import { deriveTimelineDisplayStatus, buildTimestampsFromBooking } from '@/components/jobs/jobStatus';
import { getBookingById, getCurrentUser, type BookingDetails } from '@/lib/api';
import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { ProCustomerPreferenceActions } from '@/components/bookings/ProCustomerPreferenceActions';
import { ProBookingJobNotes } from '@/components/bookings/ProBookingJobNotes';
import { ProCustomerPricingBreakdown } from '@/components/bookings/ProCustomerPricingBreakdown';
import { ProPendingReschedulePanel } from '@/components/bookings/ProPendingReschedulePanel';
import { formatWallDateLong } from '@/lib/bookings/pending-reschedule';

export default function ProBookingDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = use(params);
  const [initialBooking, setInitialBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [progressRevision, setProgressRevision] = useState(0);
  const [scheduleRevision, setScheduleRevision] = useState(0);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const user = await getCurrentUser();
        if (!mounted) return;
        setSignedIn(Boolean(user));
        if (!user) {
          setInitialBooking(null);
          return;
        }
        const id = normalizeUuidOrNull(bookingId);
        if (!id) {
          setInitialBooking(null);
          return;
        }
        const b = await getBookingById(id);
        if (!mounted) return;
        setInitialBooking(b);
      } catch {
        if (mounted) setInitialBooking(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, [bookingId]);

  if (loading && !initialBooking) {
    return (
      <AppLayout mode="pro">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <p className="text-sm text-muted">Loading…</p>
        </div>
      </AppLayout>
    );
  }

  if (!signedIn) {
    return (
      <AppLayout mode="pro">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <p className="text-sm text-muted mb-4">Please sign in to view this booking.</p>
          <Link
            href={`/signin?next=${encodeURIComponent(`/pro/bookings/${bookingId}`)}`}
            className="text-sm font-medium text-text hover:underline"
          >
            Sign in →
          </Link>
        </div>
      </AppLayout>
    );
  }

  if (!initialBooking) {
    return (
      <AppLayout mode="pro">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div
            className="rounded-2xl border border-[var(--hairline)] p-6"
            style={{ backgroundColor: '#F5F5F5' }}
          >
            <p className="text-sm text-muted">Booking not found.</p>
            <Link
              href="/pro/bookings"
              className="mt-4 inline-block text-sm font-medium text-text hover:underline"
            >
              ← Back to bookings
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout mode="pro">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Link
          href="/pro/bookings"
          className="text-sm text-muted hover:text-text mb-4 inline-block"
        >
          ← Back to bookings
        </Link>

        <ProBookingRealtime
          bookingId={bookingId}
          initialBooking={initialBooking}
          reloadKey={scheduleRevision}
        >
          {(booking) => {
            if (!booking) return null;
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
            const timestamps = buildTimestampsFromBooking(
              booking.createdAt,
              booking.statusHistory,
              {
                acceptedAt: booking.acceptedAt,
                onTheWayAt: booking.onTheWayAt,
                arrivedAt: booking.arrivedAt,
                startedAt: booking.startedAt,
                completedAt: booking.completedAt,
                paidAt: booking.paidAt,
              }
            );
            if (status === 'AWAITING_ACCEPTANCE') {
              const t = booking.paidDepositAt ?? booking.paidAt;
              if (t) timestamps.AWAITING_ACCEPTANCE = t;
            }

            const isJobCompleted =
              ['completed_pending_payment', 'awaiting_payment', 'awaiting_remaining_payment', 'awaiting_customer_confirmation'].includes(booking.status);
            const isPayoutSucceeded = (booking.payoutStatus ?? '').toLowerCase() === 'succeeded' || (booking.payoutStatus ?? '').toLowerCase() === 'paid';
            const customerPaid = !!booking.fullyPaidAt || !!booking.paidRemainingAt;
            const proEarnings = Math.max(
              0,
              (booking.amountTotal ?? 0) - (booking.platformFeeCents ?? 0) - (booking.refundedTotalCents ?? 0)
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
                </header>

                {/* Progress tracker */}
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
                <MultiDayBookingProgressSection
                  bookingId={bookingId}
                  mode="pro"
                  revision={progressRevision}
                />

                {/* Pro "You got paid" celebration */}
                {isPayoutSucceeded && proEarnings > 0 && (
                  <section className="mb-6">
                    <ProYouGotPaidCard amountCents={proEarnings} />
                  </section>
                )}

                {/* Pro "Job completed" moment */}
                {isJobCompleted && !isPayoutSucceeded && (
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
                  {booking.address && (
                    <p className="mt-2 text-sm text-text">{booking.address}</p>
                  )}
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Job notes</p>
                    <ProBookingJobNotes notes={booking.notes} />
                  </div>
                  <ProCustomerPreferenceActions customerUserId={booking.customerId} />
                  <div className="mt-3 pt-3 border-t border-border">
                    <ProCustomerPricingBreakdown
                      bookingId={bookingId}
                      amountTotalCents={booking.amountTotal}
                      platformFeeCents={booking.platformFeeCents}
                      amountSubtotalCents={booking.amountSubtotalCents}
                      priceDollars={booking.price}
                    />
                  </div>
                </div>

                <section className="mb-6">
                  <h2 className="text-base font-semibold text-text mb-4">Payment</h2>
                  <div className="mb-4">
                    <PayoutTimeline
                      payoutStatus={booking.payoutStatus}
                      customerPaid={customerPaid}
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
                    />
                  </div>
                </section>

                <section className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-text">Status timeline</h2>
                    <Link
                      href="/booking-rules"
                      className="text-xs text-muted hover:text-text hover:underline"
                    >
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
                    <JobNextAction
                      booking={booking}
                      onUpdated={setInitialBooking}
                      jobId={bookingId}
                    />
                  </div>
                </section>

                <div className="flex gap-3">
                  <Link
                    href={`/pro/jobs/${bookingId}`}
                    className="text-sm font-medium text-text hover:underline"
                  >
                    View full job details →
                  </Link>
                  <Link
                    href={`/pro/chat/${bookingId}`}
                    className="text-sm font-medium text-text hover:underline"
                  >
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
          }}
        </ProBookingRealtime>
      </div>
    </AppLayout>
  );
}
