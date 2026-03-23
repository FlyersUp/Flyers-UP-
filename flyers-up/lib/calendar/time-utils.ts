/**
 * Parse service_time (e.g. "10:00 AM", "14:00") to hours and minutes.
 * Returns null if unparseable.
 */
export function parseServiceTime(time: string): { hours: number; minutes: number } | null {
  const t = (time || '').trim();
  if (!t) return null;

  // "10:00 AM" / "10:00 PM"
  const ampm = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = parseInt(ampm[2], 10);
    const pm = ampm[3].toUpperCase() === 'PM';
    if (pm && h !== 12) h += 12;
    if (!pm && h === 12) h = 0;
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return { hours: h, minutes: m };
  }

  // "14:00" / "09:30"
  const military = t.match(/^(\d{1,2}):(\d{2})$/);
  if (military) {
    const h = parseInt(military[1], 10);
    const m = parseInt(military[2], 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return { hours: h, minutes: m };
  }

  return null;
}

/** Create Date from YYYY-MM-DD and service_time string. */
export function parseBookingStart(dateISO: string, time: string): Date | null {
  const parsed = parseServiceTime(time);
  if (!parsed) return null;
  const d = new Date(dateISO + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(parsed.hours, parsed.minutes, 0, 0);
  return d;
}

/** Add duration in hours to a start date. */
export function addDurationHours(start: Date, hours: number): Date {
  return new Date(start.getTime() + hours * 60 * 60 * 1000);
}

/** Format date to YYYY-MM-DD. */
export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
