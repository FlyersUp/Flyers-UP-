'use client';

import { useCallback, useEffect, useState } from 'react';
import { DateTime } from 'luxon';
import type { CalendarEvent } from '@/lib/calendar/event-from-booking';
import { DEFAULT_BOOKING_TIMEZONE } from '@/lib/datetime';

const Z = DEFAULT_BOOKING_TIMEZONE;

function defaultRange(): { from: string; to: string } {
  const now = DateTime.now().setZone(Z);
  return {
    from: now.minus({ days: 45 }).toISODate() ?? now.toISODate() ?? '',
    to: now.plus({ days: 150 }).toISODate() ?? now.toISODate() ?? '',
  };
}

export function useScheduleEvents(opts: { role: 'customer' | 'pro'; enabled: boolean }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { from, to } = defaultRange();
    if (!from || !to) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(
        `/api/calendar/events?role=${opts.role}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        { cache: 'no-store' }
      );
      const json = (await r.json()) as { ok?: boolean; events?: CalendarEvent[] };
      if (json.ok && Array.isArray(json.events)) setEvents(json.events);
      else setEvents([]);
    } catch {
      setError('Could not load schedule.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [opts.role]);

  useEffect(() => {
    if (!opts.enabled) {
      setLoading(false);
      return;
    }
    void load();
  }, [opts.enabled, load]);

  return { events, loading, error, refetch: load };
}
