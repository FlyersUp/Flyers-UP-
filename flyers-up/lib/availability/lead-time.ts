import { DateTime } from 'luxon';

/** Marketplace floor for same-calendar-day bookings (pro local day). Future days use pro settings only. */
export const MIN_SAME_DAY_LEAD_MINUTES = 90;

export function effectiveLeadMinutesForCalendarDate(
  dateISO: string,
  ctx: { zone: string; leadTimeMinutes: number; nowUtc?: DateTime }
): number {
  const now = ctx.nowUtc ?? DateTime.utc();
  const today = now.setZone(ctx.zone).toISODate();
  if (today && dateISO === today) {
    return Math.max(ctx.leadTimeMinutes, MIN_SAME_DAY_LEAD_MINUTES);
  }
  return ctx.leadTimeMinutes;
}
