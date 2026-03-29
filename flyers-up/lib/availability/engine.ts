import { DateTime, Interval } from 'luxon';
import { bookingWallTimeToUtcIso, normalizeBookingTimeZone } from '@/lib/datetime/booking-instant';
import { DEFAULT_BOOKING_TIMEZONE } from '@/lib/datetime/constants';
import { parseBusinessHoursModel, type BusinessHoursModelV1 } from '@/lib/utils/businessHours';
import { mergeIntervals, subtractIntervals } from '@/lib/availability/intervals';
import { bookingStatusBlocksCustomerSlots } from '@/lib/availability/booking-occupancy';
import type {
  BookableSlot,
  DayAvailabilityLevel,
  MonthDaySummary,
  ProAvailabilityRuleRow,
  ProBlockedTimeRow,
  ProAvailabilitySettingsRow,
} from '@/lib/availability/types';
import { WEEKDAY_KEY_BY_LUXON, luxonWeekdayToJsDay } from '@/lib/availability/types';

export type BookingOccupancyInput = {
  id: string;
  service_date: string;
  service_time: string;
  booking_timezone: string | null | undefined;
  status: string;
  duration_hours?: number | null;
  scheduled_start_at?: string | null;
  scheduled_end_at?: string | null;
  estimated_duration_minutes?: number | null;
};

export type ComputeContext = {
  zone: string;
  businessHoursJson: string | null | undefined;
  rules: ProAvailabilityRuleRow[];
  blockedTimes: ProBlockedTimeRow[];
  blockedDates: string[];
  bookings: BookingOccupancyInput[];
  settings: ProAvailabilitySettingsRow | null;
  /** service_pros.buffer_between_jobs_minutes */
  bufferBetweenJobsMinutes: number;
  /** service_pros.buffer_minutes travel/prep */
  travelBufferMinutes: number;
  /** Effective min lead time (min_notice or service_pros.lead_time) */
  leadTimeMinutes: number;
  maxAdvanceDays: number;
  sameDayEnabled: boolean;
  nowUtc?: DateTime;
};

