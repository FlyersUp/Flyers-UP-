'use client';

import { useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { mockJobs } from '@/lib/mockData';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getOrCreateProfile, routeAfterAuth } from '@/lib/onboarding';

/**
 * Pro Dashboard - Screen 13
 * KPI cards, today's jobs
 */
export default function ProDashboard() {
  const router = useRouter();

  useEffect(() => {
    const guard = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth?next=%2Fpro');
        return;
      }
      const profile = await getOrCreateProfile(user.id, user.email ?? null);
      if (!profile) return;
      const dest = routeAfterAuth(profile, '/pro');
      if (dest !== '/pro') router.replace(dest);
    };
    void guard();
  }, [router]);

  const todayJobs = mockJobs.filter(j => j.date === '2024-01-15');

  return (
    <AppLayout mode="pro">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            Dashboard
          </h1>
          <Link href="/messages">
            <Button variant="ghost" className="text-sm py-2">
              💬 Messages
            </Button>
          </Link>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">3</div>
                <div className="text-sm text-gray-600">Today&apos;s Jobs</div>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">$450</div>
              <div className="text-sm text-gray-600">Earnings</div>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">4.9</div>
              <div className="text-sm text-gray-600">Rating</div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <div className="grid grid-cols-3 gap-4">
            <Link href="/pro/addons" className="block">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <div className="text-center py-4">
                  <div className="text-2xl mb-2">➕</div>
                  <div className="text-sm font-medium text-gray-700">Add-Ons</div>
                </div>
              </Card>
            </Link>
            <Link href="/pro/credentials">
              <Card>
                <div className="text-center py-4">
                  <div className="text-2xl mb-2">📄</div>
                  <div className="text-sm font-medium text-gray-700">Credentials</div>
                </div>
              </Card>
            </Link>
            <Link href="/pro/verified-badge">
              <Card>
                <div className="text-center py-4">
                  <div className="text-2xl mb-2">✓</div>
                  <div className="text-sm font-medium text-gray-700">Verified Badge</div>
                </div>
              </Card>
            </Link>
          </div>
        </div>

        {/* Today's Jobs */}
        <div className="mb-6">
          <Label className="mb-4 block">TODAY&apos;S JOBS</Label>
          <div className="space-y-4">
            {todayJobs.map((job) => (
              <Link key={job.id} href={`/pro/jobs/${job.id}`}>
                <Card withRail>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">
                        {job.service}
                      </div>
                      <div className="text-sm text-gray-600">
                        {job.customerName} • {job.time}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">${job.total}</div>
                      <div className="text-xs text-gray-500">{job.status}</div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

