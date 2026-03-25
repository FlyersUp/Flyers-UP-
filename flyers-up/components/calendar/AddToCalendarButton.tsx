'use client';

import { useState, useRef, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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

const MENU_CLASS =
  'min-w-[220px] max-w-[min(100vw-24px,300px)] rounded-xl border border-black/10 dark:border-white/10 bg-[var(--surface-solid)] dark:bg-[#1f232a] shadow-[0_12px_40px_-8px_rgba(0,0,0,0.25)] dark:shadow-black/40 py-2';

const ITEM_CLASS =
  'flex min-h-11 items-center px-4 text-sm font-medium text-text hover:bg-black/[0.04] dark:hover:bg-white/[0.06] active:bg-black/[0.07]';

export function AddToCalendarButton({ event, bookingId, booking, className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const ev = event ?? (booking ? buildEventFromBooking(bookingId, booking) : null);
  const icsUrl = `/api/bookings/${bookingId}/ics`;
  const googleUrl = ev && typeof window !== 'undefined' ? googleCalendarAddUrl(ev, window.location.origin) : '#';

  const placeMenu = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const menuWidth = 240;
    const pad = 12;
    let left = r.right - menuWidth;
    left = Math.max(pad, Math.min(left, window.innerWidth - menuWidth - pad));
    const top = Math.min(r.bottom + 8, window.innerHeight - pad);
    setCoords({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    placeMenu();
    const onReposition = () => placeMenu();
    window.addEventListener('scroll', onReposition, true);
    window.addEventListener('resize', onReposition);
    return () => {
      window.removeEventListener('scroll', onReposition, true);
      window.removeEventListener('resize', onReposition);
    };
  }, [open, placeMenu]);

  if (!ev) return null;

  const menu =
    open && typeof document !== 'undefined'
      ? createPortal(
          <>
            <div
              className="fixed inset-0 z-[500] bg-black/20 dark:bg-black/40"
              aria-hidden
              onClick={() => setOpen(false)}
            />
            <div
              role="menu"
              className={`fixed z-[510] ${MENU_CLASS}`}
              style={{ top: coords.top, left: coords.left }}
            >
              <a
                href={googleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={ITEM_CLASS}
                onClick={() => setOpen(false)}
              >
                Google Calendar
              </a>
              <a
                href={icsUrl}
                download={`flyers-up-${bookingId.slice(0, 8)}.ics`}
                className={ITEM_CLASS}
                onClick={() => setOpen(false)}
              >
                Download .ics (Apple / Outlook)
              </a>
            </div>
          </>,
          document.body
        )
      : null;

  return (
    <div className={`relative ${className}`}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="min-h-11 px-4 py-2 rounded-xl text-sm font-semibold border border-black/10 dark:border-white/10 bg-[var(--surface-solid)] dark:bg-[#1f232a] text-text shadow-sm hover:bg-surface2"
      >
        Add to calendar
      </button>
      {menu}
    </div>
  );
}
