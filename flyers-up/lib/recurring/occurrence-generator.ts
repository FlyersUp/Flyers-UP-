import { DateTime } from 'luxon';
import type { RecurringFrequency } from './types';

export type SeriesOccurrenceInput = {
  timezone: string;
  startDate: string;
  endDate: string | null;
  preferredStartTime: string;
  durationMinutes: number;
  daysOfWeek: number[];
  frequency: RecurringFrequency;
  intervalCount: number;
  horizonDays: number;
  /** Generate from "today" in zone if after series start */
  anchorFrom?: DateTime;
};

function luxonWeekdayToJs(weekday: number): number {
  return weekday === 7 ? 0 : weekday;
}

function parseTimeToParts(t: string): { hour: number; minute: number; second: number } {
  const parts = t.split(':').map((x) => parseInt(x, 10));
  return {
    hour: parts[0] ?? 0,
    minute: parts[1] ?? 0,
    second: parts[2] ?? 0,
  };
}

/**
 * Produces UTC start/end instants for materialized recurring rows.
 */
export function generateOccurrenceWindows(input: SeriesOccurrenceInput): { scheduled_start_at: string; scheduled_end_at: string }[] {
  const zone = input.timezone || 'America/New_York';
  const daysSet = new Set(
    (input.daysOfWeek ?? []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
  );
  if (daysSet.size === 0) return [];

  const startParts = parseTimeToParts(input.preferredStartTime.replace(/Z$/, '').slice(0, 8));
  const seriesStart = DateTime.fromISO(input.startDate, { zone }).startOf('day');
  if (!seriesStart.isValid) return [];

  const anchor = (input.anchorFrom ?? DateTime.now().setZone(zone)).startOf('day');
  let cursor = seriesStart > anchor ? seriesStart : anchor;

  const hardEnd = input.endDate
    ? DateTime.fromISO(input.endDate, { zone }).endOf('day')
    : cursor.plus({ days: input.horizonDays }).endOf('day');
  const horizonEnd = cursor.plus({ days: input.horizonDays }).endOf('day');
  const lastDay = hardEnd < horizonEnd ? hardEnd : horizonEnd;

  const out: { scheduled_start_at: string; scheduled_end_at: string }[] = [];

  if (input.frequency === 'monthly') {
    let m = seriesStart;
    while (m <= lastDay) {
      if (m >= cursor) {
        const startLocal = m.set({
          hour: startParts.hour,
          minute: startParts.minute,
          second: startParts.second,
          millisecond: 0,
        });
        const endLocal = startLocal.plus({ minutes: input.durationMinutes });
        const jsW = luxonWeekdayToJs(startLocal.weekday);
        if (daysSet.has(jsW)) {
          out.push({
            scheduled_start_at: startLocal.toUTC().toISO()!,
            scheduled_end_at: endLocal.toUTC().toISO()!,
          });
        }
      }
      m = m.plus({ months: Math.max(1, input.intervalCount) });
    }
    return dedupeSort(out);
  }

  let d = cursor;
  while (d <= lastDay) {
    const jsW = luxonWeekdayToJs(d.weekday);
    if (!daysSet.has(jsW)) {
      d = d.plus({ days: 1 });
      continue;
    }

    let include = true;
    if (input.frequency === 'biweekly' || input.frequency === 'custom') {
      const stepWeeks = input.frequency === 'biweekly' ? 2 : Math.max(1, input.intervalCount);
      const dayDiff = Math.floor(d.diff(seriesStart.startOf('day'), 'days').days);
      if (dayDiff < 0) {
        d = d.plus({ days: 1 });
        continue;
      }
      const weekIndex = Math.floor(dayDiff / 7);
      include = weekIndex % stepWeeks === 0;
    }

    if (include) {
      const startLocal = d.set({
        hour: startParts.hour,
        minute: startParts.minute,
        second: startParts.second,
        millisecond: 0,
      });
      const endLocal = startLocal.plus({ minutes: input.durationMinutes });
      out.push({
        scheduled_start_at: startLocal.toUTC().toISO()!,
        scheduled_end_at: endLocal.toUTC().toISO()!,
      });
    }
    d = d.plus({ days: 1 });
  }

  return dedupeSort(out);
}

function dedupeSort(rows: { scheduled_start_at: string; scheduled_end_at: string }[]) {
  const seen = new Set<string>();
  const uniq: typeof rows = [];
  for (const r of rows) {
    if (seen.has(r.scheduled_start_at)) continue;
    seen.add(r.scheduled_start_at);
    uniq.push(r);
  }
  uniq.sort((a, b) => a.scheduled_start_at.localeCompare(b.scheduled_start_at));
  return uniq;
}
