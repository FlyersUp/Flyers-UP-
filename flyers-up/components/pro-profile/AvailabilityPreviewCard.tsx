'use client';

/**
 * Availability Preview — summary + monthly calendar + booking CTA
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DateTime } from 'luxon';
import { DEFAULT_BOOKING_TIMEZONE } from '@/lib/datetime';
import { Calendar } from 'lucide-react';
import { parseBusinessHoursModel, summarizeBusinessHours } from '@/lib/utils/businessHours';
import { CustomerProAvailabilityCalendar } from '@/components/booking/CustomerProAvailabilityCalendar';

interface AvailabilityPreviewCardProps {
  proId: string;
  businessHours: string | null;
  bookHref: string;
}

function getSummary(hours: string | null): string {
  if (!hours || !hours.trim()) return 'Check availability when you book.';
  try {
    const model = parseBusinessHoursModel(hours);
    const summary = summarizeBusinessHours(model);
    return summary === 'No availability set' ? 'Check availability when you book.' : summary;
  } catch {
    return 'Check availability when you book.';
  }
}

export function AvailabilityPreviewCard({ proId, businessHours, bookHref }: AvailabilityPreviewCardProps) {
  const summary = getSummary(businessHours);
  const [pickDate, setPickDate] = useState('');
  const [pickTime, setPickTime] = useState('');

  useEffect(() => {
    setPickDate((d) => {
      if (d) return d;
      return DateTime.now().setZone(DEFAULT_BOOKING_TIMEZONE).plus({ days: 1 }).toISODate() ?? '';
    });
  }, []);

  return (
    <div className="space-y-4">
      <Link
        href={bookHref}
        className="group flex items-center gap-4 rounded-2xl border border-black/6 dark:border-white/10 bg-white dark:bg-[#1D2128] p-4 shadow-sm shadow-black/5 dark:shadow-black/20 transition-shadow hover:shadow-md"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/5 dark:bg-white/10 text-[#6A6A6A] dark:text-[#A1A8B3] group-hover:bg-black/8 dark:group-hover:bg-white/15 transition-colors">
          <Calendar size={20} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[#111111] dark:text-[#F5F7FA]">Book a time</p>
          <p className="mt-0.5 text-xs text-[#6A6A6A] dark:text-[#A1A8B3]">{summary}</p>
        </div>
        <span className="shrink-0 text-sm font-medium text-[var(--accent)]">Open booking →</span>
      </Link>

      <div className="rounded-2xl border border-black/6 dark:border-white/10 bg-white dark:bg-[#1D2128] p-1">
        <CustomerProAvailabilityCalendar
          proId={proId}
          selectedDate={pickDate}
          selectedTime={pickTime}
          onSelectDate={setPickDate}
          onSelectTime={setPickTime}
        />
      </div>
    </div>
  );
}
