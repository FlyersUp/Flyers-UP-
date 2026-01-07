'use client';

/**
 * Service Pro Dashboard - Overview
 * Requires an authenticated pro session.
 */

import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useProBookingsRealtime, useProEarningsRealtime } from '@/hooks';

export default function ProDashboard() {
  const { user } = useCurrentUser();

  const { jobs, loading: jobsLoading } = useProBookingsRealtime(user?.role === 'pro' ? user.id : null);
  const { earnings, loading: earningsLoading } = useProEarningsRealtime(
    user?.role === 'pro' ? user.id : null
  );

  const requestedJobs = jobs.filter((j) => j.status === 'requested');
  const today = new Date().toISOString().split('T')[0];
  const activeJobs = jobs.filter((j) => j.status === 'accepted' && j.date === today);
  const scheduledJobs = jobs.filter((j) => j.status === 'accepted' && j.date > today);

  return (
    <div className="pb-20">
      <section className="bg-gradient-to-r from-amber-500 to-amber-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Pro Dashboard 💪</h1>
              <p className="text-amber-100">
                Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}! Manage your
                jobs and earnings.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-amber-400/30 px-4 py-2 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              <span className="text-sm font-medium">Live updates</span>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 -mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl shadow-lg shadow-amber-100 p-6 border border-amber-50">
            <div className="text-sm text-gray-500 mb-1">Total Earnings</div>
            <div className="text-3xl font-bold text-emerald-600">
              {earningsLoading ? '...' : `$${earnings?.totalEarnings.toLocaleString() || '0'}`}
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg shadow-amber-100 p-6 border border-amber-50">
            <div className="text-sm text-gray-500 mb-1">This Month</div>
            <div className="text-3xl font-bold text-blue-600">
              {earningsLoading ? '...' : `$${earnings?.thisMonth.toLocaleString() || '0'}`}
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg shadow-amber-100 p-6 border border-amber-50">
            <div className="text-sm text-gray-500 mb-1">Jobs Completed</div>
            <div className="text-3xl font-bold text-gray-900">
              {earningsLoading ? '...' : earnings?.completedJobs || '0'}
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg shadow-amber-100 p-6 border border-amber-50">
            <div className="text-sm text-gray-500 mb-1">Pending Payout</div>
            <div className="text-3xl font-bold text-amber-600">
              {earningsLoading ? '...' : `$${earnings?.pendingPayments.toLocaleString() || '0'}`}
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {requestedJobs.length > 0 && (
          <div className="mb-8 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <span className="text-2xl">📬</span>
            <div className="flex-1">
              <p className="font-bold text-amber-800">
                {requestedJobs.length} New Request{requestedJobs.length > 1 ? 's' : ''}
              </p>
              <p className="text-sm text-amber-600">Review and respond to booking requests</p>
            </div>
            <Link
              href="/dashboard/pro/requests"
              className="text-sm text-amber-700 hover:text-amber-800 font-medium"
            >
              View →
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl shadow-lg border border-amber-50 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Today</h3>

            {jobsLoading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : activeJobs.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-xl">
                <span className="text-3xl mb-2 block">☀️</span>
                <p className="text-gray-500">No jobs scheduled for today</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeJobs.slice(0, 3).map((job) => (
                  <div key={job.id} className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl">
                    <span className="text-xl">🔥</span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 capitalize">{job.category}</p>
                      <p className="text-sm text-gray-500">
                        {job.time} • {job.customerName}
                      </p>
                    </div>
                    <Link
                      href="/dashboard/pro/active"
                      className="text-amber-600 hover:text-amber-700 text-sm font-medium"
                    >
                      View →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-amber-50 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Coming Up</h3>

            {jobsLoading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : scheduledJobs.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-xl">
                <span className="text-3xl mb-2 block">📅</span>
                <p className="text-gray-500">No upcoming jobs scheduled</p>
              </div>
            ) : (
              <div className="space-y-3">
                {scheduledJobs.slice(0, 3).map((job) => (
                  <div key={job.id} className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                    <span className="text-xl">📅</span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 capitalize">{job.category}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(job.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        • {job.customerName}
                      </p>
                    </div>
                    <Link
                      href="/dashboard/pro/scheduled"
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      View →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}



