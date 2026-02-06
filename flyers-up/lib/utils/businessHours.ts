export type WeekdayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type DayHours = {
  enabled: boolean;
  start: string; // "HH:MM"
  end: string; // "HH:MM"
};

export type WeeklyHours = Record<WeekdayKey, DayHours>;

export type BusinessHoursModelV1 = {
  version: 1;
  weekly: WeeklyHours;
  /**
   * If business_hours was previously stored as a freeform string,
   * we keep it here for reference. Saving will overwrite with structured JSON.
   */
  legacyText?: string | null;
};

export const WEEKDAYS: Array<{ key: WeekdayKey; label: string; short: string }> = [
  { key: 'mon', label: 'Monday', short: 'Mon' },
  { key: 'tue', label: 'Tuesday', short: 'Tue' },
  { key: 'wed', label: 'Wednesday', short: 'Wed' },
  { key: 'thu', label: 'Thursday', short: 'Thu' },
  { key: 'fri', label: 'Friday', short: 'Fri' },
  { key: 'sat', label: 'Saturday', short: 'Sat' },
  { key: 'sun', label: 'Sunday', short: 'Sun' },
];

export function defaultBusinessHoursModel(): BusinessHoursModelV1 {
  const make = (enabled: boolean): DayHours => ({ enabled, start: '09:00', end: '17:00' });
  return {
    version: 1,
    weekly: {
      mon: make(true),
      tue: make(true),
      wed: make(true),
      thu: make(true),
      fri: make(true),
      sat: make(false),
      sun: make(false),
    },
    legacyText: null,
  };
}

function isWeeklyHours(value: unknown): value is WeeklyHours {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  for (const day of WEEKDAYS) {
    const d = v[day.key] as any;
    if (!d || typeof d !== 'object') return false;
    if (typeof d.enabled !== 'boolean') return false;
    if (typeof d.start !== 'string' || typeof d.end !== 'string') return false;
  }
  return true;
}

export function parseBusinessHoursModel(input: string | null | undefined): BusinessHoursModelV1 {
  if (!input || input.trim() === '') return defaultBusinessHoursModel();

  try {
    const obj = JSON.parse(input) as any;
    if (obj && typeof obj === 'object' && obj.version === 1 && isWeeklyHours(obj.weekly)) {
      return {
        version: 1,
        weekly: obj.weekly,
        legacyText: typeof obj.legacyText === 'string' ? obj.legacyText : null,
      };
    }
  } catch {
    // fall through
  }

  const m = defaultBusinessHoursModel();
  m.legacyText = input;
  return m;
}

export function stringifyBusinessHoursModel(model: BusinessHoursModelV1): string {
  // Persist only what we need; include legacyText if present for provenance.
  return JSON.stringify({
    version: 1,
    weekly: model.weekly,
    ...(model.legacyText ? { legacyText: model.legacyText } : {}),
  });
}

export function validateWeeklyHours(weekly: WeeklyHours): string | null {
  for (const { key, label } of WEEKDAYS) {
    const d = weekly[key];
    if (!d.enabled) continue;
    if (!d.start || !d.end) return `${label}: select both start and end times.`;
    if (d.start >= d.end) return `${label}: end time must be after start time.`;
  }
  return null;
}

function formatTimeForDisplay(hhmm: string): string {
  // Input type="time" gives "HH:MM" in 24h.
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = ((h + 11) % 12) + 1;
  const mm = String(m).padStart(2, '0');
  return `${hour12}:${mm} ${suffix}`;
}

export function summarizeBusinessHours(model: BusinessHoursModelV1): string {
  const parts: string[] = [];
  for (const { key, short } of WEEKDAYS) {
    const d = model.weekly[key];
    if (!d.enabled) continue;
    parts.push(`${short} ${formatTimeForDisplay(d.start)}–${formatTimeForDisplay(d.end)}`);
  }
  if (parts.length === 0) return 'No availability set';
  return parts.join(', ');
}

