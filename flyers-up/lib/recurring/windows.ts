import { DateTime } from 'luxon';

export type RecurringWindowRow = {
  day_of_week: number;
  start_minute: number;
  end_minute: number;
  occupation_slug: string | null;
  recurring_only: boolean;
  is_flexible: boolean;
  is_active: boolean;
};

/**
 * If recurring_only_windows_enabled and series is locked + not flexible, the slot must fall inside an active window.
 * Flexible series or flexible window skips hard blocking.
 */
export function slotFitsRecurringWindows(params: {
  windowsEnabled: boolean;
  seriesRecurringSlotLocked: boolean;
  seriesFlexible: boolean;
  windows: RecurringWindowRow[];
  occupationSlug: string;
  localStart: DateTime;
  durationMinutes: number;
}): boolean {
  if (!params.windowsEnabled || !params.seriesRecurringSlotLocked || params.seriesFlexible) {
    return true;
  }

  const dow = params.localStart.weekday === 7 ? 0 : params.localStart.weekday;
  const startMin = params.localStart.hour * 60 + params.localStart.minute;
  const endMin = startMin + params.durationMinutes;

  const relevant = params.windows.filter(
    (w) =>
      w.is_active &&
      w.recurring_only &&
      !w.is_flexible &&
      w.day_of_week === dow &&
      (w.occupation_slug == null || w.occupation_slug === params.occupationSlug)
  );

  if (relevant.length === 0) return false;

  return relevant.some((w) => startMin >= w.start_minute && endMin <= w.end_minute);
}
