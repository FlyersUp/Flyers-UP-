'use client';

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { AtAGlanceCard, sumTodayEarnings } from '@/components/ui/AtAGlanceCard';
import { TrustStandingCard, computeTrustStanding, countActionNeeded } from '@/components/ui/TrustStandingCard';
import { EarningsBreakdownCard } from '@/components/ui/EarningsBreakdownCard';
import { AppIcon } from '@/components/ui/AppIcon';
import { mockJobs } from '@/lib/mockData';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getOrCreateProfile, routeAfterAuth } from '@/lib/onboarding';
import { SideMenu } from '@/components/ui/SideMenu';

/**
 * Pro Dashboard - Screen 13
 * KPI cards, today's jobs
 */
export default function ProDashboard() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userName, setUserName] = useState('Account');

  useEffect(() => {
    const guard = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth?next=%2Fpro');
        return;
      }
      const profile = await getOrCreateProfile(user.id, user.email ?? null);
      if (!profile) return;
      const fallbackName = (user.email ? user.email.split('@')[0] : 'Account') || 'Account';
      setUserName(profile.first_name?.trim() || fallbackName);
      const dest = routeAfterAuth(profile, '/pro');
      if (dest !== '/pro') {
        router.replace(dest);
        return;
      }

      // Require "customer-visible" pro info before showing the main Pro dashboard.
      // This ensures pros complete the minimal pro profile (category + service area) first.
      const { data: proRow, error } = await supabase
        .from('service_pros')
        .select('user_id, display_name, category_id, service_area_zip')
        .eq('user_id', user.id)
        .maybeSingle();

      const missingProInfo =
        Boolean(error) ||
        !proRow ||
        !proRow.display_name ||
        !proRow.category_id ||
        !proRow.service_area_zip;

      if (missingProInfo) {
        router.replace('/onboarding/pro?next=%2Fpro');
        return;
      }
    };
    void guard();
  }, [router]);

  const todayJobs = mockJobs.filter(j => j.date === '2024-01-15');
  const todayGross = sumTodayEarnings(todayJobs);
  const trust = computeTrustStanding(null);
  const actionNeededCount = countActionNeeded(trust);
  const ratingValue = 4.9; // TODO: wire to real rating source when available.

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

        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-text mb-1">3</div>
                <div className="text-sm text-muted">Today&apos;s Jobs</div>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-text mb-1">$450</div>
              <div className="text-sm text-muted">Earnings</div>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-text mb-1">4.9</div>
              <div className="text-sm text-muted">Rating</div>
            </div>
          </Card>
        </div>

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

        {/* New modules (do not change existing layout above/below) */}
        <div className="mb-6 space-y-4">
          <AtAGlanceCard jobs={todayJobs} rating={ratingValue} actionNeededCount={actionNeededCount} />
          <TrustStandingCard standing={trust} />
          <EarningsBreakdownCard
            breakdown={{
              grossToday: todayGross,
              platformFee: null, // TODO: derive from payments/payouts when available.
              holdback: null, // TODO: if holdback is introduced later, wire it here.
              netPayout: null, // TODO: compute from gross - fee - holdback.
              payoutDate: null, // TODO: wire to payout schedule.
            }}
            payoutsHref="/pro/settings/payments-payouts"
          />
        </div>

        {/* Today's Jobs */}
        <div className="mb-6">
          <Label className="mb-4 block">TODAY&apos;S JOBS</Label>
          <div className="flex flex-col gap-[14px] overflow-visible">
            {todayJobs.map((job) => (
              <Link key={job.id} href={`/pro/jobs/${job.id}`} className="block">
                <Card className="border-l-[3px] border-l-accent">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-semibold text-text mb-1 truncate">
                        {job.service}
                      </div>
                      <div className="text-sm text-muted">
                        {job.customerName} • {job.time}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-text">${job.total}</div>
                      <div className="mt-1 flex justify-end">
                        <StatusBadge status={job.status} />
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} mode="pro" userName={userName} />
    </AppLayout>
  );
}

