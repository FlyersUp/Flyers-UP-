/**
 * Reminder timing configuration.
 * Clean abstraction for future SMS/email/push support.
 */

export const REMINDER_OFFSETS = {
  /** 24 hours before service */
  HOURS_24: 24 * 60,
  /** 2 hours before service */
  HOURS_2: 2 * 60,
  /** 30 minutes before service */
  MINUTES_30: 30,
  /** At service start time */
  NOW: 0,
  /** Final payment due (uses remaining_due_at, not service time) */
  FINAL_PAYMENT: 'final_payment',
} as const;

export type ReminderType =
  | 'booking_24h'
  | 'booking_2h'
  | 'booking_30m'
  | 'booking_now'
  | 'final_payment_due';

/** Human-readable labels for each reminder type. */
export const REMINDER_LABELS: Record<ReminderType, string> = {
  booking_24h: '24 hours before',
  booking_2h: '2 hours before',
  booking_30m: '30 minutes before',
  booking_now: 'Starts now',
  final_payment_due: 'Final payment due',
};

/** Minutes before service start for each reminder (or null for non-time-based). */
export function getReminderMinutesBefore(type: ReminderType): number | null {
  switch (type) {
    case 'booking_24h':
      return 24 * 60;
    case 'booking_2h':
      return 2 * 60;
    case 'booking_30m':
      return 30;
    case 'booking_now':
      return 0;
    default:
      return null;
  }
}
