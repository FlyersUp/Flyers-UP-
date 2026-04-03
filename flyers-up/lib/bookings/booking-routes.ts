/**
 * Canonical in-app paths for booking detail views.
 * Keep in sync with `lib/notifications/routing.ts` (`getTargetPathForNotification` with bookingId).
 */

export function bookingDetailPathForRole(role: 'customer' | 'pro', bookingId: string): string {
  const prefix = role === 'pro' ? '/pro' : '/customer';
  return `${prefix}/bookings/${bookingId}`;
}

export function bookingDepositPath(bookingId: string): string {
  return `/customer/bookings/${bookingId}/deposit`;
}

export function bookingConfirmedPath(bookingId: string, options?: { phase?: 'final' }): string {
  const q = options?.phase === 'final' ? '?phase=final' : '';
  return `/bookings/${bookingId}/confirmed${q}`;
}

export function bookingFinalCheckoutPath(bookingId: string): string {
  return `/bookings/${bookingId}/checkout?phase=final`;
}
