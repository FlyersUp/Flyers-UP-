'use client';

import type { MoneyUiPresentation } from '@/lib/bookings/money-presentation';
import { PaymentHeldCustomerCard } from './PaymentHeldCustomerCard';
import { PaymentHeldProCard } from './PaymentHeldProCard';

export function PaymentHeldStatusCard({
  view,
  presentation,
  bookingHref,
  detailsHref,
  supportHref,
  className,
}: {
  view: 'pro' | 'customer';
  presentation: MoneyUiPresentation;
  bookingHref: string;
  detailsHref?: string;
  supportHref?: string;
  className?: string;
}) {
  if (view === 'customer') {
    return (
      <PaymentHeldCustomerCard
        presentation={presentation}
        bookingHref={bookingHref}
        supportHref={supportHref}
        className={className}
      />
    );
  }
  return (
    <PaymentHeldProCard
      presentation={presentation}
      detailsHref={detailsHref ?? bookingHref}
      supportHref={supportHref}
      className={className}
    />
  );
}
