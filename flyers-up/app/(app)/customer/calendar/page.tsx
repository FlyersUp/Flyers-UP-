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

type ViewMode = 'agenda' | 'day' | 'week' | 'month';

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function CustomerCalendarPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('agenda');
  const [focusDate, setFocusDate] = useState(() => toISODate(new Date()));

  useEffect(() => {
    const guard = async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.replace(`/auth?next=${encodeURIComponent('/customer/calendar')}`);
        return;
      }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if ((profile?.role ?? 'customer') !== 'customer') {
        router.replace('/customer');
        return;
      }
      setReady(true);
    };
    void guard();
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    const focus = new Date(focusDate + 'T12:00:00');
    let from = focusDate;
    let to = focusDate;
    if (viewMode === 'agenda') {
      const start = new Date(focus);
      start.setDate(start.getDate() - 7);
      const end = new Date(focus);
      end.setDate(end.getDate() + 60);
      from = toISODate(start);
      to = toISODate(end);
    } else if (viewMode === 'week') {
      const day = focus.getDay();
      const sun = new Date(focus);
      sun.setDate(focus.getDate() - day);
      const sat = new Date(sun);
      sat.setDate(sun.getDate() + 6);
      from = toISODate(sun);
      to = toISODate(sat);
    } else if (viewMode === 'month') {
      from = toISODate(new Date(focus.getFullYear(), focus.getMonth(), 1));
      to = toISODate(new Date(focus.getFullYear(), focus.getMonth() + 1, 0));
    }

    fetch(
      `/api/calendar/events?role=customer&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
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
    const d = new Date(focusDate + 'T12:00:00');
    if (viewMode === 'day') d.setDate(d.getDate() + delta);
    else if (viewMode === 'week') d.setDate(d.getDate() + delta * 7);
    else if (viewMode === 'month') d.setMonth(d.getMonth() + delta);
    else d.setDate(d.getDate() + delta * 7);
    setFocusDate(toISODate(d));
  };

  if (!ready) {
    return (
      <AppLayout mode="customer">
        <div className="min-h-[40vh] flex items-center justify-center">
          <p className="text-sm text-muted">Loading…</p>
        </div>
      </AppLayout>
    );
  }

  const viewLabel =
    viewMode === 'day'
      ? new Date(focusDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : viewMode === 'week'
        ? (() => {
            const f = new Date(focusDate + 'T12:00:00');
            const sun = new Date(f);
            sun.setDate(f.getDate() - f.getDay());
            const sat = new Date(sun);
            sat.setDate(sun.getDate() + 6);
            return `${sun.toLocaleDateString('en-US', { month: 'short' })} ${sun.getDate()} – ${sat.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
          })()
        : viewMode === 'month'
          ? new Date(focusDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          : 'Upcoming';

  return (
    <AppLayout mode="customer">
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
            <h1 className="text-xl font-semibold text-text">My Schedule</h1>
            <div className="w-10" />
          </div>
          <div className="max-w-4xl mx-auto px-4 pb-3 flex flex-wrap gap-2">
            {(['agenda', 'day', 'week', 'month'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setViewMode(v)}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  viewMode === v ? 'bg-[hsl(var(--accent-customer)/0.2)] text-[hsl(var(--accent-customer))]' : 'bg-surface2 text-muted'
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
            <CalendarView events={events} viewMode={viewMode} focusDate={focusDate} mode="customer" />
          )}
        </div>
      </div>
      <SideMenu open={false} onClose={() => {}} role="customer" userName="" />
    </AppLayout>
  );
}
