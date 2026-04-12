'use client';

import { useRouter } from 'next/navigation';
import type { FlaggedPayoutReviewItem } from '@/lib/admin/flagged-payout-review';
import { AdminBookingPayoutReviewCard } from '@/components/admin/AdminBookingPayoutReviewCard';

type Props = {
  bookingId: string;
  data: FlaggedPayoutReviewItem;
};

export function PayoutReviewIsland({ bookingId, data }: Props) {
  const router = useRouter();
  return (
    <AdminBookingPayoutReviewCard
      bookingId={bookingId}
      data={data}
      onReleased={async () => {
        router.refresh();
      }}
      onHeld={async () => {
        router.refresh();
      }}
      onRefunded={async () => {
        router.refresh();
      }}
    />
  );
}
