'use client';

import Link from 'next/link';
import { mapDbStatusToTimeline } from '@/components/jobs/jobStatus';

export interface BookingActionsBarProps {
  bookingId: string;
  status: string;
  primaryAction?: React.ReactNode;
}

export function BookingActionsBar({
  bookingId,
  status,
  primaryAction,
}: BookingActionsBarProps) {
  const timelineStatus = mapDbStatusToTimeline(status);
  const isCompleted = timelineStatus === 'COMPLETED' || timelineStatus === 'PAID';

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <Link
        href={`/customer/chat/${bookingId}`}
        className="flex-1 h-11 flex items-center justify-center rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95 transition-all"
      >
        Message pro
      </Link>
      <Link
        href="/customer/settings/help-support"
        className="flex-1 h-11 flex items-center justify-center rounded-full text-sm font-medium border border-black/15 text-black/80 hover:bg-black/5 transition-colors"
      >
        Help / Support
      </Link>
      {isCompleted && (
        <Link
          href={`/jobs/${bookingId}`}
          className="flex-1 h-11 flex items-center justify-center rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95 transition-all"
        >
          Leave a review
        </Link>
      )}
      {primaryAction && (
        <div className="w-full sm:flex-1">{primaryAction}</div>
      )}
    </div>
  );
}
