/**
 * Parse service_time strings as stored in bookings (customer-facing forms).
 * Returns 24h hours + minutes in the booking's wall-clock (not UTC).
 */

export function parseServiceTime(time: string): { hours: number; minutes: number } | null {
  const t = (time || '').trim();
  if (!t) return null;

  const ampm = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = parseInt(ampm[2], 10);
    const pm = ampm[3].toUpperCase() === 'PM';
    if (pm && h !== 12) h += 12;
    if (!pm && h === 12) h = 0;
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return { hours: h, minutes: m };
  }

  const military = t.match(/^(\d{1,2}):(\d{2})$/);
  if (military) {
    const h = parseInt(military[1], 10);
    const m = parseInt(military[2], 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return { hours: h, minutes: m };
  }

  return null;
}
