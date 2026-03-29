/**
 * Notification type to icon mapping.
 * Uses lucide-react icon names for visual scanning in the feed.
 */

import type { NotificationType } from './types';
import { NOTIFICATION_TYPES } from './types';

export type NotificationIconName =
  | 'check-circle'
  | 'x-circle'
  | 'message-circle'
  | 'alert-circle'
  | 'rotate-ccw'
  | 'dollar-sign'
  | 'star'
  | 'badge-check'
  | 'alert-triangle'
  | 'clock'
  | 'map-pin'
  | 'play-circle'
  | 'calendar'
  | 'default';

export const NOTIFICATION_ICON_MAP: Record<NotificationType, NotificationIconName> = {
  [NOTIFICATION_TYPES.BOOKING_REQUESTED]: 'clock',
  [NOTIFICATION_TYPES.BOOKING_ACCEPTED]: 'check-circle',
  [NOTIFICATION_TYPES.BOOKING_DECLINED]: 'x-circle',
  [NOTIFICATION_TYPES.BOOKING_CONFIRMED]: 'check-circle',
  [NOTIFICATION_TYPES.BOOKING_ON_THE_WAY]: 'map-pin',
  [NOTIFICATION_TYPES.BOOKING_STARTED]: 'play-circle',
  [NOTIFICATION_TYPES.BOOKING_COMPLETED]: 'check-circle',
  [NOTIFICATION_TYPES.BOOKING_CANCELED]: 'x-circle',
  [NOTIFICATION_TYPES.BOOKING_RESCHEDULE_REQUESTED]: 'calendar',
  [NOTIFICATION_TYPES.BOOKING_RESCHEDULE_UPDATED]: 'calendar',
  [NOTIFICATION_TYPES.MESSAGE_RECEIVED]: 'message-circle',
  [NOTIFICATION_TYPES.PAYMENT_DEPOSIT_PAID]: 'dollar-sign',
  [NOTIFICATION_TYPES.PAYMENT_FAILED]: 'alert-circle',
  [NOTIFICATION_TYPES.PAYMENT_BALANCE_DUE]: 'dollar-sign',
  [NOTIFICATION_TYPES.PAYMENT_REMAINING_PAID]: 'check-circle',
  [NOTIFICATION_TYPES.PAYMENT_REFUNDED]: 'rotate-ccw',
  [NOTIFICATION_TYPES.PAYOUT_SENT]: 'dollar-sign',
  [NOTIFICATION_TYPES.PAYOUT_FAILED]: 'alert-circle',
  [NOTIFICATION_TYPES.REVIEW_RECEIVED]: 'star',
  [NOTIFICATION_TYPES.ACCOUNT_VERIFIED]: 'badge-check',
  [NOTIFICATION_TYPES.ACCOUNT_ACTION_REQUIRED]: 'alert-triangle',
  [NOTIFICATION_TYPES.NEARBY_PRO_ALERT]: 'map-pin',
  [NOTIFICATION_TYPES.RECURRING_REQUEST_NEW]: 'calendar',
  [NOTIFICATION_TYPES.RECURRING_SERIES_APPROVED]: 'check-circle',
  [NOTIFICATION_TYPES.RECURRING_SERIES_DECLINED]: 'x-circle',
  [NOTIFICATION_TYPES.RECURRING_SERIES_COUNTERED]: 'calendar',
  [NOTIFICATION_TYPES.RECURRING_SERIES_PAUSED]: 'alert-circle',
  [NOTIFICATION_TYPES.RECURRING_SERIES_RESUMED]: 'check-circle',
  [NOTIFICATION_TYPES.RECURRING_SERIES_CANCELED]: 'x-circle',
};

export function getIconForNotificationType(type: string): NotificationIconName {
  return NOTIFICATION_ICON_MAP[type as NotificationType] ?? 'default';
}
