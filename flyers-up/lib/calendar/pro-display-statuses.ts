/**
 * Bookings loaded for the pro work calendar and schedule APIs.
 * Open requests use GET /api/pro/bookings?statuses=requested,pending — not the calendar.
 */

import { CALENDAR_COMMITTED_STATUSES } from '@/lib/calendar/committed-states';

export const PRO_CALENDAR_DISPLAY_STATUSES = [...CALENDAR_COMMITTED_STATUSES] as const;
