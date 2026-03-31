'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrivalVerificationModal } from '@/components/marketplace/ArrivalVerificationModal';
import { JobCompletionModal } from '@/components/marketplace/JobCompletionModal';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { StatusPill } from '@/components/ui/StatusPill';
import { ListRow } from '@/components/ui/ListRow';
import { supabase } from '@/lib/supabaseClient';
import { getOrCreateProfile, routeAfterAuth } from '@/lib/onboarding';
import { getTodayOverview, type TodayAlert, type TodayJob, type TodayOverview, type TodayTask } from '@/lib/today';
import { DEFAULT_BOOKING_TIMEZONE, todayIsoInBookingTimezone } from '@/lib/datetime';

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
  return alertCount > 0 ? { label: 'Needs attention', tone: 'warning' as const } : { label: 'On track', tone: 'success' as const };
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
          <StatusPill tone={status.tone}>
            {status.label}
          </StatusPill>
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
              title={!a.ctaLabel ? 'No action available' : undefined}
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
  statusUpdating,
}: {
  jobs: TodayJob[];
  onUpdateJobStatus: (jobId: string, next: TodayJob['status'], dbStatus?: string) => void | Promise<void>;
  statusUpdating: string | null;
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
                  {job.client_phone ? (
                    <a
                      className="px-3 py-2 rounded-lg text-sm font-semibold border-2 border-accent bg-surface text-accent hover:bg-surface2 transition-all focus-ring btn-press"
                      href={`tel:${job.client_phone}`}
                    >
                      Call
                    </a>
                  ) : null}
                  {job.bookingId ? (
                    <Link
                      className="px-3 py-2 rounded-lg text-sm font-semibold border-2 border-accent bg-surface text-accent hover:bg-surface2 transition-all focus-ring btn-press"
                      href={`/pro/chat/${job.bookingId}`}
                    >
                      Message
                    </Link>
                  ) : null}
                  <Button
                    variant="primary"
                    showArrow={false}
                    className="px-3 py-2 rounded-lg text-sm"
                    disabled={!canStart || statusUpdating === job.id}
                    onClick={() => void onUpdateJobStatus(job.id, 'in_progress', job.dbStatus)}
                    title={!canStart ? 'Only upcoming jobs can be started' : undefined}
                  >
                    {statusUpdating === job.id ? '…' : 'Start'}
                  </Button>
                  <Button
                    variant="primary"
                    showArrow={false}
                    className="px-3 py-2 rounded-lg text-sm"
                    disabled={!canComplete || statusUpdating === job.id}
                    onClick={() => void onUpdateJobStatus(job.id, 'completed', job.dbStatus)}
                    title={!canComplete ? 'Only in-progress jobs can be completed' : undefined}
                  >
                    {statusUpdating === job.id ? '…' : 'Complete'}
                  </Button>
                </div>
              </div>
            </div>
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
            href={`/pro/chat/conversation/${m.thread_id}`}
            className="block"
          >
            <ListRow
              className="hover:bg-hover"
              icon={<span className="text-xs font-semibold">✉</span>}
              title={m.client_name}
              subtext={m.snippet}
              rightSlot={
                <span className="whitespace-nowrap text-xs text-muted">
                  {new Date(m.updated_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </span>
              }
            />
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
      pending_reschedule?: {
        proposed_service_date: string;
        proposed_service_time: string;
      } | null;
    }>
  >([]);

  const canStartReal = (s: string) =>
    ['deposit_paid', 'accepted', 'pro_en_route', 'on_the_way', 'pending', 'requested'].includes((s ?? '').toLowerCase());
  const canCompleteReal = (s: string) => (s ?? '').toLowerCase() === 'in_progress';

  useEffect(() => {
    let mounted = true;
    const guardAndLoad = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted) return;
        if (!user) {
          router.replace('/auth?next=%2Fpro%2Ftoday');
          return;
        }

        const profile = await getOrCreateProfile(user.id, user.email ?? null);
        if (!mounted) return;
        if (!profile) {
          const todayISO = todayIsoInBookingTimezone(DEFAULT_BOOKING_TIMEZONE);
          setOverview({
            dateISO: todayISO,
            jobs: [],
            alerts: [],
            tasks: [],
            earnings: { expected: null, completed: null, pending_release: null, tips: null },
            messages: [],
          });
          return;
        }
        const dest = routeAfterAuth(profile, '/pro/today');
        if (dest !== '/pro/today') {
          router.replace(dest);
          return;
        }

        const data = await getTodayOverview(user.id);
        if (!mounted) return;
        setOverview(data);
        setJobs(data.jobs);
        setTasks(data.tasks);

        // Replace mock timeline jobs with real bookings for today (if any).
        try {
          const todayISO = todayIsoInBookingTimezone(DEFAULT_BOOKING_TIMEZONE);
          const todayStatuses = [
            'deposit_paid',
            'requested',
            'accepted',
            'pro_en_route',
            'on_the_way',
            'arrived',
            'in_progress',
            'completed_pending_payment',
            'awaiting_payment',
            'awaiting_remaining_payment',
            'awaiting_customer_confirmation',
            'completed',
          ];
          const res = await fetch(
            `/api/pro/bookings?from=${encodeURIComponent(todayISO)}&to=${encodeURIComponent(todayISO)}&limit=50&statuses=${encodeURIComponent(todayStatuses.join(','))}`,
            { cache: 'no-store' }
          );
          const json = (await res.json()) as { ok: boolean; bookings?: any[] };
          if (mounted && res.ok && json.ok && Array.isArray(json.bookings)) {
            setRealBookings(json.bookings);
          } else if (mounted) {
            setRealBookings([]);
          }
        } catch {
          if (mounted) setRealBookings([]);
        }
      } catch {
        if (mounted) {
          const todayISO = todayIsoInBookingTimezone(DEFAULT_BOOKING_TIMEZONE);
          setOverview({
            dateISO: todayISO,
            jobs: [],
            alerts: [],
            tasks: [],
            earnings: { expected: null, completed: null, pending_release: null, tips: null },
            messages: [],
          });
          setJobs([]);
          setTasks([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void guardAndLoad();
    return () => { mounted = false; };
  }, [router]);

  const hasJobs = jobs.length > 0;

  const alertCount = useMemo(() => (overview?.alerts?.length ? overview.alerts.length : 0), [overview]);

  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [arrivalModalBookingId, setArrivalModalBookingId] = useState<string | null>(null);
  const [completionModalBookingId, setCompletionModalBookingId] = useState<string | null>(null);

  const updateJobStatusViaApi = async (
    bookingId: string,
    next: 'in_progress' | 'completed',
    dbStatus?: string
  ): Promise<boolean> => {
    setStatusUpdating(bookingId);
    try {
        if (next === 'in_progress') {
        const s = (dbStatus ?? '').toLowerCase();
        if (s === 'accepted' || s === 'pending' || s === 'requested') {
          const r1 = await fetch(`/api/jobs/${bookingId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nextStatus: 'ON_THE_WAY' }),
            credentials: 'include',
          });
          if (!r1.ok) {
            const err = await r1.json().catch(() => ({}));
            console.error('Status update failed:', err);
            return false;
          }
        }
        if (s === 'pro_en_route' || s === 'on_the_way') {
          setArrivalModalBookingId(bookingId);
          return false;
        }
        const r2 = await fetch(`/api/jobs/${bookingId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nextStatus: 'IN_PROGRESS' }),
          credentials: 'include',
        });
        if (!r2.ok) {
          const err = await r2.json().catch(() => ({}));
          if ((err as { code?: string }).code === 'arrival_required') {
            setArrivalModalBookingId(bookingId);
            return false;
          }
          console.error('Status update failed:', err);
          return false;
        }
      } else {
        setCompletionModalBookingId(bookingId);
        return false;
      }
      return true;
    } finally {
      setStatusUpdating(null);
    }
  };

  const onUpdateJobStatus = async (jobId: string, next: TodayJob['status'], dbStatus?: string) => {
    const ok = await updateJobStatusViaApi(
      jobId,
      next === 'in_progress' ? 'in_progress' : 'completed',
      dbStatus
    );
    if (ok) {
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status: next } : j))
      );
    }
  };

  const onArrivalSuccess = async () => {
    if (!arrivalModalBookingId) return;
    const ok = await updateJobStatusViaApi(
      arrivalModalBookingId,
      'in_progress',
      'arrived'
    );
    if (ok) {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === arrivalModalBookingId ? { ...j, status: 'in_progress' as const } : j
        )
      );
    }
    setArrivalModalBookingId(null);
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
            <div className="text-sm font-semibold text-text">No bookings yet</div>
            <div className="mt-1 text-sm text-muted">Jobs near you are waiting.</div>
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
                      {b.pending_reschedule ? (
                        <div className="text-sm font-medium text-amber-900 dark:text-amber-200 mt-1">
                          Reschedule requested: {b.pending_reschedule.proposed_service_date} at{' '}
                          {b.pending_reschedule.proposed_service_time}
                        </div>
                      ) : null}
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
                        {b.customer?.phone ? (
                          <a
                            className="px-3 py-2 rounded-lg text-sm font-semibold border-2 border-accent bg-surface text-accent hover:bg-surface2 transition-all focus-ring btn-press"
                            href={`tel:${b.customer.phone}`}
                          >
                            Call
                          </a>
                        ) : null}
                        <Link
                          className="px-3 py-2 rounded-lg text-sm font-semibold border-2 border-accent bg-surface text-accent hover:bg-surface2 transition-all focus-ring btn-press"
                          href={`/pro/chat/${b.id}`}
                        >
                          Message
                        </Link>
                        {canStartReal(b.status) ? (
                          <Button
                            variant="primary"
                            showArrow={false}
                            className="px-3 py-2 rounded-lg text-sm"
                            disabled={statusUpdating === b.id}
                            onClick={async () => {
                              const ok = await updateJobStatusViaApi(b.id, 'in_progress', b.status);
                              if (ok) setRealBookings((prev) => prev.map((x) => (x.id === b.id ? { ...x, status: 'in_progress' } : x)));
                            }}
                          >
                            {statusUpdating === b.id ? '…' : 'Start'}
                          </Button>
                        ) : canCompleteReal(b.status) ? (
                          <Button
                            variant="primary"
                            showArrow={false}
                            className="px-3 py-2 rounded-lg text-sm"
                            disabled={statusUpdating === b.id}
                            onClick={() => setCompletionModalBookingId(b.id)}
                          >
                            {statusUpdating === b.id ? '…' : 'Complete'}
                          </Button>
                        ) : null}
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
            <TodayTimeline jobs={jobs} onUpdateJobStatus={onUpdateJobStatus} statusUpdating={statusUpdating} />
          </div>
        ) : null}

        <TodayTasks tasks={tasks} onToggle={onToggleTask} />
        <TodayMessages messages={overview.messages} />
        <TodayEarnings earnings={overview.earnings} />

        <ArrivalVerificationModal
          isOpen={!!arrivalModalBookingId}
          onClose={() => setArrivalModalBookingId(null)}
          onSuccess={onArrivalSuccess}
          bookingId={arrivalModalBookingId ?? ''}
        />
        <JobCompletionModal
          isOpen={!!completionModalBookingId}
          onClose={() => setCompletionModalBookingId(null)}
          onSuccess={async () => {
            if (completionModalBookingId) {
              setRealBookings((prev) =>
                prev.map((x) =>
                  x.id === completionModalBookingId ? { ...x, status: 'awaiting_remaining_payment' } : x
                )
              );
              setJobs((prev) =>
                prev.map((j) =>
                  j.id === completionModalBookingId ? { ...j, status: 'completed' as const } : j
                )
              );
              setCompletionModalBookingId(null);
            }
          }}
          bookingId={completionModalBookingId ?? ''}
        />

        {(jobs.every((j) => j.status === 'completed') || jobs.length === 0) && (
          <Card className="border-l-[3px] border-l-accent">
            <div className="text-sm font-semibold text-text">End-of-day</div>
            <div className="text-sm text-muted mt-1">Close out today’s work when you’re done.</div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="primary"
                showArrow={false}
                className="px-3 py-2 rounded-lg text-sm"
                onClick={() => router.push('/pro')}
              >
                End Day
              </Button>
              <Link
                href="/pro/settings/help-support"
                className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium text-muted hover:text-text hover:bg-surface2 transition-colors"
              >
                Report issue
              </Link>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

