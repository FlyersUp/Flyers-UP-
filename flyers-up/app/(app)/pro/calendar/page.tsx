'use client';

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { SideMenu } from '@/components/ui/SideMenu';
import { getCurrentUser } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { CalendarView } from '@/components/calendar/CalendarView';
import type { CalendarEvent } from '@/lib/calendar/event-from-booking';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DateTime } from 'luxon';
import { DEFAULT_BOOKING_TIMEZONE, todayIsoInBookingTimezone } from '@/lib/datetime';

type ViewMode = 'agenda' | 'day' | 'week' | 'month';

const Z = DEFAULT_BOOKING_TIMEZONE;

export default function ProCalendarPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('agenda');
  const [focusDate, setFocusDate] = useState(() => todayIsoInBookingTimezone(Z));

  useEffect(() => {
    const guard = async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.replace(`/auth?next=${encodeURIComponent('/pro/calendar')}`);
        return;
      }
      const { data: pro } = await supabase.from('service_pros').select('id').eq('user_id', user.id).maybeSingle();
      if (!pro) {
        router.replace('/pro');
        return;
      }
      setReady(true);
    };
    void guard();
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    const focus = DateTime.fromISO(focusDate, { zone: Z });
    if (!focus.isValid) {
      setLoading(false);
      return;
    }
    let from = focusDate;
    let to = focusDate;
    if (viewMode === 'agenda') {
      const start = focus.minus({ days: 7 });
      const end = focus.plus({ days: 60 });
      from = start.toISODate() ?? focusDate;
      to = end.toISODate() ?? focusDate;
    } else if (viewMode === 'week') {
      const daysBack = focus.weekday % 7;
      const sun = focus.minus({ days: daysBack });
      const sat = sun.plus({ days: 6 });
      from = sun.toISODate() ?? focusDate;
      to = sat.toISODate() ?? focusDate;
    } else if (viewMode === 'month') {
      from = focus.startOf('month').toISODate() ?? focusDate;
      to = focus.endOf('month').toISODate() ?? focusDate;
    }

    fetch(
      `/api/calendar/events?role=pro&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { cache: 'no-store' }
    )
      .then((r) => r.json())
      .then((json: { ok?: boolean; events?: CalendarEvent[] }) => {
        if (json.ok && Array.isArray(json.events)) setEvents(json.events);
        else setEvents([]);
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [ready, focusDate, viewMode]);

  const nav = (delta: number) => {
    const focus = DateTime.fromISO(focusDate, { zone: Z });
    if (!focus.isValid) return;
    let next = focus;
    if (viewMode === 'day') next = focus.plus({ days: delta });
    else if (viewMode === 'week') next = focus.plus({ weeks: delta });
    else if (viewMode === 'month') next = focus.plus({ months: delta });
    else next = focus.plus({ weeks: delta });
    setFocusDate(next.toISODate() ?? focusDate);
  };

  if (!ready) {
    return (
      <AppLayout mode="pro">
        <div className="min-h-[40vh] flex items-center justify-center">
          <p className="text-sm text-muted">Loading…</p>
        </div>
      </AppLayout>
    );
  }

  const focusDt = DateTime.fromISO(focusDate, { zone: Z });
  const viewLabel =
    viewMode === 'day'
      ? focusDt.isValid
        ? focusDt.setLocale('en-US').toLocaleString(DateTime.DATE_MED)
        : ''
      : viewMode === 'week'
        ? (() => {
            if (!focusDt.isValid) return '';
            const daysBack = focusDt.weekday % 7;
            const sun = focusDt.minus({ days: daysBack });
            const sat = sun.plus({ days: 6 });
            return `${sun.setLocale('en-US').toFormat('LLL d')} – ${sat.setLocale('en-US').toFormat('LLL d, y')}`;
          })()
        : viewMode === 'month'
          ? focusDt.isValid
            ? focusDt.setLocale('en-US').toFormat('MMMM yyyy')
            : ''
          : 'Upcoming';

  return (
    <AppLayout mode="pro">
      <div className="min-h-screen bg-bg">
        <div className="sticky top-0 z-20 bg-bg/95 backdrop-blur-sm border-b border-border">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.back()}
              className="h-10 w-10 rounded-xl bg-surface2 border border-border flex items-center justify-center"
              aria-label="Back"
            >
              ←
            </button>
            <h1 className="text-xl font-semibold text-text">Work Calendar</h1>
            <div className="w-10" />
          </div>
          <div className="max-w-4xl mx-auto px-4 pb-3 flex flex-wrap gap-2">
            {(['agenda', 'day', 'week', 'month'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setViewMode(v)}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  viewMode === v ? 'bg-accent/20 text-accent' : 'bg-surface2 text-muted'
                }`}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <div className="max-w-4xl mx-auto px-4 pb-3 flex items-center justify-between">
            <button type="button" onClick={() => nav(-1)} className="p-2 rounded-lg hover:bg-surface2">
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm font-medium text-text">{viewLabel}</span>
            <button type="button" onClick={() => nav(1)} className="p-2 rounded-lg hover:bg-surface2">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6">
          {loading ? (
            <div className="space-y-4">
              <div className="h-24 animate-pulse rounded-2xl bg-surface2" />
              <div className="h-24 animate-pulse rounded-2xl bg-surface2" />
            </div>
          ) : (
            <CalendarView events={events} viewMode={viewMode} focusDate={focusDate} mode="pro" />
          )}
        </div>
      </div>
      <SideMenu open={false} onClose={() => {}} role="pro" userName="" />
    </AppLayout>
  );
}
