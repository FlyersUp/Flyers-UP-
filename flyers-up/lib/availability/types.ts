import type { WeekdayKey } from '@/lib/utils/businessHours';

export type DayAvailabilityLevel = 'unavailable' | 'fully_booked' | 'limited' | 'available';

export type MonthDaySummary = {
  date: string;
  level: DayAvailabilityLevel;
  slotCount: number;
};

export type BookableSlot = {
  /** HH:mm 24h in calendar zone (for <input type="time">) */
  value: string;
  /** e.g. 2:30 PM */
  label: string;
  /** ISO instant UTC start */
  startAtUtc: string;
};

export type ProAvailabilityRuleRow = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
};

export type ProBlockedTimeRow = {
  id: string;
  start_at: string;
  end_at: string;
  reason: string | null;
};

export type ProAvailabilitySettingsRow = {
  pro_user_id: string;
  timezone: string;
  slot_interval_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  min_notice_minutes: number;
  max_advance_days: number;
};

/** Luxon weekday 1=Mon..7=Sun → JS 0=Sun..6=Sat */
export function luxonWeekdayToJsDay(luxonWeekday: number): number {
  return luxonWeekday === 7 ? 0 : luxonWeekday;
}

export const WEEKDAY_KEY_BY_LUXON: Record<number, WeekdayKey> = {
  1: 'mon',
  2: 'tue',
  3: 'wed',
  4: 'thu',
  5: 'fri',
  6: 'sat',
  7: 'sun',
};
