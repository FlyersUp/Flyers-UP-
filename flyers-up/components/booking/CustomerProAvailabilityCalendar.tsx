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
    'bg-surface2/90 text-muted cursor-not-allowed line-through decoration-muted/50 border border-dashed border-border/70 opacity-80',
  fully_booked:
    'bg-rose-500/18 text-rose-950 dark:text-rose-50 cursor-not-allowed border-2 border-rose-600/50 dark:border-rose-400/45 shadow-[inset_0_0_0_1px_rgba(225,29,72,0.12)]',
  limited:
    'bg-amber-100/95 text-amber-950 dark:bg-amber-950/40 dark:text-amber-50 border-2 border-dashed border-amber-600/60 dark:border-amber-400/55',
  available:
    'bg-emerald-500/14 text-emerald-900 dark:text-emerald-100 border border-emerald-600/30 dark:border-emerald-400/25 hover:ring-2 hover:ring-accent/40',
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
};

export function CustomerProAvailabilityCalendar({
  proId,
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime,
  durationMinutes = 60,
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
    <div className="space-y-4 rounded-2xl border border-border bg-surface2/30 p-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={goPrev}
          className="rounded-lg border border-border p-2 hover:bg-surface2"
          aria-label="Previous month"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-text">{cursor.setLocale('en-US').toFormat('MMMM yyyy')}</p>
          <p className="text-xs text-muted">Times in {zone}</p>
        </div>
        <button
          type="button"
          onClick={goNext}
          className="rounded-lg border border-border p-2 hover:bg-surface2"
          aria-label="Next month"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {loadingMonth ? (
        <div className="h-48 animate-pulse rounded-xl bg-surface2" />
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wide text-muted">
            {headers.map((h) => (
              <div key={h}>{h}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {grid.cells.map((cell, idx) => {
              if (!cell.date) {
                return <div key={`e-${idx}`} className="aspect-square" />;
              }
              const level: DayLevel = cell.summary?.level ?? 'unavailable';
              const isSelected = cell.date === selectedDate;
              const disabled = level === 'unavailable' || level === 'fully_booked';
              return (
                <button
                  key={cell.date}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelectDate(cell.date!)}
                  className={`aspect-square rounded-lg text-xs font-medium transition-all ${levelStyles[level]} ${
                    isSelected ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg' : ''
                  }`}
                >
                  {DateTime.fromISO(cell.date, { zone: zone }).day}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-text2">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-4 w-4 shrink-0 rounded-md border border-emerald-600/35 bg-emerald-500/14" /> Open
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-4 w-4 shrink-0 rounded-md border-2 border-dashed border-amber-600/60 bg-amber-100/95 dark:bg-amber-950/40" />{' '}
              Limited
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-4 w-4 shrink-0 rounded-md border-2 border-rose-600/50 bg-rose-500/18" /> Booked
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-4 w-4 shrink-0 rounded-md border border-dashed border-border/70 bg-surface2 line-through opacity-80" />{' '}
              Off
            </span>
          </div>
        </>
      )}

      <div className="border-t border-border pt-4">
        <p className="text-sm font-medium text-text mb-2">
          {selectedDate
            ? DateTime.fromISO(selectedDate, { zone: zone }).setLocale('en-US').toFormat('ccc, MMM d')
            : 'Pick a date'}
        </p>
        {loadingSlots ? (
          <p className="text-sm text-muted">Loading times…</p>
        ) : selectedDate ? (
          slots.length > 0 ? (
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {slots.map((sl) => (
                <button
                  key={sl.startAtUtc}
                  type="button"
                  onClick={() => onSelectTime(sl.value)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    selectedTime === sl.value
                      ? 'border-accent bg-accent/15 text-text'
                      : 'border-border bg-surface2 text-text hover:border-accent/50'
                  }`}
                >
                  {sl.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted">No open times on this day.</p>
              {nextAvail && (
                <button
                  type="button"
                  className="text-sm font-medium text-accent"
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
          <p className="text-sm text-muted">Choose a day to see open times.</p>
        )}
      </div>
    </div>
  );
}
