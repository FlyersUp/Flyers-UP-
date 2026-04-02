'use client';

import Link from 'next/link';
import { mapDbStatusToTimeline } from '@/components/jobs/jobStatus';
import { isCustomerBookingEligibleForReview } from '@/lib/bookings/customer-review-eligibility';

const NO_RESCHEDULE_STATUSES = ['pro_en_route', 'on_the_way', 'arrived', 'in_progress', 'completed', 'paid', 'cancelled', 'declined'];
const NO_CANCEL_STATUSES = ['cancelled', 'declined', 'completed', 'awaiting_customer_confirmation', 'paid', 'fully_paid'];

export interface BookingActionsBarProps {
  bookingId: string;
  status: string;
  /** When true, customer already has a row in booking_reviews — link to review page shows summary. */
  hasCustomerReview?: boolean;
  primaryAction?: React.ReactNode;
  proId?: string | null;
  serviceName?: string | null;
  address?: string | null;
  notes?: string | null;
  onRescheduleClick?: () => void;
  onCancelClick?: () => void;
}

export function BookingActionsBar({
  bookingId,
  status,
  hasCustomerReview = false,
  primaryAction,
  proId,
  serviceName,
  address,
  notes,
  onRescheduleClick,
  onCancelClick,
}: BookingActionsBarProps) {
  const timelineStatus = mapDbStatusToTimeline(status);
  const isCompleted = timelineStatus === 'COMPLETED' || timelineStatus === 'PAID';
  const reviewHref = `/customer/bookings/${bookingId}/review`;
  const showReviewAction = isCustomerBookingEligibleForReview(status);
  const canReschedule = !NO_RESCHEDULE_STATUSES.includes(status);
  const canCancel = !NO_CANCEL_STATUSES.includes(status);

  const rebookParams = new URLSearchParams();
  if (address) rebookParams.set('address', address);
  if (serviceName) rebookParams.set('service', serviceName);
  if (notes) rebookParams.set('notes', notes);
  const rebookHref = proId ? `/book/${proId}${rebookParams.toString() ? `?${rebookParams}` : ''}` : null;

  return (
    <div className="flex flex-col gap-3">
      {/* Primary: Message pro */}
      <Link
        href={`/customer/chat/${bookingId}`}
        className="h-11 flex items-center justify-center rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95 transition-all"
      >
        Message pro
      </Link>
      {/* Secondary: Reschedule — visible, trustworthy */}
      {canReschedule && onRescheduleClick && (
        <button
          type="button"
          onClick={onRescheduleClick}
          className="h-11 flex items-center justify-center rounded-full text-sm font-medium border-2 border-[#058954]/30 bg-[#058954]/5 dark:bg-[#058954]/10 text-[#058954] dark:text-[#2dd68a] hover:bg-[#058954]/10 dark:hover:bg-[#058954]/15 transition-colors"
        >
          Reschedule
        </button>
      )}
      {/* Tertiary: Cancel — lowest emphasis until confirmation */}
      {canCancel && onCancelClick && (
        <button
          type="button"
          onClick={onCancelClick}
          className="h-11 flex items-center justify-center rounded-full text-sm font-medium text-[#6A6A6A] dark:text-[#A1A8B3] hover:text-[#111111] dark:hover:text-[#F5F7FA] hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors"
        >
          Cancel booking
        </button>
      )}
      {/* Utility */}
      <Link
        href="/customer/settings/help-support"
        className="h-11 flex items-center justify-center rounded-full text-sm font-medium border border-black/10 dark:border-white/10 text-[#6A6A6A] dark:text-[#A1A8B3] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        Help / Support
      </Link>
      {isCompleted && rebookHref && (
        <Link
          href={rebookHref}
          className="h-11 flex items-center justify-center rounded-full text-sm font-semibold text-black border-2 border-[#B2FBA5] bg-[#B2FBA5]/20 hover:bg-[#B2FBA5]/30 transition-all"
        >
          Rebook Same Pro
        </Link>
      )}
      {showReviewAction && (
        <Link
          href={reviewHref}
          className="h-11 flex items-center justify-center rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95 transition-all"
        >
          {hasCustomerReview ? 'View your review' : 'Leave a review'}
        </Link>
      )}
      {primaryAction && (
        <div className="w-full">{primaryAction}</div>
      )}
    </div>
  );
}
