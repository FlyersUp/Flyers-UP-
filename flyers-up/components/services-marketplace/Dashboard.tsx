'use client';

import { Calendar, ChevronRight, Clock, MapPin, MoreHorizontal } from 'lucide-react';
import { Layout, type LayoutProps } from './Layout';

type BookingStatus = 'in_progress' | 'completed' | 'scheduled';

const activeBookings: {
  id: string;
  title: string;
  pro: string;
  when: string;
  where: string;
  status: BookingStatus;
}[] = [
  {
    id: '1',
    title: 'Deep clean — 2 bed, 2 bath',
    pro: 'Jordan M.',
    when: 'Today · 2:00 PM',
    where: 'Lakeview',
    status: 'in_progress',
  },
  {
    id: '2',
    title: 'TV wall mount + cable conceal',
    pro: 'Alex T.',
    when: 'Thu, Mar 27 · 10:30 AM',
    where: 'Wicker Park',
    status: 'scheduled',
  },
];

const requests: {
  id: string;
  title: string;
  summary: string;
  received: string;
  responses: number;
}[] = [
  {
    id: 'r1',
    title: 'Deck staining (≈ 120 sq ft)',
    summary: 'Looking for prep + two coats, materials separate.',
    received: '2h ago',
    responses: 3,
  },
  {
    id: 'r2',
    title: 'Office chair assembly × 4',
    summary: 'Same building, freight elevator access.',
    received: 'Yesterday',
    responses: 1,
  },
];

function StatusBadge({ status }: { status: BookingStatus }) {
  if (status === 'completed') {
    return (
      <span
        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-[#5D695D]"
        style={{ backgroundColor: 'rgba(170, 160, 109, 0.35)' }}
      >
        Completed
      </span>
    );
  }
  if (status === 'in_progress') {
    return (
      <span
        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-[#5D695D]"
        style={{ backgroundColor: 'rgba(245, 183, 78, 0.45)' }}
      >
        In progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-[#5D695D]/10 px-2.5 py-0.5 text-xs font-semibold text-[#5D695D]/80">
      Scheduled
    </span>
  );
}

/**
 * Authenticated customer dashboard screen (main content only).
 * Wrap with {@link Layout} `mode="dashboard"` for the full app shell.
 */
export default function Dashboard() {
  return (
    <div className="min-h-full bg-gradient-to-b from-[#EBCEAE] via-[#E8C9A8]/80 to-[#EBCEAE] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-4xl lg:max-w-5xl">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[#5D695D]/60">Tuesday, March 25</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#5D695D] sm:text-4xl">Welcome back</h1>
            <p className="mt-2 max-w-xl text-[#5D695D]/72">Here&apos;s what&apos;s on your calendar and what needs a quick reply.</p>
          </div>
          <button
            type="button"
            className="mt-4 inline-flex items-center justify-center gap-2 self-start rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:brightness-105 sm:mt-0"
            style={{ backgroundColor: '#E48C35', boxShadow: '0 6px 20px rgba(228, 140, 53, 0.35)' }}
          >
            Book a task
            <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </header>

        {/* Quick glance */}
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Active bookings', value: '2', hint: 'Next in 4h' },
            { label: 'Open requests', value: '2', hint: '3 new quotes' },
            { label: 'Messages', value: '1', hint: 'Unread' },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-[#5D695D]/10 bg-[#F8F4EE]/75 p-5 shadow-[0_4px_18px_rgba(93,105,93,0.08)]"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-[#5D695D]/50">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-[#5D695D]">{card.value}</p>
              <p className="mt-1 text-sm text-[#5D695D]/60">{card.hint}</p>
            </div>
          ))}
        </div>

        {/* Active bookings */}
        <section className="mt-12">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold tracking-tight text-[#5D695D]">Active bookings</h2>
            <button type="button" className="text-sm font-semibold text-[#E48C35] hover:underline">
              View all
            </button>
          </div>
          <ul className="mt-5 space-y-4">
            {activeBookings.map((b) => (
              <li key={b.id}>
                <article className="group rounded-2xl border border-[#5D695D]/10 bg-[#F8F4EE]/85 p-5 shadow-md transition hover:border-[#5D695D]/18 hover:shadow-lg">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-[#5D695D]">{b.title}</h3>
                        <StatusBadge status={b.status} />
                      </div>
                      <p className="mt-2 text-sm font-medium text-[#5D695D]/80">with {b.pro}</p>
                      <div className="mt-4 flex flex-wrap gap-4 text-sm text-[#5D695D]/65">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-4 w-4 text-[#E48C35]" strokeWidth={2} />
                          {b.when}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 text-[#5D695D]/45" strokeWidth={2} />
                          {b.where}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-stretch">
                      <button
                        type="button"
                        className="rounded-xl border border-[#5D695D]/12 bg-white/50 px-4 py-2 text-sm font-semibold text-[#5D695D] transition hover:bg-white/80"
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        className="rounded-xl p-2 text-[#5D695D]/45 transition hover:bg-[#5D695D]/5 hover:text-[#5D695D] sm:hidden"
                        aria-label="More"
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </section>

        {/* Service requests */}
        <section className="mt-12 pb-8">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold tracking-tight text-[#5D695D]">Service requests</h2>
            <button type="button" className="text-sm font-semibold text-[#E48C35] hover:underline">
              New request
            </button>
          </div>
          <ul className="mt-5 space-y-4">
            {requests.map((r) => (
              <li key={r.id}>
                <article className="flex flex-col gap-4 rounded-2xl border border-[#5D695D]/10 bg-[#E0AF70]/25 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-1 gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#5D695D]/10 text-[#5D695D]">
                      <Calendar className="h-5 w-5" strokeWidth={2} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-[#5D695D]">{r.title}</h3>
                      <p className="mt-1 text-sm text-[#5D695D]/70">{r.summary}</p>
                      <p className="mt-2 text-xs font-medium text-[#5D695D]/50">
                        Received {r.received} ·{' '}
                        <span className="text-[#5D695D]/75">{r.responses} pro{r.responses !== 1 ? 's' : ''} responded</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-stretch">
                    <span
                      className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold text-[#5D695D]"
                      style={{ backgroundColor: 'rgba(245, 183, 78, 0.5)' }}
                    >
                      Needs attention
                    </span>
                    <button
                      type="button"
                      className="rounded-xl px-4 py-2 text-sm font-semibold text-[#5D695D] ring-1 ring-[#5D695D]/15 transition hover:bg-[#F8F4EE]/80"
                    >
                      Review quotes
                    </button>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

type DashboardShellProps = Pick<LayoutProps, 'dashboardActiveId' | 'className'>;

/**
 * Full authenticated view: shared {@link Layout} (dashboard mode) wrapping {@link Dashboard}.
 */
export function DashboardWithLayout({
  dashboardActiveId = 'overview',
  className,
}: DashboardShellProps = {}) {
  return (
    <Layout mode="dashboard" dashboardActiveId={dashboardActiveId} className={className}>
      <Dashboard />
    </Layout>
  );
}
