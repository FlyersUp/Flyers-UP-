'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DateTime } from 'luxon';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DEFAULT_BOOKING_TIMEZONE } from '@/lib/datetime';

type DayLevel = 'unavailable' | 'fully_booked' | 'limited' | 'available';

type DaySummary = { date: string; level: DayLevel; slotCount: number };

type Slot = { value: string; label: string; startAtUtc: string };

const levelStyles: Record<DayLevel, string> = {
  unavailable:
    'bg-[#F5F6F8] text-[#9CA3AF] cursor-not-allowed line-through decoration-[#9CA3AF]/60 border border-[#E8EAED]',
  fully_booked:
    'bg-rose-50 text-rose-900 dark:text-rose-50 cursor-not-allowed border border-rose-200/90 dark:border-rose-400/45 dark:bg-rose-950/30',
  limited:
    'bg-amber-50 text-amber-950 border border-amber-200/90 dark:bg-amber-950/35 dark:text-amber-50 dark:border-amber-400/45',
  available:
    'bg-white text-[#2d3436] border border-[#E5E7EB] hover:border-[#4A69BD]/40 dark:bg-[#1a1d24] dark:text-white/90 dark:border-white/12',
};

function weekdayHeaders(zone: string) {
  const sun = DateTime.fromObject({ year: 2020, month: 1, day: 5 }, { zone });
  return Array.from({ length: 7 }, (_, i) => sun.plus({ days: i }).toFormat('ccc'));
}

type Props = {
  proId: string;
  selectedDate: string;
  selectedTime: string;
  onSelectDate: (isoDate: string) => void;
  onSelectTime: (hhmm: string) => void;
  durationMinutes?: number;
  /** YYYY-MM-DD — days before this are not selectable (must match native date input `min`). */
  minimumDateIso?: string;
  /** Fired when month/day APIs resolve the pro calendar timezone (aligns parent min date with slots). */
  onCalendarTimezone?: (ianaZone: string) => void;
  /** Used for accessible titles on disabled days (same-day vs lead-time). */
  sameDayBookingEnabled?: boolean;
};

