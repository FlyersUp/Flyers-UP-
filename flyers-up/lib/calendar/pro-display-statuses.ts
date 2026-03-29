/**
 * Bookings the pro should see on their work calendar (includes open requests).
 */

import { CALENDAR_COMMITTED_STATUSES } from '@/lib/calendar/committed-states';

export const PRO_CALENDAR_DISPLAY_STATUSES = [
  ...CALENDAR_COMMITTED_STATUSES,
  'requested',
  'pending',
] as const;
