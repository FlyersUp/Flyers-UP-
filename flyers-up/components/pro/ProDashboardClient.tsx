'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import { AppIcon } from '@/components/ui/AppIcon';
import Link from 'next/link';
import { SideMenu } from '@/components/ui/SideMenu';

export default function ProDashboardClient({ userName }: { userName: string }) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Clean slate: no fake jobs/earnings/ratings. We'll wire real bookings later.
  const todayJobs: Array<{
    id: string;
    service: string;
    customerName: string;
    time: string;
    total: number;
    status: string;
  }> = [];

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

        {/* Clean-slate onboarding prompt */}
        <Card className="mb-8 border-l-[3px] border-l-accent">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold tracking-tight text-text">You’re set up. Next: get your first job.</div>
              <div className="mt-1 text-sm text-muted">
                Your dashboard stays empty until customers request you. Here’s what you can do now.
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
          {todayJobs.length === 0 ? (
            <Card className="border-l-[3px] border-l-accent">
              <div className="text-base font-semibold text-text">No jobs scheduled yet</div>
              <div className="mt-1 text-sm text-muted">When you accept work, it will show up here.</div>
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
                        <div className="text-2xl font-bold text-text">${job.total}</div>
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

