'use client';

/**
 * Completed Jobs Page
 * Shows history of successfully completed jobs
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { type Booking } from '@/lib/api';
import { useProBookingsRealtime, useProEarningsRealtime } from '@/hooks';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function CompletedJobsPage() {
  const { user } = useCurrentUser();
  const proUserId = user?.role === 'pro' ? user.id : null;

  const { jobs, loading, error } = useProBookingsRealtime(proUserId);
  const { earnings, loading: earningsLoading } = useProEarningsRealtime(proUserId);

  const completedJobs = useMemo(() => {
    return jobs
      .filter((j) => j.status === 'completed')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [jobs]);

  const totalEarnings = completedJobs.reduce((sum, job) => sum + (job.price || 0), 0);

  return (
    <>
      <section className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">✅</span>
              <div>
                <h1 className="text-2xl font-bold">Completed Jobs</h1>
                <p className="text-emerald-100">Your success history</p>
              </div>
            </div>
            <div className="hidden sm:block text-right">
              <div className="text-sm text-emerald-100">Total Earned</div>
              <div className="text-3xl font-bold">
                {earningsLoading ? '...' : `$${earnings?.totalEarnings.toLocaleString() || totalEarnings.toLocaleString()}`}
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <span className="text-lg font-bold text-gray-900">
            {loading ? '...' : completedJobs.length} Completed Job{completedJobs.length !== 1 ? 's' : ''}
          </span>
          <Link href="/dashboard/pro" className="text-sm text-gray-600 hover:text-gray-900">
            ← Back to Overview
          </Link>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading completed jobs...</p>
          </div>
        ) : completedJobs.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-emerald-50 p-12 text-center">
            <div className="text-6xl mb-4">🚀</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No Completed Jobs Yet</h2>
            <p className="text-gray-500 mb-6">Complete your first job to start building your track record!</p>
            <Link
              href="/dashboard/pro/requests"
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl transition-colors"
            >
              📬 View Requests
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {completedJobs.map((job) => (
              <CompletedJobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function CompletedJobCard({ job }: { job: Booking }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-emerald-100 p-6 transition-all hover:shadow-xl">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
              ✓ Completed
            </span>
            <span className="text-xs text-gray-400">
              {new Date(job.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 capitalize">{job.category} Service</h3>
        </div>
        {job.price && (
          <div className="text-right">
            <div className="text-sm text-gray-500">Earned</div>
            <div className="text-2xl font-bold text-emerald-600">${job.price}</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-gray-600">
            <span>👤</span>
            <span className="font-medium">{job.customerName}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <span>🕐</span>
            <span>{job.time}</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-gray-600">
            <span>📍</span>
            <span>{job.address}</span>
          </div>
        </div>
      </div>
    </div>
  );
}





