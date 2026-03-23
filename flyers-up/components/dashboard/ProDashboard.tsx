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

import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { DashboardCard, DashboardSectionSkeleton } from '@/components/dashboard/DashboardCard';
import Link from 'next/link';
import { SideMenu } from '@/components/ui/SideMenu';
import { getProJobs, getProEarnings, type Booking } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';
import { ChevronRight, DollarSign, Briefcase, Calendar } from 'lucide-react';
import { MiniScheduleWidget } from '@/components/calendar/MiniScheduleWidget';
import type { CalendarEvent } from '@/lib/calendar/event-from-booking';

type JobRequestRow = {
  id: string;
  title: string;
  description: string | null;
  service_category: string;
  budget_min: number | null;
  budget_max: number | null;
  location: string;
  preferred_date: string | null;
  preferred_time: string | null;
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

const TODAY_STATUSES =
  'requested,pending,accepted,deposit_paid,pro_en_route,on_the_way,arrived,in_progress,completed_pending_payment,awaiting_payment,awaiting_remaining_payment';

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

export default function ProDashboard({ userName, proId }: { userName: string; proId?: string | null }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [jobs, setJobs] = useState<Booking[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [requests, setRequests] = useState<JobRequestRow[]>([]);
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

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase
          .from('job_requests')
          .select(
            'id, title, description, service_category, budget_min, budget_max, location, preferred_date, preferred_time'
          )
          .eq('status', 'open')
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(5);
        if (!mounted) return;
        setRequests((data ?? []) as JobRequestRow[]);
      } catch {
        // ignore
      } finally {
        if (mounted) setRequestsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const today = new Date().toISOString().slice(0, 10);
    const end = new Date();
    end.setDate(end.getDate() + 60);
    const to = end.toISOString().slice(0, 10);
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

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const todayJobs = useMemo((): TodayJob[] => {
    return jobs
      .filter((j) => j.date === todayIso)
      .filter((j) => TODAY_STATUSES.split(',').includes(j.status))
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
      .filter((j) => TODAY_STATUSES.split(',').includes(j.status))
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

  return (
    <AppLayout mode="pro">
      <div className="min-h-screen bg-bg overflow-x-hidden w-full">
        <div className="sticky top-0 z-20 bg-bg/95 backdrop-blur-sm border-b border-border">
          <div className="w-full max-w-4xl mx-auto px-4 py-4 flex items-center justify-between min-w-0">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="h-10 w-10 rounded-xl bg-surface2 border border-border text-text hover:bg-surface2/80 flex items-center justify-center"
              aria-label="Open menu"
            >
              ☰
            </button>
            <h1 className="text-xl font-semibold text-text truncate max-w-[60vw]">{userName}</h1>
            <div className="w-10" />
          </div>
        </div>

        <div className="w-full max-w-4xl mx-auto px-4 py-6 space-y-8 min-w-0 pb-24">
          {/* 0. Share profile link */}
          {proId && (
            <section>
              <DashboardCard>
                <div className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-text">Share your profile</div>
                    <div className="text-sm text-muted mt-0.5">Customers can rebook you directly</div>
                  </div>
                  <div className="flex gap-2 shrink-0">
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
                  <div className="flex items-center justify-between gap-6">
                    <div className="flex items-center gap-3">
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
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
                        <Briefcase size={24} className="text-accent" strokeWidth={2} />
                      </div>
                      <div className="text-right">
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
                      <div className="p-4 flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-text">{job.service}</div>
                          <div className="text-sm text-muted mt-0.5">
                            {job.customerName} • {job.time}
                          </div>
                          <span
                            className={`inline-block mt-2 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusVariant(job.status)}`}
                          >
                            {job.statusLabel}
                          </span>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                            ${job.total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </div>
                          <ChevronRight size={18} className="text-muted mt-0.5" />
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

          {/* 3. INCOMING REQUESTS */}
          <section>
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              Incoming requests
            </h2>
            {requestsLoading ? (
              <DashboardSectionSkeleton />
            ) : requests.length > 0 ? (
              <div className="space-y-2">
                {requests.slice(0, 3).map((r) => (
                  <Link key={r.id} href="/pro/requests">
                    <DashboardCard>
                      <div className="p-4 flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-text truncate">{r.title}</div>
                          <div className="text-sm text-muted mt-0.5">
                            {r.location}
                            {(r.budget_min != null || r.budget_max != null) && (
                              <span>
                                {' '}
                                • ${r.budget_min ?? '?'}–${r.budget_max ?? '?'}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight size={18} className="text-muted shrink-0" />
                      </div>
                    </DashboardCard>
                  </Link>
                ))}
                <Link
                  href="/pro/requests"
                  className="block text-sm font-medium text-muted hover:text-text transition-colors"
                >
                  View all requests →
                </Link>
              </div>
            ) : (
              <DashboardCard>
                <div className="p-4">
                  <div className="text-sm font-medium text-text">No open requests</div>
                  <div className="text-xs text-muted mt-0.5">New requests will appear here.</div>
                  <Link href="/pro/requests" className="mt-2 inline-block text-sm text-accent hover:underline">
                    View demand board →
                  </Link>
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
