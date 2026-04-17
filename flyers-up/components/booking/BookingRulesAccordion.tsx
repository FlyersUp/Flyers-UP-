'use client';

/**
 * Accordion section "Booking Rules" with condensed rules.
 * Used in checkout and booking flow.
 */
import { useState } from 'react';
import { BookingRulesInline } from './BookingRulesInline';
import { useLaunchMode } from '@/hooks/useLaunchMode';

export function BookingRulesAccordion() {
  const launchMode = useLaunchMode();
  const [open, setOpen] = useState(false);

  if (launchMode) return null;

  return (
    <div className="rounded-2xl border border-black/5 overflow-hidden bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-medium text-text hover:bg-black/[0.02] transition-colors"
      >
        <span>Booking Rules</span>
        <span className="text-muted">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="px-5 pb-5 pt-0 border-t border-black/5">
          <BookingRulesInline />
        </div>
      )}
    </div>
  );
}
