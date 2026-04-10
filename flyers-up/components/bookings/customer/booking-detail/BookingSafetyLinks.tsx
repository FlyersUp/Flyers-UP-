'use client';

import Link from 'next/link';
import { ReportUserBlockUser } from '@/components/moderation/ReportUserBlockUser';

export interface BookingSafetyLinksProps {
  bookingId: string;
  proUserId: string | null | undefined;
  proDisplayName: string;
  className?: string;
}

export function BookingSafetyLinks({
  bookingId,
  proUserId,
  proDisplayName,
  className = '',
}: BookingSafetyLinksProps) {
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <Link
        href={`/customer/bookings/${bookingId}/issues/new`}
        className="text-xs font-medium text-[#6A6A6A] dark:text-[#A1A8B3] hover:text-[#b91c1c] dark:hover:text-red-300 transition-colors"
      >
        Report booking issue
      </Link>
      {proUserId ? (
        <div className="pt-1 border-t border-black/[0.06] dark:border-white/[0.08]">
          <p className="text-[10px] font-medium uppercase tracking-wider text-[#9CA3AF] mb-2">Pro safety</p>
          <ReportUserBlockUser
            targetUserId={proUserId}
            targetDisplayName={proDisplayName}
            bookingId={bookingId}
            variant="inline"
          />
        </div>
      ) : null}
    </div>
  );
}
