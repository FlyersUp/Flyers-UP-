/**
 * Derive a calendar event from a booking.
 * Bookings store wall-clock date+time in booking_timezone; startAt/endAt are always UTC ISO strings.
 */

import {
  DEFAULT_BOOKING_TIMEZONE,
  normalizeBookingTimeZone,
  bookingWallTimeToUtcIso,
  addHoursToUtcIso,
  formatBookingTimeInZone,
} from '@/lib/datetime';
import { isCalendarCommittedStatus } from './committed-states';

export type CalendarEvent = {
  id: string;
  bookingId: string;
  proId: string;
  customerId: string;
  serviceTitle: string;
  serviceDate: string;
  startTime: string;
  endTime: string;
  /** UTC ISO-8601 instant */
  startAt: string;
  /** UTC ISO-8601 instant */
  endAt: string;
  /** IANA timezone used to interpret service_date + service_time */
  timezone: string;
  address: string;
  notes: string | null;
  status: string;
  paymentStatus: string | null;
  detailHref: string;
  chatHref: string;
  customerName?: string | null;
  proDisplayName?: string | null;
  serviceName?: string | null;
  price?: number | null;
};

type BookingRow = {
  id: string;
  customer_id: string;
  pro_id: string;
  service_date: string;
  service_time: string;
  address: string;
  notes: string | null;
  status: string;
  price?: number | null;
  duration_hours?: number | null;
  payment_status?: string | null;
  booking_timezone?: string | null;
  customer?: { fullName?: string | null } | null;
  pro?: { displayName?: string | null; serviceName?: string | null } | null;
};

const DEFAULT_DURATION_HOURS = 1;

export function bookingToCalendarEvent(
  b: BookingRow,
  basePath: 'pro' | 'customer'
): CalendarEvent | null {
  if (!isCalendarCommittedStatus(b.status)) return null;
  if (!b.service_date || !b.service_time) return null;

  const tz = normalizeBookingTimeZone(b.booking_timezone);
  const startAt = bookingWallTimeToUtcIso(b.service_date, b.service_time, tz);
  if (!startAt) return null;

  const durationHours = Number(b.duration_hours) || DEFAULT_DURATION_HOURS;
  const endAt = addHoursToUtcIso(startAt, durationHours);
  if (!endAt) return null;

  return {
    id: b.id,
    bookingId: b.id,
    proId: b.pro_id,
    customerId: b.customer_id,
    serviceTitle: (b.pro as { serviceName?: string } | undefined)?.serviceName ?? 'Service',
    serviceDate: b.service_date,
    startTime: b.service_time,
    endTime: formatBookingTimeInZone(endAt, tz),
    startAt,
    endAt,
    timezone: tz,
    address: b.address ?? '',
    notes: b.notes,
    status: b.status,
    paymentStatus: b.payment_status ?? null,
    detailHref: basePath === 'pro' ? `/pro/jobs/${b.id}` : `/customer/bookings/${b.id}`,
    chatHref: basePath === 'pro' ? `/pro/chat/${b.id}` : `/customer/chat/${b.id}`,
    customerName: (b.customer as { fullName?: string } | undefined)?.fullName ?? null,
    proDisplayName: (b.pro as { displayName?: string } | undefined)?.displayName ?? null,
    serviceName: (b.pro as { serviceName?: string } | undefined)?.serviceName ?? null,
    price: b.price ?? null,
  };
}

export { DEFAULT_BOOKING_TIMEZONE };
