'use client';

/**
 * Accordion section "Booking Rules" with condensed rules.
 * Used in checkout and booking flow.
 */
import { useState } from 'react';
import { BookingRulesInline } from './BookingRulesInline';

export function BookingRulesAccordion() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-black/10 overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-medium text-text hover:bg-black/[0.02] transition-colors"
      >
        <span>Booking Rules</span>
        <span className="text-muted">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="px-5 pb-5 pt-0 border-t border-black/10">
          <BookingRulesInline />
        </div>
      )}
    </div>
  );
}
