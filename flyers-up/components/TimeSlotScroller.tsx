'use client';

/**
 * Time Slot Scroller Component
 * Horizontal scrollable time slot selector
 */

import { useState } from 'react';
import type { AvailableDate, TimeSlot } from '@/lib/mockData';

interface TimeSlotScrollerProps {
  dates: AvailableDate[];
  onSelect?: (date: string, slot: TimeSlot) => void;
  className?: string;
}

export default function TimeSlotScroller({
  dates,
  onSelect,
  className = '',
}: TimeSlotScrollerProps) {
  const [selectedDate, setSelectedDate] = useState<string>(dates[0]?.date || '');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const currentDate = dates.find(d => d.date === selectedDate);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    if (!slot.available) return;
    setSelectedSlot(slot.id);
    onSelect?.(selectedDate, slot);
  };

  return (
    <div className={className}>
      {/* Date selector */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-text mb-2">Select Date</h4>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {dates.map((date) => (
            <button
              key={date.date}
              onClick={() => handleDateSelect(date.date)}
              className={`
                flex-shrink-0 w-16 py-3 rounded-xl border-2 transition-all
                ${selectedDate === date.date
                  ? 'border-accent bg-accent/10 text-text'
                  : 'border-border bg-surface text-text hover:border-border'
                }
              `}
            >
              <div className="text-xs font-medium uppercase">{date.dayName}</div>
              <div className="text-xl font-bold">{date.dayNumber}</div>
              <div className="text-xs text-muted/70">{date.month}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Time slots */}
      <div>
        <h4 className="text-sm font-medium text-text mb-2">Available Times</h4>
        <div className="flex flex-wrap gap-2">
          {currentDate?.slots.map((slot) => (
            <button
              key={slot.id}
              onClick={() => handleSlotSelect(slot)}
              disabled={!slot.available}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${!slot.available
                  ? 'bg-surface2 text-muted/60 cursor-not-allowed'
                  : selectedSlot === slot.id
                    ? 'bg-accent text-accentContrast shadow-md'
                    : 'bg-surface border border-border text-text hover:border-accent/40 hover:bg-accent/10'
                }
              `}
            >
              {slot.time}
            </button>
          ))}
        </div>
        
        {currentDate && currentDate.slots.filter(s => s.available).length === 0 && (
          <p className="text-sm text-muted/70 mt-2">No available slots for this date</p>
        )}
      </div>
    </div>
  );
}

// Export selected state type for parent components
export interface SelectedTimeSlot {
  date: string;
  slot: TimeSlot;
}




