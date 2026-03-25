/**
 * YYYY-MM-DD from a Date created via the browser calendar grid (local getFullYear/Month/Date).
 * Do not use toISOString().slice(0, 10) — that uses UTC and shifts dates near midnight.
 */
export function localCalendarDateToYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
