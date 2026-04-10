'use client';

import type { PaymentHeldUiState } from '@/lib/bookings/payment-held-ui-state';
import { PaymentHeldCustomerCard } from './PaymentHeldCustomerCard';
import { PaymentHeldProCard } from './PaymentHeldProCard';

export function PaymentHeldStatusCard({
  view,
  state,
  bookingHref,
  detailsHref,
  supportHref,
  className,
}: {
  view: 'pro' | 'customer';
  state: PaymentHeldUiState;
  bookingHref: string;
  detailsHref?: string;
  supportHref?: string;
  className?: string;
}) {
  if (view === 'customer') {
    return (
      <PaymentHeldCustomerCard
        state={state}
        bookingHref={bookingHref}
        supportHref={supportHref}
        className={className}
      />
    );
  }
  return (
    <PaymentHeldProCard
      state={state}
      detailsHref={detailsHref ?? bookingHref}
      supportHref={supportHref}
      className={className}
    />
  );
}
