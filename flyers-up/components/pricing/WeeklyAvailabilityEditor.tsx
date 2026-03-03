'use client';

import type { WeeklyHours, WeekdayKey } from '@/lib/utils/businessHours';
import { WEEKDAYS } from '@/lib/utils/businessHours';
import { Switch } from '@/components/ui/Switch';

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

interface WeeklyAvailabilityEditorProps {
  weekly: WeeklyHours;
  onChange: (weekly: WeeklyHours) => void;
  sameDayBookings: boolean;
  onSameDayBookingsChange: (v: boolean) => void;
  emergencyAvailable: boolean;
  onEmergencyAvailableChange: (v: boolean) => void;
  disabled?: boolean;
}

export function WeeklyAvailabilityEditor({
  weekly,
  onChange,
  sameDayBookings,
  onSameDayBookingsChange,
  emergencyAvailable,
  onEmergencyAvailableChange,
  disabled,
}: WeeklyAvailabilityEditorProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {WEEKDAYS.map((d) => {
          const day = weekly[d.key];
          return (
            <div
              key={d.key}
              className={`rounded-xl border p-3 transition-colors ${
                day.enabled ? 'border-black/10 bg-white' : 'border-black/5 bg-black/[0.02]'
              }`}
            >
              <label className="flex items-center gap-2 mb-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border accent-[hsl(var(--accent))]"
                  checked={day.enabled}
                  onChange={(e) => onChange(updateDay(weekly, d.key, { enabled: e.target.checked }))}
                  disabled={disabled}
                />
                <span className="text-sm font-medium text-black">{d.short}</span>
              </label>
              {day.enabled && (
                <div className="flex flex-col gap-2">
                  <div>
                    <div className="text-xs text-black/60 mb-0.5">Start</div>
                    <input
                      type="time"
                      step={900}
                      value={day.start}
                      onChange={(e) => onChange(updateDay(weekly, d.key, { start: e.target.value }))}
                      disabled={disabled}
                      className="w-full px-2 py-1.5 text-sm border border-black/10 rounded-lg bg-white text-black focus:ring-2 focus:ring-accent/40"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-black/60 mb-0.5">End</div>
                    <input
                      type="time"
                      step={900}
                      value={day.end}
                      onChange={(e) => onChange(updateDay(weekly, d.key, { end: e.target.value }))}
                      disabled={disabled}
                      className="w-full px-2 py-1.5 text-sm border border-black/10 rounded-lg bg-white text-black focus:ring-2 focus:ring-accent/40"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-black/5 bg-white">
          <div>
            <div className="text-sm font-medium text-black">Same-day bookings</div>
            <p className="text-xs text-black/60 mt-0.5">Allow customers to book for today</p>
          </div>
          <Switch
            checked={sameDayBookings}
            onCheckedChange={onSameDayBookingsChange}
            disabled={disabled}
            aria-label="Same-day bookings"
          />
        </div>
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-black/5 bg-white">
          <div>
            <div className="text-sm font-medium text-black">Emergency availability</div>
            <p className="text-xs text-black/60 mt-0.5">Offer urgent / same-day service</p>
          </div>
          <Switch
            checked={emergencyAvailable}
            onCheckedChange={onEmergencyAvailableChange}
            disabled={disabled}
            aria-label="Emergency availability"
          />
        </div>
      </div>
    </div>
  );
}