function parsePgTime(t: string): { h: number; m: number } | null {
  const m = String(t).match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = parseInt(m[1]!, 10);
  const min = parseInt(m[2]!, 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { h, m: min };
}

function workingIntervalsFromRules(
  dateISO: string,
  zone: string,
  rules: ProAvailabilityRuleRow[]
): Interval[] {
  const day = DateTime.fromISO(dateISO, { zone });
  if (!day.isValid) return [];
  const jsDow = luxonWeekdayToJsDay(day.weekday);
  const dayRows = rules.filter((r) => r.day_of_week === jsDow && r.is_available);
  const out: Interval[] = [];
  for (const r of dayRows) {
    const st = parsePgTime(r.start_time);
    const en = parsePgTime(r.end_time);
    if (!st || !en) continue;
    const start = day.set({ hour: st.h, minute: st.m, second: 0, millisecond: 0 });
    const end = day.set({ hour: en.h, minute: en.m, second: 0, millisecond: 0 });
    if (!start.isValid || !end.isValid || end <= start) continue;
    const iv = Interval.fromDateTimes(start, end);
    if (iv.isValid) out.push(iv);
  }
  return mergeIntervals(out);
}

function workingIntervalsFromBusinessHours(dateISO: string, zone: string, model: BusinessHoursModelV1): Interval[] {
  const day = DateTime.fromISO(dateISO, { zone });
  if (!day.isValid) return [];
  const key = WEEKDAY_KEY_BY_LUXON[day.weekday];
  if (!key) return [];
  const d = model.weekly[key];
  if (!d?.enabled) return [];
  const st = parsePgTime(d.start);
  const en = parsePgTime(d.end);
  if (!st || !en) return [];
  const start = day.set({ hour: st.h, minute: st.m, second: 0, millisecond: 0 });
  const end = day.set({ hour: en.h, minute: en.m, second: 0, millisecond: 0 });
  if (!start.isValid || !end.isValid || end <= start) return [];
  const iv = Interval.fromDateTimes(start, end);
  return iv.isValid ? [iv] : [];
}

function effectiveWorkingIntervals(dateISO: string, ctx: ComputeContext): Interval[] {
  const day = DateTime.fromISO(dateISO, { zone: ctx.zone });
  if (!day.isValid) return [];
  if (ctx.rules.length > 0) {
    return workingIntervalsFromRules(dateISO, ctx.zone, ctx.rules);
  }
  const model = parseBusinessHoursModel(ctx.businessHoursJson ?? null);
  return workingIntervalsFromBusinessHours(dateISO, ctx.zone, model);
}

function blockedUtcIntervalsForDay(dateISO: string, ctx: ComputeContext): Interval[] {
  const zone = ctx.zone;
  const dayStart = DateTime.fromISO(dateISO, { zone }).startOf('day');
  const dayEnd = dayStart.plus({ days: 1 });
  if (!dayStart.isValid) return [];
  const out: Interval[] = [];
  for (const b of ctx.blockedTimes) {
    const s = DateTime.fromISO(b.start_at, { zone: 'utc' });
    const e = DateTime.fromISO(b.end_at, { zone: 'utc' });
    if (!s.isValid || !e.isValid || e <= s) continue;
    const localS = s.setZone(zone);
    const localE = e.setZone(zone);
    if (localE <= dayStart || localS >= dayEnd) continue;
    const clipStart = localS < dayStart ? dayStart : localS;
    const clipEnd = localE > dayEnd ? dayEnd : localE;
    if (clipEnd <= clipStart) continue;
    const iv = Interval.fromDateTimes(clipStart, clipEnd);
    if (iv.isValid) out.push(iv);
  }
  return mergeIntervals(out);
}

function bookingServiceIntervalUtc(b: BookingOccupancyInput, ctx: ComputeContext): Interval | null {
  if (b.scheduled_start_at && b.scheduled_end_at) {
    const s = DateTime.fromISO(b.scheduled_start_at, { zone: 'utc' });
    const e = DateTime.fromISO(b.scheduled_end_at, { zone: 'utc' });
    if (s.isValid && e.isValid && e > s) return Interval.fromDateTimes(s, e);
  }
  const tz = normalizeBookingTimeZone(b.booking_timezone ?? ctx.zone);
  const durMin =
    Math.round(Number(b.estimated_duration_minutes ?? 0)) ||
    Math.round(Number(b.duration_hours ?? 1) * 60) ||
    60;
  const startIso = bookingWallTimeToUtcIso(b.service_date, b.service_time, tz);
  if (!startIso) return null;
  const s = DateTime.fromISO(startIso, { zone: 'utc' });
  const e = s.plus({ minutes: durMin });
  if (!s.isValid || !e.isValid) return null;
  return Interval.fromDateTimes(s, e);
}

function bookingOccupancyIntervals(ctx: ComputeContext): Interval[] {
  const out: Interval[] = [];
  const padMin =
    Math.max(0, ctx.bufferBetweenJobsMinutes) +
    Math.max(0, ctx.travelBufferMinutes) +
    Math.max(0, ctx.settings?.buffer_before_minutes ?? 0) +
    Math.max(0, ctx.settings?.buffer_after_minutes ?? 0);

  for (const b of ctx.bookings) {
    if (!bookingStatusBlocksCustomerSlots(b.status)) continue;
    const ivUtc = bookingServiceIntervalUtc(b, ctx);
    if (!ivUtc?.isValid) continue;
    const s = ivUtc.start!;
    const e = ivUtc.end!;
    const exS = s.minus({ minutes: padMin }).setZone(ctx.zone);
    const exE = e.plus({ minutes: padMin }).setZone(ctx.zone);
    const expanded = Interval.fromDateTimes(exS, exE);
    if (expanded.isValid) out.push(expanded);
  }
  return mergeIntervals(out);
}

function alignUpToGrid(dt: DateTime, intervalMin: number): DateTime {
  const dayStart = dt.startOf('day');
  const mins = dt.diff(dayStart, 'minutes').minutes;
  const step = Math.max(5, intervalMin);
  const rounded = Math.ceil(mins / step) * step;
  return dayStart.plus({ minutes: rounded });
}

function isBeyondMaxAdvance(dateISO: string, ctx: ComputeContext): boolean {
  const now = ctx.nowUtc ?? DateTime.utc();
  const today = now.setZone(ctx.zone).startOf('day');
  const d = DateTime.fromISO(dateISO, { zone: ctx.zone }).startOf('day');
  if (!d.isValid) return true;
  const lastBookable = today.plus({ days: ctx.maxAdvanceDays });
  return d > lastBookable;
}

export function computeFreeLocalIntervals(dateISO: string, ctx: ComputeContext): Interval[] {
  if (ctx.blockedDates.includes(dateISO)) return [];
  if (isBeyondMaxAdvance(dateISO, ctx)) return [];

  let work = effectiveWorkingIntervals(dateISO, ctx);
  if (work.length === 0) return [];

  const blockedLocal = blockedUtcIntervalsForDay(dateISO, ctx);
  work = subtractIntervals(work, blockedLocal);

  const occLocal = bookingOccupancyIntervals(ctx);
  work = subtractIntervals(work, occLocal);

  return mergeIntervals(work);
}

export function computeSlotsForDay(
  dateISO: string,
  durationMinutes: number,
  ctx: ComputeContext
): BookableSlot[] {
  const zone = ctx.zone;
  const now = ctx.nowUtc ?? DateTime.utc();
  const slotStep = ctx.settings?.slot_interval_minutes ?? 30;
  const free = computeFreeLocalIntervals(dateISO, ctx);
  const slots: BookableSlot[] = [];
  const today = now.setZone(zone).toISODate();
  const dayDt = DateTime.fromISO(dateISO, { zone });
  if (!dayDt.isValid) return [];

  if (!ctx.sameDayEnabled && dateISO === today) {
    return [];
  }

  const earliestStartUtc = now.plus({ minutes: ctx.leadTimeMinutes });

  for (const seg of free) {
    if (!seg.isValid) continue;
    const segStart = seg.start;
    const segEnd = seg.end;
    if (!segStart || !segEnd) continue;
    let cur = alignUpToGrid(segStart, slotStep);
    if (cur < segStart) cur = segStart;
    while (true) {
      const slotEnd = cur.plus({ minutes: durationMinutes });
      if (slotEnd > segEnd) break;
      const startUtc = cur.toUTC();
      if (startUtc < earliestStartUtc) {
        cur = cur.plus({ minutes: slotStep });
        continue;
      }
      const startIso = startUtc.toISO();
      if (!startIso) break;
      slots.push({
        value: cur.toFormat('HH:mm'),
        label: cur.setLocale('en-US').toFormat('h:mm a'),
        startAtUtc: startIso,
      });
      cur = cur.plus({ minutes: slotStep });
    }
  }

  return slots;
}

export function dayLevel(slotCount: number, hadWorkingHours: boolean): DayAvailabilityLevel {
  if (!hadWorkingHours) return 'unavailable';
  if (slotCount <= 0) return 'fully_booked';
  if (slotCount <= 2) return 'limited';
  return 'available';
}

export function computeMonthSummaries(
  year: number,
  month: number,
  durationMinutes: number,
  ctx: ComputeContext
): MonthDaySummary[] {
  const zone = ctx.zone;
  const first = DateTime.fromObject({ year, month, day: 1 }, { zone });
  if (!first.isValid) return [];
  const out: MonthDaySummary[] = [];
  const today = (ctx.nowUtc ?? DateTime.utc()).setZone(zone).toISODate();
  for (let d = first; d.month === month; d = d.plus({ days: 1 })) {
    const dateISO = d.toISODate();
    if (!dateISO) continue;
    if (ctx.blockedDates.includes(dateISO)) {
      out.push({ date: dateISO, level: 'unavailable', slotCount: 0 });
      continue;
    }
    if (!ctx.sameDayEnabled && today && dateISO === today) {
      out.push({ date: dateISO, level: 'unavailable', slotCount: 0 });
      continue;
    }
    if (isBeyondMaxAdvance(dateISO, ctx)) {
      out.push({ date: dateISO, level: 'unavailable', slotCount: 0 });
      continue;
    }
    const had =
      effectiveWorkingIntervals(dateISO, ctx).length > 0 && !ctx.blockedDates.includes(dateISO);
    const slots = computeSlotsForDay(dateISO, durationMinutes, ctx);
    out.push({
      date: dateISO,
      level: dayLevel(slots.length, had),
      slotCount: slots.length,
    });
  }
  return out;
}

export function findNextAvailableSlot(
  fromDateISO: string,
  durationMinutes: number,
  ctx: ComputeContext,
  maxDaysAhead = 90
): BookableSlot | null {
  let d = DateTime.fromISO(fromDateISO, { zone: ctx.zone });
  if (!d.isValid) return null;
  const cap = Math.min(maxDaysAhead, ctx.maxAdvanceDays + 1);
  for (let i = 0; i < cap; i++) {
    const iso = d.toISODate();
    if (!iso) break;
    if (isBeyondMaxAdvance(iso, ctx)) break;
    const slots = computeSlotsForDay(iso, durationMinutes, ctx);
    if (slots.length > 0) return slots[0]!;
    d = d.plus({ days: 1 });
  }
  return null;
}

export function assertSlotBookable(
  dateISO: string,
  timeHHmm: string,
  durationMinutes: number,
  ctx: ComputeContext
): { ok: true } | { ok: false; reason: string } {
  if (isBeyondMaxAdvance(dateISO, ctx)) {
    return { ok: false, reason: 'This date is outside the booking window for this pro.' };
  }
  const slots = computeSlotsForDay(dateISO, durationMinutes, ctx);
  const match = slots.find((s) => s.value === timeHHmm);
  if (match) return { ok: true };
  if (ctx.blockedDates.includes(dateISO)) {
    return { ok: false, reason: 'This date is blocked on the pro calendar.' };
  }
  if (effectiveWorkingIntervals(dateISO, ctx).length === 0) {
    return { ok: false, reason: 'The pro is not available on this date.' };
  }
  if (slots.length === 0) {
    return { ok: false, reason: 'No open times match this slot after buffers and existing bookings.' };
  }
  return { ok: false, reason: 'Selected time is not available. Pick a suggested open slot.' };
}

export function resolveCalendarZone(
  settings: ProAvailabilitySettingsRow | null,
  fallback: string | null | undefined
): string {
  const z = settings?.timezone?.trim() || fallback?.trim() || DEFAULT_BOOKING_TIMEZONE;
  return normalizeBookingTimeZone(z);
}

/** UTC instants for proposed service window (for DB + RPC). */
export function proposedBookingUtcWindow(
  dateISO: string,
  timeHHmm: string,
  bookingTimezone: string,
  durationMinutes: number
): { startUtcIso: string; endUtcIso: string } | null {
  const tz = normalizeBookingTimeZone(bookingTimezone);
  const startIso = bookingWallTimeToUtcIso(dateISO, timeHHmm, tz);
  if (!startIso) return null;
  const s = DateTime.fromISO(startIso, { zone: 'utc' });
  const e = s.plus({ minutes: durationMinutes });
  if (!s.isValid || !e.isValid) return null;
  const endIso = e.toISO();
  if (!endIso) return null;
  return { startUtcIso: startIso, endUtcIso: endIso };
}
