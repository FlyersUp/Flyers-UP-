/**
 * Reading booking payment state: prefer `payment_lifecycle_status` for new code.
 *
 * Legacy columns remain authoritative for the deposit PaymentIntent until fully migrated:
 * - `payment_status` — UNPAID | PAID | … for deposit PI
 * - `final_payment_status` — final / remaining PI
 *
 * Use `resolveEffectivePaymentLifecycle()` for UI and new server checks so one place maps legacy → lifecycle.
 */

import type { BookingPaymentStatus } from '@/lib/bookings/payment-lifecycle-types';
import { isBookingPaymentStatus } from '@/lib/bookings/payment-lifecycle-types';

export type BookingPaymentRow = {
  payment_lifecycle_status?: string | null;
  payment_status?: string | null;
  final_payment_status?: string | null;
  payout_released?: boolean | null;
};

/**
 * Effective lowercase lifecycle for display and branching. Does not replace DB writes — sync services should still update both legacy and lifecycle where needed.
 */
export function resolveEffectivePaymentLifecycle(row: BookingPaymentRow): BookingPaymentStatus {
  const lc = row.payment_lifecycle_status?.trim();
  if (lc && isBookingPaymentStatus(lc)) {
    return lc;
  }

  if (row.payout_released === true) {
    return 'payout_sent';
  }

  const finalPaid = String(row.final_payment_status ?? '').toUpperCase() === 'PAID';
  const depositPaid = String(row.payment_status ?? '').toUpperCase() === 'PAID';

  if (finalPaid) {
    return 'final_paid';
  }
  if (depositPaid) {
    return 'deposit_paid';
  }
  if (String(row.final_payment_status ?? '').toUpperCase() === 'FAILED') {
    return 'payment_failed';
  }
  if (String(row.payment_status ?? '').toUpperCase() === 'FAILED') {
    return 'payment_failed';
  }

  return 'unpaid';
}
