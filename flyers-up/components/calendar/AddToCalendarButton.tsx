'use client';

import { useState } from 'react';
import type { CalendarEvent } from '@/lib/calendar/event-from-booking';
import { googleCalendarAddUrl } from '@/lib/calendar/ics';
import {
  DEFAULT_BOOKING_TIMEZONE,
  bookingWallTimeToUtcIso,
  addHoursToUtcIso,
  formatBookingTimeInZone,
} from '@/lib/datetime';

type Props = {
  event?: CalendarEvent;
  bookingId: string;
  /** Minimal booking data when event is not provided */
  booking?: {
    serviceDate: string;
    serviceTime: string;
    serviceTitle: string;
    address?: string;
    durationHours?: number;
    /** Optional IANA zone; defaults to app booking zone */
    bookingTimezone?: string;
  };
  className?: string;
};

function buildEventFromBooking(
  bookingId: string,
  b: NonNullable<Props['booking']>
): CalendarEvent | null {
  const tz = b.bookingTimezone ?? DEFAULT_BOOKING_TIMEZONE;
  const startIso = bookingWallTimeToUtcIso(b.serviceDate, b.serviceTime, tz);
  if (!startIso) return null;
  const endIso = addHoursToUtcIso(startIso, b.durationHours ?? 1);
  if (!endIso) return null;
  return {
    id: bookingId,
    bookingId,
    proId: '',
    customerId: '',
    serviceTitle: b.serviceTitle,
    serviceDate: b.serviceDate,
    startTime: b.serviceTime,
    endTime: formatBookingTimeInZone(endIso, tz),
    startAt: startIso,
    endAt: endIso,
    timezone: tz,
    address: b.address ?? '',
    notes: null,
    status: '',
    paymentStatus: null,
    detailHref: '',
    chatHref: '',
  };
}

export function AddToCalendarButton({ event, bookingId, booking, className = '' }: Props) {
  const [open, setOpen] = useState(false);

  const ev = event ?? (booking ? buildEventFromBooking(bookingId, booking) : null);
  const icsUrl = `/api/bookings/${bookingId}/ics`;
  const googleUrl = ev && typeof window !== 'undefined' ? googleCalendarAddUrl(ev, window.location.origin) : '#';

  if (!ev) return null;

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="px-3 py-2 rounded-lg text-sm font-medium border border-border bg-surface hover:bg-surface2 text-text"
      >
        Add to calendar
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 z-50 min-w-[200px] rounded-lg border border-border bg-bg shadow-lg py-2">
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 text-sm text-text hover:bg-hover"
              onClick={() => setOpen(false)}
            >
              Google Calendar
            </a>
            <a
              href={icsUrl}
              download={`flyers-up-${bookingId.slice(0, 8)}.ics`}
              className="block px-4 py-2 text-sm text-text hover:bg-hover"
              onClick={() => setOpen(false)}
            >
              Download .ics (Apple / Outlook)
            </a>
          </div>
        </>
      )}
    </div>
  );
}
