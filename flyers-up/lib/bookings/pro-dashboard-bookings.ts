/**
 * Pro dashboard: distinguish pending booking requests from committed schedule.
 * Pending = awaiting pro acceptance; committed = shows on calendar / next booking / upcoming.
 */

import { CALENDAR_COMMITTED_STATUSES, isCalendarCommittedStatus } from '@/lib/calendar/committed-states';

/** DB statuses that belong in Pending Requests (not on schedule until accepted). */
export const PRO_PENDING_REQUEST_STATUSES = ['requested', 'pending'] as const;

export function isProPendingRequestStatus(status: string): boolean {
  const s = (status || '').toLowerCase();
  return (PRO_PENDING_REQUEST_STATUSES as readonly string[]).includes(s);
}

/** Committed bookings only (same rule as pro calendar / mini schedule). */
export function isProCommittedScheduleStatus(status: string): boolean {
  return isCalendarCommittedStatus(status);
}

/**
 * Pro "today" timeline API filter: committed workflow plus same-day terminal payouts.
 * Excludes requested/pending so open requests stay in Pending Requests only.
 */
export const PRO_TODAY_WORK_STATUSES = [
  ...CALENDAR_COMMITTED_STATUSES,
  'completed',
  'paid',
  'fully_paid',
] as const;
