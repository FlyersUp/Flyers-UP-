'use client';

/**
 * Active Jobs Page
 * Shows jobs currently in progress (today's accepted jobs)
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  updateBookingStatus,
  type Booking,
  type JobStatusAction,
  type UpdateBookingStatusResult,
} from '@/lib/api';
import { useProBookingsRealtime, useProEarningsRealtime } from '@/hooks';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function ActiveJobsPage() {
  const { user } = useCurrentUser();
  const proUserId = user?.role === 'pro' ? user.id : null;

  const { jobs, loading, error } = useProBookingsRealtime(proUserId);
  const { refetch: refetchEarnings } = useProEarningsRealtime(proUserId);

  const handleUpdateStatus = async (
    bookingId: string,
    newStatus: JobStatusAction
  ): Promise<UpdateBookingStatusResult> => {
    if (!proUserId) return { success: false, error: 'User not authenticated' };
    const result = await updateBookingStatus({ bookingId, newStatus, proUserId });
    if (result.success && newStatus === 'completed') {
      await refetchEarnings();
    }
    return result;
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const activeJobs = jobs.filter((j) => j.status === 'accepted' && j.date === todayStr);

  return (
    <>
      <section className="bg-gradient-to-r from-red-500 to-red-600 text-white py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🔥</span>
            <div>
              <h1 className="text-2xl font-bold">Active Jobs</h1>
              <p className="text-red-100">Jobs in progress today</p>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <span className="text-lg font-bold text-gray-900">
            {loading ? '...' : activeJobs.length} Active Job{activeJobs.length !== 1 ? 's' : ''}{' '}
            Today
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
            <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading active jobs...</p>
          </div>
        ) : activeJobs.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-red-50 p-12 text-center">
            <div className="text-6xl mb-4">☀️</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No Active Jobs Today</h2>
            <p className="text-gray-500 mb-6">
              Enjoy your day off! Check your scheduled jobs for upcoming work.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/dashboard/pro/scheduled"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
              >
                📅 View Scheduled
              </Link>
              <Link
                href="/dashboard/pro/requests"
                className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl transition-colors"
              >
                📬 Check Requests
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {activeJobs.map((job) => (
              <ActiveJobCard key={job.id} job={job} onUpdateStatus={handleUpdateStatus} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function ActiveJobCard({
  job,
  onUpdateStatus,
}: {
  job: Booking;
  onUpdateStatus: (bookingId: string, status: JobStatusAction) => Promise<UpdateBookingStatusResult>;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const handleAction = async (newStatus: JobStatusAction) => {
    setIsUpdating(true);
    setUpdateError(null);
    const result = await onUpdateStatus(job.id, newStatus);
    if (!result.success) setUpdateError(result.error || 'Failed to update. Try again.');
    setIsUpdating(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-red-100 p-6 transition-all hover:shadow-xl">
      {updateError && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex items-center justify-between">
          <span>{updateError}</span>
          <button onClick={() => setUpdateError(null)} className="text-red-500 hover:text-red-700">
            ✕
          </button>
        </div>
      )}

      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
              In Progress
            </span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 capitalize">{job.category} Service</h3>
        </div>
        {job.price && (
          <div className="text-right">
            <div className="text-sm text-gray-500">Earnings</div>
            <div className="text-2xl font-bold text-emerald-600">${job.price}</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-gray-600">
            <span>👤</span>
            <span className="font-medium">{job.customerName}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <span>🕐</span>
            <span className="font-medium text-red-600">{job.time}</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-gray-600">
            <span>📍</span>
            <span>{job.address}</span>
          </div>
          {job.notes && (
            <div className="flex items-start gap-2 text-gray-500">
              <span>📝</span>
              <span className="italic">&quot;{job.notes}&quot;</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
        <button
          onClick={() => handleAction('completed')}
          disabled={isUpdating}
          className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-xl transition-colors shadow-lg shadow-blue-200"
        >
          {isUpdating ? 'Processing...' : '✓ Mark Complete'}
        </button>
        <button
          onClick={() => handleAction('cancelled')}
          disabled={isUpdating}
          className="px-6 py-3 bg-red-50 hover:bg-red-100 disabled:bg-red-25 text-red-700 font-medium rounded-xl border border-red-200 transition-colors"
        >
          {isUpdating ? '...' : 'Cancel Job'}
        </button>
      </div>
    </div>
  );
}






