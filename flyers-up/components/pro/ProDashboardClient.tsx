'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import { AppIcon } from '@/components/ui/AppIcon';
import Link from 'next/link';
import { SideMenu } from '@/components/ui/SideMenu';
import { AtAGlanceCard } from '@/components/ui/AtAGlanceCard';
import { getProJobs, type Booking } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';

export default function ProDashboardClient({ userName }: { userName: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobs, setJobs] = useState<Booking[]>([]);
  const [proRating, setProRating] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setJobsLoading(true);
      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;
        if (!user) {
          if (mounted) setJobs([]);
          return;
        }
        const data = await getProJobs(user.id);
        if (!mounted) return;
        setJobs(data);

        // Best-effort: fetch rating for "Today at a Glance".
        const { data: proRow } = await supabase
          .from('service_pros')
          .select('rating')
          .eq('user_id', user.id)
          .maybeSingle();
        if (mounted) setProRating(typeof (proRow as any)?.rating === 'number' ? (proRow as any).rating : null);
      } finally {
        if (mounted) setJobsLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const actionNeededCount = useMemo(() => jobs.filter((j) => j.status === 'requested').length, [jobs]);
  const actionRequired = actionNeededCount > 0;
  const todayJobs = useMemo(() => {
    return jobs
      .filter((j) => j.date === todayIso)
      .filter((j) => ['accepted', 'requested', 'awaiting_payment'].includes(j.status))
      .map((j) => ({
        id: j.id,
        date: j.date,
        service: j.category || 'Service',
        customerName: j.customerName || 'Customer',
        time: j.time,
        total: Number(j.price ?? 0),
        status: j.status,
      }));
  }, [jobs, todayIso]);

  const nextJobs = useMemo(() => {
    // Show accepted upcoming work even when there are no "today" jobs.
    // (Many pros accept requests for future dates.)
    const upcoming = jobs
      .filter((j) => ['accepted', 'awaiting_payment'].includes(j.status))
      .slice()
      .sort((a, b) => {
        const aKey = `${a.date}T${a.time}`;
        const bKey = `${b.date}T${b.time}`;
        return aKey.localeCompare(bKey);
      });
    return upcoming.slice(0, 3).map((j) => ({
      id: j.id,
      date: j.date,
      service: j.category || 'Service',
      customerName: j.customerName || 'Customer',
      time: j.time,
      total: Number(j.price ?? 0),
      status: j.status,
    }));
  }, [jobs]);

  return (
    <AppLayout mode="pro">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="h-10 w-10 rounded-xl bg-surface2 border border-hairline text-text hover:bg-surface transition-colors"
              aria-label="Open menu"
            >
              ☰
            </button>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-text">{userName}</h1>
              <div className="text-sm text-muted">Pro</div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <AtAGlanceCard jobs={todayJobs} rating={proRating} actionNeededCount={actionNeededCount} />
        </div>

        {actionRequired ? (
          <Card className="mb-6 border-l-[3px] border-l-accent">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-text">Action required</div>
                <div className="mt-1 text-sm text-muted">
                  You have <span className="font-semibold text-accent">{actionNeededCount}</span> new request
                  {actionNeededCount === 1 ? '' : 's'}.
                </div>
              </div>
              <div className="shrink-0">
                <Link
                  href="/pro/requests"
                  className="inline-flex items-center justify-center rounded-xl px-4 py-2 bg-accent text-accentContrast font-semibold hover:opacity-95 transition-opacity focus-ring"
                >
                  Review requests
                </Link>
              </div>
            </div>
          </Card>
        ) : null}

        {/* Clean-slate onboarding prompt */}
        <Card className="mb-8 border-l-[3px] border-l-accent">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold tracking-tight text-text">You’re set up. Next: win more work.</div>
              <div className="mt-1 text-sm text-muted">
                Keep your listing tight and respond fast to requests. This is how you start getting consistent bookings.
              </div>
            </div>
            <div className="shrink-0">
              <Link href="/pro/requests" className="text-sm font-medium text-text hover:underline">
                View requests
              </Link>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/pro/settings/business"
              className="rounded-xl border border-hairline bg-surface hover:bg-surface2 transition-colors px-4 py-3 shadow-card"
            >
              <div className="text-sm font-semibold text-text">Polish your business profile</div>
              <div className="text-xs text-muted mt-1">Clear category + service area increases matches.</div>
            </Link>
            <Link
              href="/pro/settings/payments-payouts"
              className="rounded-xl border border-hairline bg-surface hover:bg-surface2 transition-colors px-4 py-3 shadow-card"
            >
              <div className="text-sm font-semibold text-text">Connect payouts</div>
              <div className="text-xs text-muted mt-1">So you can get paid when jobs complete.</div>
            </Link>
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="mb-6">
          <div className="flex items-end justify-between gap-4 mb-3">
            <Label>OPPORTUNITIES</Label>
            <Link href="/pro/settings/business" className="text-sm font-medium text-text hover:underline">
              Improve listing
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Link href="/pro/settings/business" className="block">
              <Card className="cursor-pointer hover:shadow-card transition-shadow">
                <div className="text-center py-4">
                  <div className="mb-2 flex justify-center">
                    <AppIcon name="building" size={22} className="text-muted" alt="" />
                  </div>
                  <div className="text-sm font-medium text-text">My Business</div>
                </div>
              </Card>
            </Link>
            <Link href="/pro/credentials" className="block">
              <Card className="cursor-pointer hover:shadow-card transition-shadow">
                <div className="text-center py-4">
                  <div className="mb-2 flex justify-center">
                    <AppIcon name="file-text" size={22} className="text-muted" alt="" />
                  </div>
                  <div className="text-sm font-medium text-text">Credentials</div>
                </div>
              </Card>
            </Link>
          </div>
        </div>

        {/* Today's Jobs */}
        <div className="mb-6">
          <Label className="mb-4 block">TODAY&apos;S JOBS</Label>
          {jobsLoading ? (
            <Card className="border-l-[3px] border-l-accent">
              <div className="text-base font-semibold text-text">Loading…</div>
              <div className="mt-1 text-sm text-muted">Fetching today’s schedule.</div>
            </Card>
          ) : todayJobs.length === 0 ? (
            <Card className="border-l-[3px] border-l-accent">
              <div className="text-base font-semibold text-text">No jobs scheduled yet</div>
              <div className="mt-1 text-sm text-muted">When you accept work, it will show up here.</div>
              {nextJobs.length > 0 ? (
                <div className="mt-4">
                  <div className="text-xs text-muted/70 mb-2">Next scheduled</div>
                  <div className="flex flex-col gap-2">
                    {nextJobs.map((job) => (
                      <Link key={job.id} href={`/pro/jobs/${job.id}`} className="block">
                        <div className="surface-item px-3 py-2">
                          <div className="text-sm font-semibold text-text">
                            {job.date} • {job.time}
                          </div>
                          <div className="text-sm text-muted truncate">
                            {job.customerName} • {job.service}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/pro/requests"
                  className="inline-flex items-center justify-center rounded-xl px-4 py-2 bg-accent text-accentContrast font-semibold hover:opacity-95 transition-opacity focus-ring"
                >
                  Check requests
                </Link>
                <Link
                  href="/pro/settings/business"
                  className="inline-flex items-center justify-center rounded-xl px-4 py-2 bg-surface hover:bg-surface2 text-text font-semibold border border-hairline transition-colors focus-ring"
                >
                  Update profile
                </Link>
                <Link
                  href="/pro/today"
                  className="inline-flex items-center justify-center rounded-xl px-4 py-2 bg-surface hover:bg-surface2 text-text font-semibold border border-hairline transition-colors focus-ring"
                >
                  View today
                </Link>
              </div>
            </Card>
          ) : (
            <div className="flex flex-col gap-[14px] overflow-visible">
              {todayJobs.map((job) => (
                <Link key={job.id} href={`/pro/jobs/${job.id}`} className="block">
                  <Card className="border-l-[3px] border-l-accent">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-semibold text-text mb-1 truncate">{job.service}</div>
                        <div className="text-sm text-muted">
                          {job.customerName} • {job.time}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-accent">${job.total}</div>
                        <div className="mt-1 flex justify-end">
                          <span className="text-xs text-muted">{job.status}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} mode="pro" userName={userName} />
    </AppLayout>
  );
}

