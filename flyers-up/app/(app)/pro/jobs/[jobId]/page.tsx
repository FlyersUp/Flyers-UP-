'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import JobTimelineCard from '@/components/jobs/JobTimelineCard';
import { deriveTimelineDisplayStatus, buildTimestampsFromBooking } from '@/components/jobs/jobStatus';
import { JobNextAction } from '@/components/jobs/JobNextAction';
import Link from 'next/link';
import { AddToCalendarButton } from '@/components/calendar/AddToCalendarButton';
import { isCalendarCommittedStatus } from '@/lib/calendar/committed-states';
import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { getBookingById, getCurrentUser, type BookingDetails } from '@/lib/api';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { ProBookingJobNotes } from '@/components/bookings/ProBookingJobNotes';
import { ProCustomerPricingBreakdown } from '@/components/bookings/ProCustomerPricingBreakdown';
import { ProPendingReschedulePanel } from '@/components/bookings/ProPendingReschedulePanel';
import {
  calendarWallTimesWithPending,
  formatWallDateLong,
} from '@/lib/bookings/pending-reschedule';

/**
 * Active Job Screen - Screen 17
 * Job details with action buttons
 */
export default function ActiveJob({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [signedIn, setSignedIn] = useState<boolean>(false);

  const refreshBooking = useCallback(async () => {
    const id = normalizeUuidOrNull(jobId);
    if (!id) return;
    const b = await getBookingById(id);
    setBooking(b);
  }, [jobId]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const user = await getCurrentUser();
        if (!mounted) return;
        setSignedIn(Boolean(user));
        if (!user) {
          setBooking(null);
          return;
        }

        const id = normalizeUuidOrNull(jobId);
        if (!id) {
          setBooking(null);
          return;
        }

        const b = await getBookingById(id);
        if (!mounted) return;
        setBooking(b);
      } catch {
        if (mounted) setBooking(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [jobId]);

  const formattedDate = useMemo(() => {
    if (!booking?.serviceDate) return null;
    return formatWallDateLong(booking.serviceDate);
  }, [booking?.serviceDate]);

  const formattedProposedDate = useMemo(() => {
    if (!booking?.pendingReschedule?.proposedServiceDate) return null;
    return formatWallDateLong(booking.pendingReschedule.proposedServiceDate);
  }, [booking?.pendingReschedule?.proposedServiceDate]);

  return (
    <AppLayout mode="pro">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold text-text mb-6">
          Job Details
        </h1>

        {loading ? (
          <Card withRail className="mb-6">
            <p className="text-sm text-muted/70">Loading…</p>
          </Card>
        ) : !signedIn ? (
          <Card withRail className="mb-6">
            <p className="text-sm text-muted/70">Please sign in to view job details.</p>
            <div className="mt-4">
              <Link
                href={`/signin?next=${encodeURIComponent(`/pro/jobs/${jobId}`)}`}
                className="text-sm font-medium text-text hover:underline"
              >
                Sign in →
              </Link>
            </div>
          </Card>
        ) : !booking ? (
          <Card withRail className="mb-6 border-l-[3px] border-l-accent">
            <div className="space-y-2">
              <div className="font-semibold text-text">No job details yet</div>
              <p className="text-sm text-muted">
                This screen used to show demo data. Real jobs will appear here once you accept a request.
              </p>
            </div>
          </Card>
        ) : (
          <Card withRail className="mb-6">
            <div className="space-y-6">
              <div>
                <Label className="mb-2 block">CUSTOMER</Label>
                <p className="text-base font-semibold text-text">
                  {booking.customerDisplayName?.trim() || 'Customer'}
                </p>
              </div>

              <div>
                <Label className="mb-2 block">ADDRESS</Label>
                <p className="text-text">{booking.address || '—'}</p>
              </div>

              <div className="border-t border-border pt-4">
                <Label className="mb-2 block">TIME</Label>
                {booking.pendingReschedule && (
                  <div className="mb-3">
                    <ProPendingReschedulePanel
                      bookingId={jobId}
                      pending={booking.pendingReschedule}
                      viewerRole="pro"
                      onResolved={() => void refreshBooking()}
                    />
                  </div>
                )}
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  {booking.pendingReschedule ? 'Currently scheduled' : 'Scheduled'}
                </p>
                <p className="text-text">
                  {formattedDate || '—'} {booking.serviceTime ? `at ${booking.serviceTime}` : ''}
                </p>
                {booking.pendingReschedule && (
                  <p className="mt-2 text-sm font-medium text-amber-900 dark:text-amber-200">
                    Requested new time: {formattedProposedDate || booking.pendingReschedule.proposedServiceDate}{' '}
                    at {booking.pendingReschedule.proposedServiceTime}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-3">
                  <Link
                    href="/pro/calendar"
                    className="text-sm font-medium text-accent hover:underline"
                  >
                    View in calendar →
                  </Link>
                  {booking.serviceDate &&
                    booking.serviceTime &&
                    isCalendarCommittedStatus(booking.status) && (
                      <AddToCalendarButton
                        bookingId={jobId}
                        booking={{
                          ...calendarWallTimesWithPending(
                            booking.serviceDate,
                            booking.serviceTime,
                            booking.pendingReschedule ?? null
                          ),
                          serviceTitle: 'Job' + (booking.pendingReschedule ? ' (requested time)' : ''),
                          address: booking.address,
                          bookingTimezone: booking.bookingTimezone ?? undefined,
                        }}
                      />
                    )}
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <Label className="mb-2 block">JOB NOTES &amp; SCOPE</Label>
                <ProBookingJobNotes notes={booking.notes} />
              </div>

              <div className="rounded-lg p-4 border border-border bg-surface2 border-l-[3px] border-l-accent space-y-2">
                <Label className="mb-2 block">CUSTOMER PRICING</Label>
                <ProCustomerPricingBreakdown
                  bookingId={jobId}
                  amountTotalCents={booking.amountTotal}
                  platformFeeCents={booking.platformFeeCents}
                  amountSubtotalCents={booking.amountSubtotalCents}
                  priceDollars={booking.price}
                />
              </div>
            </div>
          </Card>
        )}

        {booking &&
          (() => {
            const paymentCtx = {
              paidAt: booking.paidAt,
              paidDepositAt: booking.paidDepositAt,
              fullyPaidAt: booking.fullyPaidAt,
            };
            const timelineStatus = deriveTimelineDisplayStatus(booking.status, paymentCtx);
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
            if (timelineStatus === 'AWAITING_ACCEPTANCE') {
              const t = booking.paidDepositAt ?? booking.paidAt;
              if (t) timestamps.AWAITING_ACCEPTANCE = t;
            }
            const isDeclined = (booking.status || '').toLowerCase() === 'declined';
            return (
              <div className="mb-6 rounded-2xl border border-black/10 shadow-sm overflow-hidden bg-[hsl(var(--surface))]">
                {isDeclined ? (
                  <div className="p-6 border-b border-black/10">
                    <h2 className="text-base font-semibold text-text">Job timeline</h2>
                    <p className="mt-2 text-sm text-muted">This request was declined and will not continue.</p>
                  </div>
                ) : (
                  <JobTimelineCard
                    status={timelineStatus}
                    timestamps={timestamps}
                    className="rounded-t-2xl border-0 shadow-none mb-0"
                  />
                )}
                <JobNextAction booking={booking} onUpdated={setBooking} jobId={jobId} />
              </div>
            );
          })()}
      </div>
    </AppLayout>
  );
}












