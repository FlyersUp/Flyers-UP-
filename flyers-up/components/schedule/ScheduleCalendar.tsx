'use client';

import { useMemo } from 'react';
import { DateTime } from 'luxon';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DEFAULT_BOOKING_TIMEZONE } from '@/lib/datetime';

const Z = DEFAULT_BOOKING_TIMEZONE;

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

export type ScheduleCalendarProps = {
  /** Any YYYY-MM-DD within the month to display */
  monthAnchorIso: string;
  onMonthAnchorChange: (firstOfMonthIso: string) => void;
  selectedDateIso: string;
  onSelectDate: (ymd: string) => void;
  markedDates: Set<string>;
  className?: string;
};

/** Sunday-first offset: 0 = Sunday column for first of month */
function sundayOffset(firstOfMonth: DateTime): number {
  const wd = firstOfMonth.weekday; // 1=Mon … 7=Sun
  return wd === 7 ? 0 : wd;
}

export function ScheduleCalendar({
  monthAnchorIso,
  onMonthAnchorChange,
  selectedDateIso,
  onSelectDate,
  markedDates,
  className = '',
}: ScheduleCalendarProps) {
  const month = useMemo(() => {
    const d = DateTime.fromISO(monthAnchorIso, { zone: Z });
    return d.isValid ? d.startOf('month') : DateTime.now().setZone(Z).startOf('month');
  }, [monthAnchorIso]);

  const cells = useMemo(() => {
    const first = month.startOf('month');
    const dim = month.daysInMonth ?? 31;
    const offset = sundayOffset(first);
    const total = Math.ceil((offset + dim) / 7) * 7;
    const prev = first.minus({ months: 1 });
    const prevDim = prev.daysInMonth ?? 31;
    const out: { ymd: string; inMonth: boolean; label: number }[] = [];
    for (let i = 0; i < total; i++) {
      if (i < offset) {
        const day = prevDim - offset + i + 1;
        const dt = prev.set({ day });
        out.push({
          ymd: dt.toISODate() ?? '',
          inMonth: false,
          label: day,
        });
      } else if (i < offset + dim) {
        const day = i - offset + 1;
        const dt = first.set({ day });
        out.push({
          ymd: dt.toISODate() ?? '',
          inMonth: true,
          label: day,
        });
      } else {
        const day = i - offset - dim + 1;
        const dt = first.plus({ months: 1 }).set({ day });
        out.push({
          ymd: dt.toISODate() ?? '',
          inMonth: false,
          label: day,
        });
      }
    }
    return out;
  }, [month]);

  const title = month.setLocale('en-US').toFormat('MMMM yyyy');

  const prevMonth = () => {
    const m = month.minus({ months: 1 });
    onMonthAnchorChange(m.toISODate() ?? monthAnchorIso);
  };

  const nextMonth = () => {
    const m = month.plus({ months: 1 });
    onMonthAnchorChange(m.toISODate() ?? monthAnchorIso);
  };

  const todayIso = DateTime.now().setZone(Z).toISODate() ?? '';

  return (
    <div
      className={`rounded-2xl border border-[#E8EAED] bg-white p-4 shadow-[0_4px_24px_rgba(74,105,189,0.08)] transition-shadow dark:border-white/10 dark:bg-[#1a1d24] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)] ${className}`}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-[#2d3436] dark:text-white">{title}</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevMonth}
            className="rounded-full p-2 text-[#2d3436] transition-colors hover:bg-[hsl(var(--accent-customer)/0.12)] dark:text-white dark:hover:bg-white/10"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="rounded-full p-2 text-[#2d3436] transition-colors hover:bg-[hsl(var(--accent-customer)/0.12)] dark:text-white dark:hover:bg-white/10"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-wide text-[#9CA3AF] dark:text-white/45">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((c, idx) => {
          const isSelected = c.ymd === selectedDateIso;
          const isToday = c.ymd === todayIso;
          const hasMark = markedDates.has(c.ymd);
          return (
            <button
              key={`${c.ymd}-${idx}`}
              type="button"
              disabled={!c.ymd}
              onClick={() => c.ymd && onSelectDate(c.ymd)}
              className={[
                'relative flex min-h-[2.5rem] flex-col items-center justify-center rounded-xl py-1 text-sm transition-colors',
                !c.inMonth ? 'text-[#C4C4C4] dark:text-white/25' : 'text-[#2d3436] dark:text-white',
                isSelected
                  ? 'bg-[hsl(var(--accent-customer))] font-semibold text-white shadow-sm'
                  : isToday && c.inMonth
                    ? 'bg-[hsl(var(--accent-customer)/0.12)] font-medium text-[hsl(var(--accent-customer))] dark:text-white'
                    : c.inMonth
                      ? 'hover:bg-[hsl(var(--accent-customer)/0.08)] dark:hover:bg-white/10'
                      : 'hover:bg-surface2/50',
              ].join(' ')}
            >
              <span>{c.label}</span>
              {hasMark && (
                <span
                  className={[
                    'mt-0.5 h-1.5 w-1.5 rounded-full',
                    isSelected ? 'bg-white' : 'bg-[#FFB347]',
                  ].join(' ')}
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
