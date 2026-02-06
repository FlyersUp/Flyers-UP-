'use client';

import type { WeeklyHours, WeekdayKey } from '@/lib/utils/businessHours';
import { WEEKDAYS } from '@/lib/utils/businessHours';

function updateDay(
  weekly: WeeklyHours,
  day: WeekdayKey,
  patch: Partial<WeeklyHours[WeekdayKey]>
): WeeklyHours {
  return {
    ...weekly,
    [day]: {
      ...weekly[day],
      ...patch,
    },
  };
}

export function WeeklySchedulePicker({
  value,
  onChange,
  className = '',
}: {
  value: WeeklyHours;
  onChange: (next: WeeklyHours) => void;
  className?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {WEEKDAYS.map((d) => {
        const day = value[d.key];
        return (
          <div key={d.key} className="flex flex-col gap-2 p-3 border border-border rounded-lg bg-surface">
            <div className="flex items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-sm font-medium text-text select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border accent-[hsl(var(--accent))]"
                  checked={day.enabled}
                  onChange={(e) => onChange(updateDay(value, d.key, { enabled: e.target.checked }))}
                />
                <span>{d.label}</span>
              </label>

              <span className="text-xs text-muted/70">
                {day.enabled ? 'Available' : 'Off'}
              </span>
            </div>

            {day.enabled ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-medium text-muted mb-1">Start</div>
                  <input
                    type="time"
                    step={900}
                    value={day.start}
                    onChange={(e) => onChange(updateDay(value, d.key, { start: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text focus:ring-2 focus:ring-accent/40 focus:border-accent"
                  />
                </div>
                <div>
                  <div className="text-xs font-medium text-muted mb-1">End</div>
                  <input
                    type="time"
                    step={900}
                    value={day.end}
                    onChange={(e) => onChange(updateDay(value, d.key, { end: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text focus:ring-2 focus:ring-accent/40 focus:border-accent"
                  />
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

