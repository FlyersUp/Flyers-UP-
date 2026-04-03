/**
 * Notification routing - target_path for each notification type.
 * Used when user clicks a notification.
 */

import type { NotificationType } from './types';
import { NOTIFICATION_TYPES } from './types';
import { bookingDetailPathForRole } from '@/lib/bookings/booking-routes';

export function getTargetPathForNotification(
  type: NotificationType,
  basePath: 'customer' | 'pro',
  bookingId?: string | null,
  conversationId?: string | null,
  reviewId?: string | null,
  entityType?: string | null,
  entityId?: string | null
): string {
  const bp = basePath ?? 'customer';
  const prefix = bp === 'pro' ? '/pro' : '/customer';

  if (entityType === 'recurring_series' && entityId) {
    return `${prefix}/recurring?series=${encodeURIComponent(entityId)}`;
  }

  if (type === 'nearby_pro_alert' && entityType === 'pro' && entityId) {
    return `${prefix}/pros/${entityId}?nearby=1`;
  }
  if (bookingId) return bookingDetailPathForRole(bp === 'pro' ? 'pro' : 'customer', bookingId);
  if (conversationId) return bp === 'pro' ? `/pro/chat/conversation/${conversationId}` : `${prefix}/chat/conversation/${conversationId}`;
  if (reviewId) return `${prefix}/reviews/${reviewId}`;

  switch (type) {
    case NOTIFICATION_TYPES.PAYMENT_FAILED:
    case NOTIFICATION_TYPES.PAYMENT_BALANCE_DUE:
    case NOTIFICATION_TYPES.PAYMENT_REFUNDED:
    case NOTIFICATION_TYPES.PAYMENT_DEPOSIT_PAID:
    case NOTIFICATION_TYPES.PAYMENT_REMAINING_PAID:
      return `${prefix}/bookings`;
    case NOTIFICATION_TYPES.PAYOUT_SENT:
    case NOTIFICATION_TYPES.PAYOUT_FAILED:
      return '/pro/earnings';
    case NOTIFICATION_TYPES.REVIEW_RECEIVED:
      return `${prefix}/reviews`;
    case NOTIFICATION_TYPES.ACCOUNT_VERIFIED:
    case NOTIFICATION_TYPES.ACCOUNT_ACTION_REQUIRED:
      return `${prefix}/settings`;
    default:
      return bp === 'pro' ? '/pro/notifications' : '/customer/notifications';
  }
}
