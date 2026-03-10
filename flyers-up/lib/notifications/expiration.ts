/**
 * Notification expiration rules.
 * Some notifications auto-expire to prevent clutter.
 */

import type { NotificationType } from './types';
import { NOTIFICATION_TYPES } from './types';

/** Expiration in days. null = never expires */
export const NOTIFICATION_EXPIRATION_DAYS: Partial<Record<NotificationType, number | null>> = {
  [NOTIFICATION_TYPES.BOOKING_REQUESTED]: 7,
  [NOTIFICATION_TYPES.BOOKING_ACCEPTED]: 30,
  [NOTIFICATION_TYPES.BOOKING_DECLINED]: 30,
  [NOTIFICATION_TYPES.BOOKING_CONFIRMED]: 30,
  [NOTIFICATION_TYPES.BOOKING_ON_THE_WAY]: 7,
  [NOTIFICATION_TYPES.BOOKING_STARTED]: 7,
  [NOTIFICATION_TYPES.BOOKING_COMPLETED]: 90,
  [NOTIFICATION_TYPES.BOOKING_CANCELED]: 30,
  [NOTIFICATION_TYPES.BOOKING_RESCHEDULE_REQUESTED]: 14,
  [NOTIFICATION_TYPES.BOOKING_RESCHEDULE_UPDATED]: 14,
  [NOTIFICATION_TYPES.MESSAGE_RECEIVED]: null,
  [NOTIFICATION_TYPES.PAYMENT_DEPOSIT_PAID]: 90,
  [NOTIFICATION_TYPES.PAYMENT_FAILED]: 30,
  [NOTIFICATION_TYPES.PAYMENT_BALANCE_DUE]: 30,
  [NOTIFICATION_TYPES.PAYMENT_REMAINING_PAID]: 90,
  [NOTIFICATION_TYPES.PAYMENT_REFUNDED]: 90,
  [NOTIFICATION_TYPES.PAYOUT_SENT]: 90,
  [NOTIFICATION_TYPES.PAYOUT_FAILED]: 30,
  [NOTIFICATION_TYPES.REVIEW_RECEIVED]: null,
  [NOTIFICATION_TYPES.ACCOUNT_VERIFIED]: null,
  [NOTIFICATION_TYPES.ACCOUNT_ACTION_REQUIRED]: null,
  [NOTIFICATION_TYPES.NEARBY_PRO_ALERT]: 1,
};

/** Marketing category notifications expire in 7 days */
export const MARKETING_EXPIRATION_DAYS = 7;

export function getExpiresAt(type: NotificationType, category?: string): string | null {
  let days = NOTIFICATION_EXPIRATION_DAYS[type];
  if (days == null && category === 'marketing') days = MARKETING_EXPIRATION_DAYS;
  if (days == null || days <= 0) return null;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
