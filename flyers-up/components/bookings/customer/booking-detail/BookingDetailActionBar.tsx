'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { mapDbStatusToTimeline } from '@/components/jobs/jobStatus';
import { isCustomerBookingEligibleForReview } from '@/lib/bookings/customer-review-eligibility';

const NO_RESCHEDULE_STATUSES = [
  'pro_en_route',
  'on_the_way',
  'arrived',
  'in_progress',
  'completed',
  'paid',
  'cancelled',
  'declined',
];
const NO_CANCEL_STATUSES = [
  'cancelled',
  'declined',
  'completed',
  'awaiting_customer_confirmation',
  'paid',
  'fully_paid',
];

export interface BookingDetailActionBarProps {
  bookingId: string;
  status: string;
  hasCustomerReview?: boolean;
  primaryAction?: ReactNode;
  onRescheduleClick?: () => void;
  onCancelClick?: () => void;
  className?: string;
}

export function BookingDetailActionBar({
  bookingId,
  status,
  hasCustomerReview = false,
  primaryAction,
  onRescheduleClick,
  onCancelClick,
  className = '',
}: BookingDetailActionBarProps) {
  const timelineStatus = mapDbStatusToTimeline(status);
  const isCompleted = timelineStatus === 'COMPLETED' || timelineStatus === 'PAID';
  const reviewHref = `/customer/bookings/${bookingId}/review`;
  const showReviewAction = isCustomerBookingEligibleForReview(status);
  const canReschedule = !NO_RESCHEDULE_STATUSES.includes(status);
  const canCancel = !NO_CANCEL_STATUSES.includes(status);

  return (
    <div className={`space-y-3 ${className}`}>
      {primaryAction ? <div className="w-full">{primaryAction}</div> : null}

      <div className="flex gap-2 min-w-0">
        <Link
          href={`/customer/chat/${bookingId}`}
          className="flex-1 min-w-0 flex h-12 items-center justify-center rounded-full text-sm font-semibold text-white bg-[#4A69BD] hover:bg-[#3d5a9e] transition-colors shadow-sm"
        >
          Message pro
        </Link>
        {canReschedule && onRescheduleClick ? (
          <button
            type="button"
            onClick={onRescheduleClick}
            className="flex-1 min-w-0 flex h-12 items-center justify-center rounded-full text-sm font-semibold border-2 border-[#4A69BD]/35 text-[#4A69BD] dark:text-[#7BA3E8] bg-white dark:bg-[#171A20] hover:bg-sky-50/80 dark:hover:bg-white/[0.04] transition-colors"
          >
            Reschedule
          </button>
        ) : null}
      </div>

      {canCancel && onCancelClick ? (
        <button
          type="button"
          onClick={onCancelClick}
          className="w-full text-center text-sm font-medium text-[#6A6A6A] dark:text-[#A1A8B3] hover:text-[#111111] dark:hover:text-[#F5F7FA] py-2 transition-colors"
        >
          Cancel booking
        </button>
      ) : null}

      {showReviewAction && (
        <Link
          href={reviewHref}
          className="flex h-11 w-full items-center justify-center rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95 transition-all"
        >
          {hasCustomerReview ? 'View your review' : 'Leave a review'}
        </Link>
      )}

      <Link
        href="/customer/settings/help-support"
        className="block text-center text-xs text-[#6A6A6A] dark:text-[#A1A8B3] hover:underline py-1"
      >
        Help &amp; support
      </Link>

      {isCompleted ? (
        <p className="text-[10px] text-center text-[#9CA3AF] dark:text-white/30">
          Finished jobs can&apos;t be rescheduled here — message your pro or book again.
        </p>
      ) : null}
    </div>
  );
}
