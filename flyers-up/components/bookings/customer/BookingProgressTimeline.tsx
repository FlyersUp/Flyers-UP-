'use client';

import { BookingTimeline } from '@/components/bookings/BookingTimeline';
import { deriveTimelineDisplayStatus, buildTimestampsFromBooking } from '@/components/jobs/jobStatus';
import type { Status } from '@/components/jobs/jobStatus';

export interface BookingProgressTimelineProps {
  status: string;
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
}: BookingProgressTimelineProps) {
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

  return (
    <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-6 shadow-sm">
      <BookingTimeline
        status={timelineStatus}
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
    </div>
  );
}
