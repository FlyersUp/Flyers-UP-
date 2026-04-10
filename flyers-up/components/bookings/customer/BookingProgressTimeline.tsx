'use client';

import { BookingTimeline } from '@/components/bookings/BookingTimeline';
import { deriveTimelineDisplayStatus, buildTimestampsFromBooking } from '@/components/jobs/jobStatus';
import type { Status } from '@/components/jobs/jobStatus';
import { DEFAULT_BOOKING_TIMEZONE } from '@/lib/datetime';

export interface BookingProgressTimelineProps {
  status: string;
  bookingTimezone?: string | null;
  /** When false, render only the timeline (no outer card) for use inside a parent section. */
  withCardShell?: boolean;
  /** Visual accent for customer booking detail. */
  timelineTone?: 'default' | 'customer';
  createdAt: string;
  statusHistory?: { status: string; at: string }[];
  acceptedAt?: string | null;
  onTheWayAt?: string | null;
  enRouteAt?: string | null;
  arrivedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  paidAt?: string | null;
  paidDepositAt?: string | null;
  fullyPaidAt?: string | null;
}

export function BookingProgressTimeline({
  status,
  bookingTimezone,
  createdAt,
  statusHistory,
  acceptedAt,
  onTheWayAt,
  enRouteAt,
  arrivedAt,
  startedAt,
  completedAt,
  paidAt,
  paidDepositAt,
  fullyPaidAt,
  withCardShell = true,
  timelineTone = 'default',
}: BookingProgressTimelineProps) {
  const tz = bookingTimezone?.trim() || DEFAULT_BOOKING_TIMEZONE;
  const paymentCtx = { paidAt, paidDepositAt, fullyPaidAt };
  const timelineStatus = deriveTimelineDisplayStatus(status, paymentCtx) as Status;
  const timestamps = buildTimestampsFromBooking(createdAt, statusHistory, {
    acceptedAt,
    onTheWayAt: onTheWayAt ?? enRouteAt,
    enRouteAt: enRouteAt ?? onTheWayAt,
    arrivedAt,
    startedAt,
    completedAt,
    paidAt,
  });
  if (timelineStatus === 'AWAITING_ACCEPTANCE') {
    const t = paidDepositAt ?? paidAt;
    if (t) timestamps.AWAITING_ACCEPTANCE = t;
  }

  const inner = (
    <BookingTimeline
      status={timelineStatus}
      timeZone={tz}
      compact={!withCardShell}
      tone={timelineTone}
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
  );

  if (!withCardShell) {
    return inner;
  }

  return (
    <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-6 shadow-sm">
      {inner}
    </div>
  );
}