export function CustomerProAvailabilityCalendar({
  proId,
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime,
  durationMinutes = 60,
  minimumDateIso,
  onCalendarTimezone,
  sameDayBookingEnabled = false,
}: Props) {
  const [zone, setZone] = useState(DEFAULT_BOOKING_TIMEZONE);
  const [cursor, setCursor] = useState(() => {
    const d = selectedDate
      ? DateTime.fromISO(selectedDate, { zone: DEFAULT_BOOKING_TIMEZONE })
      : DateTime.now().setZone(DEFAULT_BOOKING_TIMEZONE);
    return d.isValid ? d : DateTime.now().setZone(DEFAULT_BOOKING_TIMEZONE);
  });
  const [days, setDays] = useState<DaySummary[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [nextAvail, setNextAvail] = useState<Slot | null>(null);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const year = cursor.year;
  const month = cursor.month;

  const headers = useMemo(() => weekdayHeaders(zone), [zone]);
  const todayInZone = useMemo(() => DateTime.now().setZone(zone).toISODate() ?? '', [zone]);

  useEffect(() => {
    onCalendarTimezone?.(zone);
  }, [zone, onCalendarTimezone]);

  const monthParam = `${year}-${String(month).padStart(2, '0')}`;

  const loadMonth = useCallback(async () => {
    setLoadingMonth(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/pros/${encodeURIComponent(proId)}/availability/month?month=${encodeURIComponent(monthParam)}&durationMinutes=${durationMinutes}`,
        { cache: 'no-store', credentials: 'include' }
      );
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setDays([]);
        setError(json.error || 'Could not load calendar');
        return;
      }
      if (typeof json.timezone === 'string' && json.timezone.trim()) {
        setZone(json.timezone.trim());
      }
      setDays(Array.isArray(json.days) ? json.days : []);
    } catch {
      setDays([]);
      setError('Could not load calendar');
    } finally {
      setLoadingMonth(false);
    }
  }, [proId, monthParam, durationMinutes]);

  const loadSlots = useCallback(
    async (date: string) => {
      if (!date) return;
      setLoadingSlots(true);
      try {
        const res = await fetch(
          `/api/pros/${encodeURIComponent(proId)}/availability/day?date=${encodeURIComponent(date)}&durationMinutes=${durationMinutes}`,
          { cache: 'no-store', credentials: 'include' }
        );
        const json = await res.json();
        if (res.ok && json.ok) {
          setSlots(Array.isArray(json.slots) ? json.slots : []);
          setNextAvail(json.nextAvailable ?? null);
          if (typeof json.timezone === 'string' && json.timezone.trim()) {
            setZone(json.timezone.trim());
          }
        } else {
          setSlots([]);
          setNextAvail(null);
        }
      } catch {
        setSlots([]);
        setNextAvail(null);
      } finally {
        setLoadingSlots(false);
      }
    },
    [proId, durationMinutes]
  );

  useEffect(() => {
    void loadMonth();
  }, [loadMonth]);

  useEffect(() => {
    if (selectedDate) void loadSlots(selectedDate);
  }, [selectedDate, loadSlots]);

  const grid = useMemo(() => {
    const first = cursor.startOf('month');
    if (!first.isValid) return { cells: [] as { date: string | null; summary: DaySummary | null }[] };
    const last = cursor.endOf('month');
    const pad = first.weekday % 7;
    const cells: { date: string | null; summary: DaySummary | null }[] = [];
    for (let i = 0; i < pad; i++) cells.push({ date: null, summary: null });
    for (let d = first; d <= last; d = d.plus({ days: 1 })) {
      const iso = d.toISODate();
      if (!iso) continue;
      const summary = days.find((x) => x.date === iso) ?? null;
      cells.push({ date: iso, summary });
    }
    return { cells };
  }, [cursor, days]);

  const goPrev = () => setCursor((c) => c.minus({ months: 1 }));
  const goNext = () => setCursor((c) => c.plus({ months: 1 }));

  return (
    <div className="space-y-5 rounded-[20px] border border-[#E8EAED] bg-white p-5 shadow-[0_4px_24px_rgba(74,105,189,0.06)] dark:border-white/10 dark:bg-[#1a1d24] dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)]">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={goPrev}
          className="rounded-full border border-transparent p-2 text-[#6B7280] transition-colors hover:border-[#E5E7EB] hover:bg-[#F5F6F8] dark:text-white/55 dark:hover:bg-white/10"
          aria-label="Previous month"
        >
          <ChevronLeft size={18} strokeWidth={2} />
        </button>
        <div className="text-center">
          <p className="text-base font-bold tracking-tight text-[#2d3436] dark:text-white">
            {cursor.setLocale('en-US').toFormat('MMMM yyyy')}
          </p>
          <p className="mt-0.5 text-xs text-[#6B7280] dark:text-white/55">Times in {zone}</p>
        </div>
        <button
          type="button"
          onClick={goNext}
          className="rounded-full border border-transparent p-2 text-[#6B7280] transition-colors hover:border-[#E5E7EB] hover:bg-[#F5F6F8] dark:text-white/55 dark:hover:bg-white/10"
          aria-label="Next month"
        >
          <ChevronRight size={18} strokeWidth={2} />
        </button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {loadingMonth ? (
        <div className="h-48 animate-pulse rounded-2xl bg-[#EEF0F3] dark:bg-white/10" />
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-white/50">
            {headers.map((h) => (
              <div key={h}>{h}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {grid.cells.map((cell, idx) => {
              if (!cell.date) {
                return <div key={`e-${idx}`} className="aspect-square" />;
              }
              const level: DayLevel = cell.summary?.level ?? 'unavailable';
              const isSelected = cell.date === selectedDate;
              const beforeMin =
                Boolean(minimumDateIso) && cell.date < (minimumDateIso as string);
              const disabled =
                beforeMin || level === 'unavailable' || level === 'fully_booked';
              let dayTitle: string | undefined;
              if (disabled) {
                if (beforeMin) {
                  dayTitle = sameDayBookingEnabled
                    ? 'This date is before the earliest day you can book.'
                    : 'Same-day booking is off for this pro; choose tomorrow or later.';
                } else if (cell.date === todayInZone && level === 'unavailable') {
                  dayTitle = 'No remaining times today that meet minimum notice.';
                } else if (level === 'fully_booked') {
                  dayTitle = 'No open times left on this day.';
                } else if (level === 'unavailable') {
                  dayTitle = 'This day is not available.';
                }
              }
              return (
                <button
                  key={cell.date}
                  type="button"
                  disabled={disabled}
                  title={dayTitle}
                  onClick={() => onSelectDate(cell.date!)}
                  className={`aspect-square rounded-full text-xs font-semibold transition-colors duration-200 ${levelStyles[level]} ${
                    isSelected && !disabled
                      ? '!border-[#4A69BD] !bg-[#4A69BD] !text-white shadow-md !ring-0 dark:!bg-[#4A69BD]'
                      : ''
                  }`}
                >
                  {DateTime.fromISO(cell.date, { zone: zone }).day}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-[#6B7280] dark:text-white/55">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-4 w-4 shrink-0 rounded-full border border-[#E5E7EB] bg-white dark:border-white/20 dark:bg-white/10" />{' '}
              Open
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-4 w-4 shrink-0 rounded-full border border-amber-200/90 bg-amber-50 dark:border-amber-400/45 dark:bg-amber-950/35" />{' '}
              Limited
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-4 w-4 shrink-0 rounded-full border border-rose-200/90 bg-rose-50 dark:border-rose-400/45 dark:bg-rose-950/30" />{' '}
              Booked
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-4 w-4 shrink-0 rounded-full border border-[#E8EAED] bg-[#F5F6F8] line-through opacity-80 dark:border-white/15 dark:bg-white/10" />{' '}
              Off
            </span>
          </div>
        </>
      )}

      <div className="border-t border-[#EEF0F2] pt-5 dark:border-white/10">
        <p className="mb-3 text-[15px] font-semibold text-[#2d3436] dark:text-white">
          {selectedDate
            ? DateTime.fromISO(selectedDate, { zone: zone }).setLocale('en-US').toFormat('ccc, MMM d')
            : 'Pick a date'}
        </p>
        {loadingSlots ? (
          <p className="text-sm text-[#6B7280] dark:text-white/55">Loading times…</p>
        ) : selectedDate ? (
          slots.length > 0 ? (
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {slots.map((sl) => (
                <button
                  key={sl.startAtUtc}
                  type="button"
                  onClick={() => onSelectTime(sl.value)}
                  className={`min-h-[44px] rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors duration-200 active:scale-[0.98] ${
                    selectedTime === sl.value
                      ? 'border-[#4A69BD] bg-[#4A69BD] text-white shadow-[0_4px_14px_rgba(74,105,189,0.28)]'
                      : 'border-[#E5E7EB] bg-white text-[#2d3436] hover:border-[#4A69BD]/35 dark:border-white/12 dark:bg-[#14161c] dark:text-white/90'
                  }`}
                >
                  {sl.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-[#6B7280] dark:text-white/55">No open times on this day.</p>
              {nextAvail && (
                <button
                  type="button"
                  className="text-sm font-semibold text-[#4A69BD] transition-colors hover:text-[#3d5aa8] dark:text-[#6b8fd4]"
                  onClick={() => {
                    const d = DateTime.fromISO(nextAvail.startAtUtc, { zone: 'utc' }).setZone(zone);
                    const iso = d.toISODate();
                    if (iso) {
                      onSelectDate(iso);
                      onSelectTime(nextAvail.value);
                    }
                  }}
                >
                  Next available: {nextAvail.label}
                  {(() => {
                    const d = DateTime.fromISO(nextAvail.startAtUtc, { zone: 'utc' }).setZone(zone);
                    const iso = d.toISODate();
                    return iso ? ` · ${DateTime.fromISO(iso, { zone: zone }).toFormat('MMM d')}` : '';
                  })()}
                </button>
              )}
            </div>
          )
        ) : (
          <p className="text-sm text-[#6B7280] dark:text-white/55">Choose a day to see open times.</p>
        )}
      </div>
    </div>
  );
}
