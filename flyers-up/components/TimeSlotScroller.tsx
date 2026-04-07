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
        <h4 className="mb-2 text-sm font-semibold text-[#2d3436] dark:text-white">Select Date</h4>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {dates.map((date) => (
            <button
              key={date.date}
              onClick={() => handleDateSelect(date.date)}
              className={`
                w-16 flex-shrink-0 rounded-xl border py-3 transition-all duration-200 active:scale-[0.98]
                ${selectedDate === date.date
                  ? 'border-[#4A69BD] bg-[#4A69BD] text-white shadow-md'
                  : 'border-[#E5E7EB] bg-white text-[#2d3436] hover:border-[#4A69BD]/35 dark:border-white/12 dark:bg-[#14161c] dark:text-white'
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
        <h4 className="mb-2 text-sm font-semibold text-[#2d3436] dark:text-white">Available Times</h4>
        <div className="flex flex-wrap gap-2">
          {currentDate?.slots.map((slot) => (
            <button
              key={slot.id}
              onClick={() => handleSlotSelect(slot)}
              disabled={!slot.available}
              className={`
                min-h-[44px] rounded-xl border px-4 py-2 text-sm font-medium transition-colors duration-200 active:scale-[0.98]
                ${!slot.available
                  ? 'cursor-not-allowed border-[#E8EAED] bg-[#F5F6F8] text-[#9CA3AF] dark:border-white/10 dark:bg-white/5'
                  : selectedSlot === slot.id
                    ? 'border-[#4A69BD] bg-[#4A69BD] text-white shadow-[0_4px_14px_rgba(74,105,189,0.28)]'
                    : 'border-[#E5E7EB] bg-white text-[#2d3436] hover:border-[#4A69BD]/35 dark:border-white/12 dark:bg-[#14161c] dark:text-white'
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




