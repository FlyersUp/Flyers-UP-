'use client';

/**
 * Availability Preview — Calendar-style CTA
 * Compact summary + "Check availability" link to booking flow
 */

import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { parseBusinessHoursModel, summarizeBusinessHours } from '@/lib/utils/businessHours';

interface AvailabilityPreviewCardProps {
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

export function AvailabilityPreviewCard({ businessHours, bookHref }: AvailabilityPreviewCardProps) {
  const summary = getSummary(businessHours);

  return (
    <Link
      href={bookHref}
      className="group flex items-center gap-4 rounded-2xl border border-black/6 dark:border-white/10 bg-white dark:bg-[#1D2128] p-4 shadow-sm shadow-black/5 dark:shadow-black/20 transition-shadow hover:shadow-md"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/5 dark:bg-white/10 text-[#6A6A6A] dark:text-[#A1A8B3] group-hover:bg-black/8 dark:group-hover:bg-white/15 transition-colors">
        <Calendar size={20} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[#111111] dark:text-[#F5F7FA]">Check availability</p>
        <p className="mt-0.5 text-xs text-[#6A6A6A] dark:text-[#A1A8B3]">{summary}</p>
      </div>
      <span className="shrink-0 text-sm font-medium text-[var(--accent)]">Select dates →</span>
    </Link>
  );
}
