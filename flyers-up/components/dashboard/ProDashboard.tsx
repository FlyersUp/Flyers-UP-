'use client';

/**
 * Pro Dashboard — Uber Driver / TaskRabbit / delivery driver
 * Help pros manage jobs, accept work, and track earnings quickly.
 *
 * Structure:
 * 1. Today's overview (earnings + jobs count)
 * 2. Today's jobs (priority)
 * 3. Incoming requests
 * 4. Upcoming jobs
 * 5. Earnings summary
 *
 * States: loading, empty, error
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { DashboardCard, DashboardSectionSkeleton } from '@/components/dashboard/DashboardCard';
import Link from 'next/link';
import { SideMenu } from '@/components/ui/SideMenu';
import { getProJobs, getProEarnings, type Booking } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';
import { ChevronRight, DollarSign, Briefcase, Calendar, Inbox, Bell } from 'lucide-react';
import { MiniScheduleWidget } from '@/components/calendar/MiniScheduleWidget';
import type { CalendarEvent } from '@/lib/calendar/event-from-booking';
import { DateTime } from 'luxon';
import { DEFAULT_BOOKING_TIMEZONE, todayIsoInBookingTimezone } from '@/lib/datetime';
import { isProCommittedScheduleStatus } from '@/lib/bookings/pro-dashboard-bookings';

type PendingRequest = {
  id: string;
  serviceName: string;
  address: string;
  customerName: string;
  durationHours: number | null;
  price: number | null;
  serviceDate: string;
  serviceTime: string;
  createdAt: string;
};

type TodayJob = {
  id: string;
  service: string;
  customerName: string;
  time: string;
  total: number;
  status: string;
  statusLabel: string;
};

type UpcomingJob = {
  id: string;
  service: string;
  customerName: string;
  date: string;
  time: string;
  total: number;
  status: string;
};

function formatStatus(s: string): string {
  const lower = (s || '').toLowerCase();
  if (lower === 'deposit_paid') return 'Deposit paid';
  if (lower === 'accepted') return 'Scheduled';
  if (lower === 'on_the_way' || lower === 'pro_en_route') return 'On the way';
  if (lower === 'in_progress') return 'In progress';
  if (lower === 'awaiting_payment' || lower === 'completed_pending_payment') return 'Payment due';
  return s.replace(/_/g, ' ');
}

function getStatusVariant(status: string): string {
  const lower = (status || '').toLowerCase();
  if (['on_the_way', 'pro_en_route', 'in_progress'].includes(lower))
    return 'bg-[hsl(var(--accent-customer)/0.2)] text-text border border-[hsl(var(--accent-customer)/0.55)]';
  if (['deposit_paid', 'awaiting_payment', 'completed_pending_payment'].includes(lower))
    return 'bg-[hsl(var(--accent-pro)/0.24)] text-text border border-[hsl(var(--accent-pro)/0.58)]';
  return 'bg-surface2 text-text2 border border-border';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

const RESPOND_DEADLINE_MINUTES = 30;

function useCountdown(createdAt: string) {
  const [text, setText] = useState('');
  useEffect(() => {
    const expiresAt = new Date(createdAt).getTime() + RESPOND_DEADLINE_MINUTES * 60 * 1000;
    const update = () => {
      const now = Date.now();
      const diff = expiresAt - now;
      if (diff <= 0) {
        setText('Expired');
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setText(mins > 0 ? `Expires in ${mins}m` : `Expires in ${secs}s`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [createdAt]);
  return text;
}

function PendingRequestCard({
  request,
  onAccept,
  onDecline,
}: {
  request: PendingRequest;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [declineLoading, setDeclineLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const countdown = useCountdown(request.createdAt);

  const handleAccept = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAcceptLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${request.id}/accept`, { method: 'POST', credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Failed to accept');
        return;
      }
      onAccept();
    } catch {
      setError('Something went wrong');
    } finally {
      setAcceptLoading(false);
    }
  };

  const handleDecline = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeclineLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${request.id}/decline`, { method: 'POST', credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Failed to decline');
        return;
      }
      onAccept();
    } catch {
      setError('Something went wrong');
    } finally {
      setDeclineLoading(false);
    }
  };

  const durationStr = request.durationHours != null
    ? `${request.durationHours} hr${request.durationHours !== 1 ? 's' : ''}`
    : null;

  return (
    <DashboardCard>
      <Link href={`/pro/jobs/${request.id}`} className="block">
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-text">{request.serviceName}</div>
              <div className="text-sm text-muted mt-0.5 truncate">{request.address}</div>
              <div className="text-sm text-muted mt-0.5">{request.customerName}</div>
              <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1.5 text-xs text-muted">
                {durationStr && <span>{durationStr}</span>}
                {request.price != null ? (
                  <span className="font-medium text-amber-600 dark:text-amber-400">${request.price.toFixed(0)}</span>
                ) : (
                  <span>Price TBD</span>
                )}
                <span>• {request.serviceDate} at {request.serviceTime}</span>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200">
                Waiting for response
              </span>
              {countdown && (
                <div className="text-xs text-muted mt-1">{countdown}</div>
              )}
            </div>
          </div>
        </div>
      </Link>
      <div className="px-4 pb-4 pt-0 space-y-2">
        <div className="flex gap-2 -mt-1 pt-2 border-t border-border">
          <button
            type="button"
            onClick={handleAccept}
            disabled={acceptLoading || declineLoading}
            className="flex-1 py-2.5 rounded-xl bg-accent text-accentContrast text-sm font-semibold hover:opacity-95 disabled:opacity-70 transition-opacity"
          >
            {acceptLoading ? 'Accepting…' : 'Accept'}
          </button>
          <button
            type="button"
            onClick={handleDecline}
            disabled={acceptLoading || declineLoading}
            className="flex-1 py-2.5 rounded-xl border border-border text-text text-sm font-semibold hover:bg-surface2 disabled:opacity-70 transition-opacity"
          >
            {declineLoading ? 'Declining…' : 'Decline'}
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </DashboardCard>
  );
}

export default function ProDashboard({ userName, proId }: { userName: string; proId?: string | null }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [jobs, setJobs] = useState<Booking[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [earnings, setEarnings] = useState<{
    thisWeek?: number;
    thisMonth?: number;
    totalEarnings?: number;
    completedJobs?: number;
  } | null>(null);
  const [earningsLoading, setEarningsLoading] = useState(true);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        if (mounted) setJobs([]);
        return;
      }
      try {
        const data = await getProJobs(user.id);
        if (!mounted) return;
        setJobs(data);
      } finally {
        if (mounted) setJobsLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const fetchPendingRequests = useCallback(async () => {
    try {
      const res = await fetch(
        '/api/pro/bookings?statuses=requested,pending&limit=5',
        { cache: 'no-store', credentials: 'include' }
      );
      const json = await res.json().catch(() => ({}));
      if (!json.ok || !Array.isArray(json.bookings)) return;
      setPendingRequests(
        json.bookings.map((b: {
          id: string;
          serviceName?: string;
          address: string;
          customer?: { fullName?: string | null } | null;
          duration_hours?: number | null;
          price: number | null;
          service_date: string;
          service_time: string;
          created_at: string;
        }) => ({
          id: b.id,
          serviceName: b.serviceName ?? 'Service',
          address: b.address ?? '',
          customerName: b.customer?.fullName ?? 'Customer',
          durationHours: b.duration_hours ?? null,
          price: b.price,
          serviceDate: b.service_date,
          serviceTime: b.service_time,
          createdAt: b.created_at,
        }))
      );
    } catch {
      // ignore
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void fetchPendingRequests().then(() => {
      if (!mounted) return;
      setRequestsLoading(false);
    });
    return () => { mounted = false; };
  }, [fetchPendingRequests]);

  useEffect(() => {
    let mounted = true;
    const today = todayIsoInBookingTimezone(DEFAULT_BOOKING_TIMEZONE);
    const to =
      DateTime.fromISO(today, { zone: DEFAULT_BOOKING_TIMEZONE }).plus({ days: 60 }).toISODate() ??
      today;
    fetch(`/api/calendar/events?role=pro&from=${today}&to=${to}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((json: { ok?: boolean; events?: CalendarEvent[] }) => {
        if (mounted && json.ok && Array.isArray(json.events)) setCalendarEvents(json.events);
      })
      .catch(() => {})
      .finally(() => {});
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        if (mounted) setEarningsLoading(false);
        return;
      }
      getProEarnings(user.id)
        .then((e) => {
          if (!mounted) return;
          setEarnings({
            thisWeek: e.thisWeek ?? 0,
            thisMonth: e.thisMonth ?? 0,
            totalEarnings: e.totalEarnings ?? 0,
            completedJobs: e.completedJobs ?? 0,
          });
        })
        .catch(() => {})
        .finally(() => {
          if (mounted) setEarningsLoading(false);
        });
    });
    return () => {
      mounted = false;
    };
  }, []);

  const todayIso = useMemo(() => todayIsoInBookingTimezone(DEFAULT_BOOKING_TIMEZONE), []);
  const todayJobs = useMemo((): TodayJob[] => {
    return jobs
      .filter((j) => j.date === todayIso)
      .filter((j) => isProCommittedScheduleStatus(j.status))
      .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
      .map((j) => ({
        id: j.id,
        service: j.category || 'Service',
        customerName: j.customerName || 'Customer',
        time: j.time,
        total: Number(j.price ?? 0),
        status: j.status,
        statusLabel: formatStatus(j.status),
      }));
  }, [jobs, todayIso]);

  const upcomingJobs = useMemo((): UpcomingJob[] => {
    return jobs
      .filter((j) => j.date > todayIso)
      .filter((j) => isProCommittedScheduleStatus(j.status))
      .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
      .slice(0, 5)
      .map((j) => ({
        id: j.id,
        service: j.category || 'Service',
        customerName: j.customerName || 'Customer',
        date: j.date,
        time: j.time,
        total: Number(j.price ?? 0),
        status: j.status,
      }));
  }, [jobs, todayIso]);

  const todayEarnings = useMemo(() => {
    return todayJobs.reduce((sum, j) => sum + j.total, 0);
  }, [todayJobs]);

  useEffect(() => {
    if (!proId) return;
    const channel = supabase
      .channel('pro-pending-bookings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `pro_id=eq.${proId}`,
        },
        () => {
          void fetchPendingRequests();
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [proId, fetchPendingRequests]);

  return (
    <AppLayout mode="pro" showFloatingNotificationBell={false}>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-clip bg-bg w-full max-w-full">
        <div className="sticky top-0 z-20 safe-area-top bg-bg/95 backdrop-blur-sm border-b border-border">
          <header className="relative mx-auto flex h-14 w-full max-w-4xl min-w-0 items-center px-4 sm:h-[3.75rem]">
            <div className="flex shrink-0 items-center">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface2 text-text hover:bg-surface2/80"
                aria-label="Open menu"
              >
                ☰
              </button>
            </div>
            <h1 className="pointer-events-none absolute left-1/2 top-1/2 max-w-[calc(100%-7.5rem)] -translate-x-1/2 -translate-y-1/2 truncate text-center text-base font-semibold text-text sm:max-w-[calc(100%-9rem)] sm:text-lg">
              {userName}
            </h1>
            <div className="ml-auto flex shrink-0 items-center">
              <NotificationBell basePath="pro" />
            </div>
          </header>
        </div>

        <div className="mx-auto w-full max-w-4xl min-w-0 space-y-8 px-3 py-6 sm:px-4 pb-24">
          {/* 0. Share profile link */}
          {proId && (
            <section>
              <DashboardCard>
                <div className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <div className="font-semibold text-text">Share your profile</div>
                    <div className="text-sm text-muted mt-0.5">Customers can rebook you directly</div>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Link
                      href="/pro/profile"
                      className="px-3 py-2 rounded-lg border border-border text-sm font-medium hover:bg-surface2 inline-flex items-center justify-center"
                    >
                      View
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/book/${proId}`;
                        void navigator.clipboard.writeText(url).then(() => {
                          // Optional: show toast
                        });
                      }}
                      className="px-3 py-2 rounded-lg bg-accent/10 text-accent text-sm font-medium hover:bg-accent/20"
                    >
                      Copy link
                    </button>
                  </div>
                </div>
              </DashboardCard>
            </section>
          )}

          {/* 1. TODAY'S OVERVIEW (earnings + jobs) */}
          <section>
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              Today
            </h2>
            {jobsLoading || earningsLoading ? (
              <DashboardSectionSkeleton />
            ) : (
              <DashboardCard>
                <div className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <DollarSign size={24} className="text-amber-600 dark:text-amber-400" strokeWidth={2} />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-text">
                          ${todayEarnings.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </div>
                        <div className="text-sm text-muted">Today&apos;s earnings</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:ml-auto min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center shrink-0">
                        <Briefcase size={24} className="text-accent" strokeWidth={2} />
                      </div>
                      <div className="text-left sm:text-right min-w-0">
                        <div className="text-2xl font-bold text-text">{todayJobs.length}</div>
                        <div className="text-sm text-muted">Jobs today</div>
                      </div>
                    </div>
                  </div>
                </div>
              </DashboardCard>
            )}
          </section>

          {/* 2. TODAY'S JOBS (priority) */}
          <section>
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              Today&apos;s jobs
            </h2>
            {jobsLoading ? (
              <DashboardSectionSkeleton />
            ) : todayJobs.length > 0 ? (
              <div className="space-y-2">
                {todayJobs.map((job) => (
                  <Link key={job.id} href={`/pro/jobs/${job.id}`}>
                    <DashboardCard>
                      <div className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-text break-words">{job.service}</div>
                          <div className="text-sm text-muted mt-0.5 break-words">
                            {job.customerName} • {job.time}
                          </div>
                          <span
                            className={`inline-block mt-2 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusVariant(job.status)}`}
                          >
                            {job.statusLabel}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center justify-between gap-2 sm:flex-col sm:items-end sm:text-right">
                          <div className="text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                            ${job.total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </div>
                          <ChevronRight size={18} className="text-muted sm:mt-0.5" />
                        </div>
                      </div>
                    </DashboardCard>
                  </Link>
                ))}
                <Link
                  href="/pro/today"
                  className="block text-sm font-medium text-muted hover:text-text transition-colors"
                >
                  View today&apos;s schedule →
                </Link>
              </div>
            ) : (
              <DashboardCard>
                <div className="p-5">
                  <div className="font-semibold text-text">No jobs today</div>
                  <div className="text-sm text-muted mt-1">When you accept work, it will show here.</div>
                  <Link
                    href="/pro/requests"
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                  >
                    Check requests <ChevronRight size={16} />
                  </Link>
                </div>
              </DashboardCard>
            )}
          </section>

          {/* 2b. MINI SCHEDULE */}
          <section>
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              Schedule
            </h2>
            <MiniScheduleWidget events={calendarEvents} mode="pro" detailHref="/pro/calendar" />
          </section>

          {/* 3. PENDING REQUESTS */}
          <section>
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              Pending requests
            </h2>
            {requestsLoading ? (
              <DashboardSectionSkeleton />
            ) : pendingRequests.length > 0 ? (
              <div className="space-y-3">
                {pendingRequests.slice(0, 3).map((r) => (
                  <PendingRequestCard
                    key={r.id}
                    request={r}
                    onAccept={() => void fetchPendingRequests()}
                    onDecline={() => void fetchPendingRequests()}
                  />
                ))}
                <Link
                  href="/pro/jobs"
                  className="block text-sm font-medium text-muted hover:text-text transition-colors"
                >
                  View all jobs →
                </Link>
              </div>
            ) : (
              <DashboardCard>
                <div className="p-5 flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-2xl bg-surface2 flex items-center justify-center mb-3">
                    <Inbox size={24} className="text-muted" strokeWidth={2} />
                  </div>
                  <div className="font-semibold text-text">No pending requests</div>
                  <div className="text-sm text-muted mt-1">New booking requests will appear here.</div>
                  <div className="flex flex-wrap gap-2 mt-4 justify-center">
                    <Link
                      href="/pro/settings/pricing-availability"
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-accent text-accentContrast text-sm font-semibold hover:opacity-95 transition-opacity"
                    >
                      Go online
                    </Link>
                    <Link
                      href="/pro/notifications"
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border text-text text-sm font-semibold hover:bg-surface2 transition-colors"
                    >
                      <Bell size={16} strokeWidth={2} />
                      Check notifications
                    </Link>
                  </div>
                </div>
              </DashboardCard>
            )}
          </section>

          {/* 4. UPCOMING JOBS */}
          <section>
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              Upcoming jobs
            </h2>
            {jobsLoading ? (
              <DashboardSectionSkeleton />
            ) : upcomingJobs.length > 0 ? (
              <div className="space-y-2">
                {upcomingJobs.map((job) => (
                  <Link key={job.id} href={`/pro/jobs/${job.id}`}>
                    <DashboardCard>
                      <div className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-surface2 shrink-0 flex items-center justify-center">
                          <Calendar size={18} className="text-muted" strokeWidth={2} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-text truncate">{job.service}</div>
                          <div className="text-sm text-muted">
                            {job.customerName} • {formatDate(job.date)} at {job.time}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-sm font-semibold text-text">
                            ${job.total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </div>
                          <ChevronRight size={18} className="text-muted mt-0.5" />
                        </div>
                      </div>
                    </DashboardCard>
                  </Link>
                ))}
                <Link
                  href="/pro/bookings"
                  className="block text-sm font-medium text-muted hover:text-text transition-colors"
                >
                  View all bookings →
                </Link>
                <Link
                  href="/pro/recurring"
                  className="block text-sm font-medium text-muted hover:text-text transition-colors mt-1"
                >
                  Recurring clients →
                </Link>
              </div>
            ) : (
              <DashboardCard>
                <div className="p-4">
                  <div className="text-sm font-medium text-text">No upcoming jobs</div>
                  <div className="text-xs text-muted mt-0.5">Future bookings will appear here.</div>
                </div>
              </DashboardCard>
            )}
          </section>

          {/* 5. EARNINGS SUMMARY */}
          <section>
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              Earnings
            </h2>
            {earningsLoading ? (
              <DashboardSectionSkeleton />
            ) : (
              <Link href="/pro/earnings">
                <DashboardCard>
                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <DollarSign size={24} className="text-amber-600 dark:text-amber-400" strokeWidth={2} />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-text">
                          $
                          {(earnings?.thisWeek ?? earnings?.thisMonth ?? 0).toLocaleString('en-US', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })}
                        </div>
                        <div className="text-sm text-muted">
                          This week
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Total earned</span>
                      <span className="font-semibold text-text">
                        ${(earnings?.totalEarnings ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-muted">Jobs completed</span>
                      <span className="font-semibold text-text">{earnings?.completedJobs ?? 0}</span>
                    </div>
                    <div className="mt-3 text-sm font-medium text-accent">View earnings →</div>
                  </div>
                </DashboardCard>
              </Link>
            )}
          </section>
        </div>
      </div>
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} role="pro" userName={userName} />
    </AppLayout>
  );
}
