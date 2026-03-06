'use client';

import { BookingTimeline } from '@/components/bookings/BookingTimeline';
import { mapDbStatusToTimeline, buildTimestampsFromBooking } from '@/components/jobs/jobStatus';
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
}: BookingProgressTimelineProps) {
  const timelineStatus = mapDbStatusToTimeline(status) as Status;
  const timestamps = buildTimestampsFromBooking(createdAt, statusHistory, {
    acceptedAt,
    onTheWayAt: onTheWayAt ?? enRouteAt,
    enRouteAt: enRouteAt ?? onTheWayAt,
    arrivedAt,
    startedAt,
    completedAt,
    paidAt,
  });

  return (
    <div className="rounded-2xl border border-black/5 p-6 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
      <BookingTimeline
        status={timelineStatus}
        timestamps={{
          booked: timestamps.BOOKED,
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
