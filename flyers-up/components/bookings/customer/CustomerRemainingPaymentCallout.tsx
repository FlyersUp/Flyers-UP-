'use client';

/**
 * Same contract as `BookingPaymentStatusCard`: build `paymentInput` with
 * `customerRemainingPaymentUiInputFromBookingSlice`; do not hand-shape
 * `CustomerRemainingPaymentUiInput` unless there is a documented exception.
 */

import {
  BookingPaymentStatusCard,
  type BookingPaymentStatusCardProps,
} from '@/components/bookings/customer/BookingPaymentStatusCard';

export type CustomerRemainingPaymentCalloutProps = BookingPaymentStatusCardProps;

/** Thin alias for `BookingPaymentStatusCard` — kept for existing imports. */
export function CustomerRemainingPaymentCallout(props: CustomerRemainingPaymentCalloutProps) {
  return <BookingPaymentStatusCard {...props} />;
}
