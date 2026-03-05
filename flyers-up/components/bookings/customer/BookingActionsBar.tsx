'use client';

import Link from 'next/link';
import { mapDbStatusToTimeline } from '@/components/jobs/jobStatus';

export interface BookingActionsBarProps {
  bookingId: string;
  status: string;
  primaryAction?: React.ReactNode;
  proId?: string | null;
  serviceName?: string | null;
  address?: string | null;
  notes?: string | null;
}

export function BookingActionsBar({
  bookingId,
  status,
  primaryAction,
  proId,
  serviceName,
  address,
  notes,
}: BookingActionsBarProps) {
  const timelineStatus = mapDbStatusToTimeline(status);
  const isCompleted = timelineStatus === 'COMPLETED' || timelineStatus === 'PAID';

  const rebookParams = new URLSearchParams();
  if (address) rebookParams.set('address', address);
  if (serviceName) rebookParams.set('service', serviceName);
  if (notes) rebookParams.set('notes', notes);
  const rebookHref = proId ? `/book/${proId}${rebookParams.toString() ? `?${rebookParams}` : ''}` : null;

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
      {isCompleted && rebookHref && (
        <Link
          href={rebookHref}
          className="flex-1 h-11 flex items-center justify-center rounded-full text-sm font-semibold text-black border-2 border-[#B2FBA5] bg-[#B2FBA5]/20 hover:bg-[#B2FBA5]/30 transition-all"
        >
          Rebook Same Pro
        </Link>
      )}
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
