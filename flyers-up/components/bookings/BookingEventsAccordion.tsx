'use client';

/**
 * Accordion showing latest 5 booking_events (for debugging).
 */

import { useState, useEffect } from 'react';

interface BookingEvent {
  id: string;
  type: string;
  data: Record<string, unknown>;
  created_at: string;
}

interface BookingEventsAccordionProps {
  bookingId: string;
}

export function BookingEventsAccordion({ bookingId }: BookingEventsAccordionProps) {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<BookingEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/bookings/${bookingId}/events`)
      .then((r) => r.json())
      .then((d) => setEvents(d.events ?? []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [bookingId, open]);

  return (
    <div className="rounded-lg border border-black/10 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2 text-left text-sm font-medium text-muted hover:bg-black/[0.02]"
      >
        Details (events)
        <span className="text-muted">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0 border-t border-black/10">
          {loading ? (
            <p className="text-xs text-muted">Loading…</p>
          ) : events.length === 0 ? (
            <p className="text-xs text-muted">No events yet</p>
          ) : (
            <ul className="space-y-2 text-xs font-mono">
              {events.map((e) => (
                <li key={e.id} className="text-muted">
                  <span className="text-text font-medium">{e.type}</span>
                  {' '}
                  {new Date(e.created_at).toLocaleString()}
                  {Object.keys(e.data || {}).length > 0 && (
                    <span className="ml-1 text-muted">
                      {JSON.stringify(e.data)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
