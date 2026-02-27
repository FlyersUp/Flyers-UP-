'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { supabase } from '@/lib/supabaseClient';
import { getOrCreateProfile, routeAfterAuth } from '@/lib/onboarding';
import { getTodayOverview, type TodayAlert, type TodayJob, type TodayOverview, type TodayTask } from '@/lib/today';

function formatHeaderDate(dateISO: string) {
  const d = new Date(dateISO + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function timeWindow(job: TodayJob) {
  const start = new Date(job.start_time);
  const end = new Date(job.end_time);
  const fmt = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${fmt(start)}–${fmt(end)}`;
}

function mapsHref(address: string) {
  const q = encodeURIComponent(address);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function riskDotClass(risk: TodayJob['risk']) {
  if (risk === 'high') return 'bg-danger';
  if (risk === 'medium') return 'bg-warning';
  return 'bg-success';
}

function pageStatusChip(alertCount: number) {
  return alertCount > 0 ? { label: 'Needs attention', variant: 'secondary' as const } : { label: 'On track', variant: 'secondary' as const };
}

function TodayHeader({ dateISO, alertCount }: { dateISO: string; alertCount: number }) {
  const status = pageStatusChip(alertCount);

  return (
    <div className="sticky top-0 z-20 bg-bg/80 backdrop-blur border-b border-hairline">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold tracking-tight text-text">Today</div>
          <div className="text-sm text-muted">{formatHeaderDate(dateISO)}</div>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center h-7 px-2.5 rounded-full border border-badgeBorder bg-badgeFill text-[11px] uppercase tracking-wide font-medium text-text">
            {status.label}
          </span>
          <Button variant="ghost" showArrow={false} className="px-3 py-2 rounded-lg text-sm" disabled>
            Settings
          </Button>
        </div>
      </div>
    </div>
  );
}

function TodayAlerts({ alerts }: { alerts: TodayAlert[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!alerts.length) return null;

  const shown = expanded ? alerts : alerts.slice(0, 3);
  const canToggle = alerts.length > 3;

  return (
    <Card className="border-l-[3px] border-l-accent">
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm font-semibold text-text">Alerts &amp; Risks</div>
        {canToggle ? (
          <button
            className="text-sm text-muted hover:text-text transition-colors"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? 'Collapse' : `View all (${alerts.length})`}
          </button>
        ) : null}
      </div>

      <div className="mt-3 space-y-2">
        {shown.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-3 surface-item px-3 py-2">
            <div className="min-w-0">
              <div className="text-sm font-medium text-text truncate">{a.title}</div>
            </div>
            <Button
              variant="secondary"
              showArrow={false}
              className="px-3 py-2 rounded-lg text-sm"
              disabled={!a.ctaLabel}
              title={!a.ctaLabel ? 'TODO: wire action' : undefined}
            >
              {a.ctaLabel || '—'}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TodayTimeline({
  jobs,
  onUpdateJobStatus,
}: {
  jobs: TodayJob[];
  onUpdateJobStatus: (jobId: string, next: TodayJob['status']) => void;
}) {
  return (
    <div className="space-y-3">
      {jobs.map((job) => {
        const isCurrent = job.status === 'in_progress';
        const isCompleted = job.status === 'completed';
        const cardClass = [
          'border-l-[3px] border-l-accent',
          isCurrent ? 'ring-1 ring-accent/25' : '',
          isCompleted ? 'opacity-80' : '',
        ].join(' ');

        const canStart = job.status === 'upcoming';
        const canComplete = job.status === 'in_progress';

        return (
          <Card key={job.id} className={cardClass}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-base font-semibold text-text">{timeWindow(job)}</div>
                  <span className={`h-2 w-2 rounded-full ${riskDotClass(job.risk)}`} aria-hidden />
                </div>
                <div className="mt-1 text-sm text-muted truncate">
                  {job.client_name} • {job.service_type}
                </div>
                <div className="mt-1 text-sm text-muted line-clamp-2">{job.address}</div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={job.status} />
                <div className="flex flex-wrap justify-end gap-2">
                  <a
                    className="px-3 py-2 rounded-lg text-sm font-semibold border-2 border-accent bg-surface text-accent hover:bg-surface2 transition-all focus-ring btn-press"
                    href={mapsHref(job.address)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Navigate
                  </a>
                  <a
                    className="px-3 py-2 rounded-lg text-sm font-semibold border-2 border-accent bg-surface text-accent hover:bg-surface2 transition-all focus-ring btn-press"
                    href={job.client_phone ? `tel:${job.client_phone}` : undefined}
                    aria-disabled={!job.client_phone}
                    onClick={(e) => {
                      if (!job.client_phone) e.preventDefault();
                    }}
                    title={!job.client_phone ? 'TODO: add phone number to booking join' : undefined}
                  >
                    Call
                  </a>
                  <Link
                    className="px-3 py-2 rounded-lg text-sm font-semibold border-2 border-accent bg-surface text-accent hover:bg-surface2 transition-all focus-ring btn-press"
                    href={job.bookingId ? `/pro/chat/${job.bookingId}` : '#'}
                    aria-disabled={!job.bookingId}
                    onClick={(e) => {
                      if (!job.bookingId) e.preventDefault();
                    }}
                    title={!job.bookingId ? 'TODO: wire message thread per booking' : undefined}
                  >
                    Message
                  </Link>
                  <Button
                    variant="primary"
                    showArrow={false}
                    className="px-3 py-2 rounded-lg text-sm"
                    disabled={!canStart}
                    onClick={() => onUpdateJobStatus(job.id, 'in_progress')}
                    title={!canStart ? 'Only upcoming jobs can be started' : undefined}
                  >
                    Start
                  </Button>
                  <Button
                    variant="primary"
                    showArrow={false}
                    className="px-3 py-2 rounded-lg text-sm"
                    disabled={!canComplete}
                    onClick={() => onUpdateJobStatus(job.id, 'completed')}
                    title={!canComplete ? 'Only in-progress jobs can be completed' : undefined}
                  >
                    Complete
                  </Button>
                </div>
              </div>
            </div>
            {/* TODO: Persist job status changes to server (bookings.status_history / status) */}
          </Card>
        );
      })}
    </div>
  );
}

function TodayTasks({ tasks, onToggle }: { tasks: TodayTask[]; onToggle: (id: string) => void }) {
  return (
    <Card>
      <div className="text-sm font-semibold text-text">Action Items</div>
      <div className="mt-3 space-y-3">
        {tasks.map((t) => (
          <label key={t.id} className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-border accent-[hsl(var(--accent))]"
              checked={t.done}
              onChange={() => onToggle(t.id)}
            />
            <div className="min-w-0">
              <div className="text-sm font-medium text-text">{t.title}</div>
              {t.helper ? <div className="text-xs text-muted mt-0.5">{t.helper}</div> : null}
            </div>
          </label>
        ))}
      </div>
      {/* TODO: Persist task completion per pro + date */}
    </Card>
  );
}

function TodayMessages({ messages }: { messages: TodayOverview['messages'] }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm font-semibold text-text">Messages</div>
        <Link className="text-sm text-muted hover:text-text transition-colors" href="/pro/messages">
          View all
        </Link>
      </div>

      <div className="mt-3 space-y-2">
        {messages.slice(0, 3).map((m) => (
          <Link
            key={m.thread_id}
            href={`/pro/messages/${m.thread_id}`}
            className="block surface-item px-3 py-2 hover:bg-surface transition-colors"
            title="TODO: Ensure this route matches your pro messages thread route"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-text truncate">{m.client_name}</div>
                <div className="text-xs text-muted truncate mt-0.5">{m.snippet}</div>
              </div>
              <div className="text-xs text-muted whitespace-nowrap">
                {new Date(m.updated_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}

function TodayEarnings({ earnings }: { earnings: TodayOverview['earnings'] }) {
  const items = [
    { label: 'Expected today', value: earnings.expected },
    { label: 'Completed so far', value: earnings.completed },
    { label: 'Pending release', value: earnings.pending_release },
    { label: 'Tips', value: earnings.tips },
  ];

  const fmt = (n: number | null) => (n == null ? '—' : n.toLocaleString('en-US', { style: 'currency', currency: 'USD' }));

  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm font-semibold text-text">Earnings Snapshot</div>
        <Link className="text-sm text-muted hover:text-text transition-colors" href="/pro/earnings">
          See payouts
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {items.map((it) => (
          <div key={it.label} className="surface-item px-3 py-2">
            <div className="text-xs text-muted">{it.label}</div>
            <div className="text-base font-semibold text-text">{fmt(it.value)}</div>
          </div>
        ))}
      </div>
      {/* TODO: Wire expected/completed/pending/tips from bookings + payouts + tips tables */}
    </Card>
  );
}

export default function ProTodayPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<TodayOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<TodayJob[]>([]);
  const [tasks, setTasks] = useState<TodayTask[]>([]);
  const [realBookings, setRealBookings] = useState<
    Array<{
      id: string;
      service_date: string;
      service_time: string;
      address: string;
      notes: string | null;
      status: string;
      customer?: { fullName: string | null; phone: string | null } | null;
    }>
  >([]);

  useEffect(() => {
    const guardAndLoad = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/auth?next=%2Fpro%2Ftoday');
        return;
      }

      const profile = await getOrCreateProfile(user.id, user.email ?? null);
      if (!profile) return;
      const dest = routeAfterAuth(profile, '/pro/today');
      if (dest !== '/pro/today') {
        router.replace(dest);
        return;
      }

      const data = await getTodayOverview(user.id);
      setOverview(data);
      setJobs(data.jobs);
      setTasks(data.tasks);

      // Replace mock timeline jobs with real bookings for today (if any).
      try {
        const todayISO = new Date().toISOString().slice(0, 10);
        const res = await fetch(
          `/api/pro/bookings?from=${encodeURIComponent(todayISO)}&to=${encodeURIComponent(todayISO)}&limit=50&statuses=${encodeURIComponent(
            ['requested', 'accepted', 'awaiting_payment', 'completed'].join(',')
          )}`,
          { cache: 'no-store' }
        );
        const json = (await res.json()) as { ok: boolean; bookings?: any[] };
        if (res.ok && json.ok && Array.isArray(json.bookings)) {
          setRealBookings(json.bookings);
        } else {
          setRealBookings([]);
        }
      } catch {
        setRealBookings([]);
      }

      setLoading(false);
    };
    void guardAndLoad();
  }, [router]);

  const hasJobs = jobs.length > 0;

  const alertCount = useMemo(() => (overview?.alerts?.length ? overview.alerts.length : 0), [overview]);

  const onUpdateJobStatus = (jobId: string, next: TodayJob['status']) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, status: next } : j))
    );
  };

  const onToggleTask = (id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const showReal = realBookings.length > 0;

  if (loading || !overview) {
    return (
      <AppLayout mode="pro">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-sm text-muted">Loading…</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout mode="pro">
      <TodayHeader dateISO={overview.dateISO} alertCount={alertCount} />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {!hasJobs && !showReal ? (
          <Card className="border-l-[3px] border-l-accent">
            <div className="text-sm font-semibold text-text">No jobs scheduled today</div>
            <div className="text-sm text-muted mt-1">When you have bookings for today, they’ll appear here.</div>
            <div className="mt-4">
              <Link href="/pro">
                <Button variant="secondary" showArrow={false} className="px-3 py-2 rounded-lg text-sm">
                  Back to dashboard
                </Button>
              </Link>
            </div>
          </Card>
        ) : null}

        <TodayAlerts alerts={overview.alerts} />

        {showReal ? (
          <div>
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="text-sm font-semibold text-text">Timeline</div>
              <Link className="text-sm text-muted hover:text-text transition-colors" href="/pro">
                Back to dashboard
              </Link>
            </div>
            <div className="space-y-3">
              {realBookings.map((b) => (
                <Card key={b.id} className="border-l-[3px] border-l-accent">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-base font-semibold text-text">
                        {b.service_time} • {b.customer?.fullName || 'Customer'}
                      </div>
                      <div className="text-sm text-muted mt-0.5 line-clamp-2">{b.address}</div>
                      {b.notes ? <div className="text-sm text-muted mt-1 line-clamp-2">Notes: {b.notes}</div> : null}
                      <div className="mt-2">
                        <StatusBadge status={b.status} />
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="flex flex-wrap justify-end gap-2">
                        <a
                          className="px-3 py-2 rounded-lg text-sm font-semibold border-2 border-accent bg-surface text-accent hover:bg-surface2 transition-all focus-ring btn-press"
                          href={mapsHref(b.address)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Navigate
                        </a>
                        <a
                          className="px-3 py-2 rounded-lg text-sm font-semibold border-2 border-accent bg-surface text-accent hover:bg-surface2 transition-all focus-ring btn-press"
                          href={b.customer?.phone ? `tel:${b.customer.phone}` : undefined}
                          aria-disabled={!b.customer?.phone}
                          onClick={(e) => {
                            if (!b.customer?.phone) e.preventDefault();
                          }}
                          title={!b.customer?.phone ? 'No phone number on file' : undefined}
                        >
                          Call
                        </a>
                        <Link
                          className="px-3 py-2 rounded-lg text-sm font-semibold border-2 border-accent bg-surface text-accent hover:bg-surface2 transition-all focus-ring btn-press"
                          href={`/pro/chat/${b.id}`}
                        >
                          Message
                        </Link>
                        <Button
                          variant="secondary"
                          showArrow={false}
                          className="px-3 py-2 rounded-lg text-sm"
                          onClick={() => router.push(`/pro/jobs/${b.id}`)}
                        >
                          Details
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : hasJobs ? (
          <div>
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="text-sm font-semibold text-text">Timeline</div>
              <Link className="text-sm text-muted hover:text-text transition-colors" href="/pro">
                Back to dashboard
              </Link>
            </div>
            <TodayTimeline jobs={jobs} onUpdateJobStatus={onUpdateJobStatus} />
          </div>
        ) : null}

        <TodayTasks tasks={tasks} onToggle={onToggleTask} />
        <TodayMessages messages={overview.messages} />
        <TodayEarnings earnings={overview.earnings} />

        {(jobs.every((j) => j.status === 'completed') || jobs.length === 0) && (
          <Card className="border-l-[3px] border-l-accent">
            <div className="text-sm font-semibold text-text">End-of-day</div>
            <div className="text-sm text-muted mt-1">Close out today’s work when you’re done.</div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="primary" showArrow={false} className="px-3 py-2 rounded-lg text-sm" disabled title="TODO: wire end-of-day action">
                End Day
              </Button>
              <button className="text-sm text-muted hover:text-text transition-colors" disabled title="TODO: wire report issue flow">
                Report issue
              </button>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

