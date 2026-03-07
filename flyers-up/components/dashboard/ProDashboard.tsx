'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { DashboardCard, DashboardSectionSkeleton } from '@/components/dashboard/DashboardCard';
import Link from 'next/link';
import { SideMenu } from '@/components/ui/SideMenu';
import { getProJobs, getProEarnings, type Booking } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';

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
};

export default function ProDashboard({ userName }: { userName: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [jobs, setJobs] = useState<Booking[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [proRating, setProRating] = useState<number | null>(null);
  const [jobsCompleted, setJobsCompleted] = useState<number>(0);
  const [requests, setRequests] = useState<JobRequestRow[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [earnings, setEarnings] = useState<{ thisWeek: number } | null>(null);
  const [earningsLoading, setEarningsLoading] = useState(true);

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

        const { data: proRow } = await supabase
          .from('service_pros')
          .select('rating, jobs_completed')
          .eq('user_id', user.id)
          .maybeSingle();
        if (mounted && proRow) {
          setProRating(typeof (proRow as { rating?: number }).rating === 'number' ? (proRow as { rating: number }).rating : null);
          setJobsCompleted(Number((proRow as { jobs_completed?: number }).jobs_completed ?? 0));
        }
      } finally {
        if (mounted) setJobsLoading(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase
          .from('job_requests')
          .select('id, title, description, service_category, budget_min, budget_max, location, preferred_date, preferred_time')
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
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        if (mounted) setEarningsLoading(false);
        return;
      }
      getProEarnings(user.id).then((e) => {
        if (!mounted) return;
        setEarnings({ thisWeek: e.thisWeek ?? 0 });
      }).catch(() => {}).finally(() => {
        if (mounted) setEarningsLoading(false);
      });
    });
    return () => { mounted = false; };
  }, []);

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const todayJobs = useMemo((): TodayJob[] => {
    return jobs
      .filter((j) => j.date === todayIso)
      .filter((j) =>
        ['requested', 'pending', 'accepted', 'pro_en_route', 'on_the_way', 'in_progress', 'completed_pending_payment', 'awaiting_payment'].includes(j.status)
      )
      .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
      .map((j) => ({
        id: j.id,
        service: j.category || 'Service',
        customerName: j.customerName || 'Customer',
        time: j.time,
        total: Number(j.price ?? 0),
        status: j.status,
      }));
  }, [jobs, todayIso]);

  return (
    <AppLayout mode="pro">
      <div className="min-h-screen bg-bg">
        <div className="sticky top-0 z-20 bg-bg/95 backdrop-blur-sm border-b border-border">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="h-10 w-10 rounded-xl bg-surface2 border border-border text-gray-900 dark:text-white hover:bg-surface2/80"
              aria-label="Open menu"
            >
              ☰
            </button>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{userName}</h1>
            <div className="w-10" />
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {/* 1. TODAY'S JOBS */}
          <section>
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">Today&apos;s Jobs</h2>
            {jobsLoading ? (
              <DashboardSectionSkeleton />
            ) : todayJobs.length > 0 ? (
              <div className="space-y-2">
                {todayJobs.map((job) => (
                  <Link key={job.id} href={`/pro/jobs/${job.id}`}>
                    <DashboardCard>
                      <div className="p-4 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 dark:text-white">{job.service}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">{job.customerName} • {job.time}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-lg font-bold text-amber-600 dark:text-amber-400">${job.total}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{job.status.replace(/_/g, ' ')}</div>
                        </div>
                      </div>
                    </DashboardCard>
                  </Link>
                ))}
                <Link href="/pro/bookings" className="block text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                  View all bookings →
                </Link>
              </div>
            ) : (
              <DashboardCard>
                <div className="p-4">
                  <div className="font-semibold text-gray-900 dark:text-white">No jobs scheduled yet</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">When you accept work, it will show up here.</div>
                  <Link href="/pro/requests" className="mt-3 inline-block text-sm font-medium text-gray-900 dark:text-white hover:underline">
                    Check requests →
                  </Link>
                </div>
              </DashboardCard>
            )}
          </section>

          {/* 2. REQUESTS NEAR YOU */}
          <section>
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">Requests Near You</h2>
            {requestsLoading ? (
              <DashboardSectionSkeleton />
            ) : requests.length > 0 ? (
              <div className="space-y-2">
                {requests.slice(0, 3).map((r) => (
                  <DashboardCard key={r.id}>
                    <Link href="/pro/requests" className="block p-4">
                      <div className="font-semibold text-gray-900 dark:text-white">{r.title}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {r.location}
                        {(r.budget_min != null || r.budget_max != null) && (
                          <span> • ${r.budget_min ?? '?'}–${r.budget_max ?? '?'}</span>
                        )}
                      </div>
                    </Link>
                  </DashboardCard>
                ))}
                <Link href="/pro/requests">
                  <DashboardCard>
                    <div className="p-4 text-center font-semibold text-gray-900 dark:text-white">View Requests</div>
                  </DashboardCard>
                </Link>
              </div>
            ) : (
              <DashboardCard>
                <div className="p-4">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">No open requests</div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">New requests will appear here.</div>
                  <Link href="/demand" className="mt-2 inline-block text-sm text-gray-900 dark:text-white hover:underline">
                    View Demand Board →
                  </Link>
                </div>
              </DashboardCard>
            )}
          </section>

          {/* 3. WEEKLY EARNINGS */}
          <section>
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">Weekly Earnings</h2>
            {earningsLoading ? (
              <DashboardSectionSkeleton />
            ) : (
              <DashboardCard>
                <Link href="/pro/earnings" className="block p-4">
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    ${(earnings?.thisWeek ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">This week</div>
                  <div className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">View earnings →</div>
                </Link>
              </DashboardCard>
            )}
          </section>

          {/* 4. REPUTATION */}
          <section>
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">Reputation</h2>
            <DashboardCard>
              <div className="p-4 flex gap-6">
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {proRating != null ? proRating.toFixed(1) : '—'}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300">Average rating</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{jobsCompleted}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-300">Jobs completed</div>
                </div>
              </div>
            </DashboardCard>
          </section>

          {/* Keep existing quick links for onboarding */}
          <section>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/pro/settings/business">
                <DashboardCard>
                  <div className="p-4 text-center">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">My Business</div>
                  </div>
                </DashboardCard>
              </Link>
              <Link href="/pro/credentials">
                <DashboardCard>
                  <div className="p-4 text-center">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">Credentials</div>
                  </div>
                </DashboardCard>
              </Link>
            </div>
          </section>
        </div>
      </div>
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} mode="pro" userName={userName} />
    </AppLayout>
  );
}
