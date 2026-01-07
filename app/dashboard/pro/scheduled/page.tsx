'use client';

/**
 * Scheduled Jobs Page
 * Shows upcoming accepted jobs scheduled for future dates
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  updateBookingStatus,
  type Booking,
  type JobStatusAction,
  type UpdateBookingStatusResult,
} from '@/lib/api';
import { useProBookingsRealtime } from '@/hooks';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function ScheduledJobsPage() {
  const { user } = useCurrentUser();
  const proUserId = user?.role === 'pro' ? user.id : null;

  const { jobs, loading, error } = useProBookingsRealtime(proUserId);

  const todayStr = new Date().toISOString().split('T')[0];
  const scheduledJobs = useMemo(() => {
    return jobs
      .filter((j) => j.status === 'accepted' && j.date > todayStr)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [jobs, todayStr]);

  const handleUpdateStatus = async (
    bookingId: string,
    newStatus: JobStatusAction
  ): Promise<UpdateBookingStatusResult> => {
    if (!proUserId) return { success: false, error: 'User not authenticated' };
    return await updateBookingStatus({ bookingId, newStatus, proUserId });
  };

  return (
    <>
      <section className="bg-gradient-to-r from-blue-500 to-blue-600 text-white py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">📅</span>
            <div>
              <h1 className="text-2xl font-bold">Scheduled Jobs</h1>
              <p className="text-blue-100">Upcoming confirmed bookings</p>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <span className="text-lg font-bold text-gray-900">
            {loading ? '...' : scheduledJobs.length} Upcoming Job
            {scheduledJobs.length !== 1 ? 's' : ''}
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
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading scheduled jobs...</p>
          </div>
        ) : scheduledJobs.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-blue-50 p-12 text-center">
            <div className="text-6xl mb-4">📅</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No Upcoming Jobs</h2>
            <p className="text-gray-500 mb-6">Check your requests to accept your next job.</p>
            <Link
              href="/dashboard/pro/requests"
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl transition-colors"
            >
              📬 View Requests
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {scheduledJobs.map((job) => (
              <ScheduledJobCard key={job.id} job={job} onUpdateStatus={handleUpdateStatus} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function ScheduledJobCard({
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
    <div className="bg-white rounded-2xl shadow-lg border border-blue-100 p-6 transition-all hover:shadow-xl">
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
          <h3 className="text-xl font-bold text-gray-900 capitalize">{job.category} Service</h3>
          <div className="text-sm text-gray-500 mt-1">
            {new Date(job.date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}{' '}
            • {job.time}
          </div>
        </div>
        {job.price && <div className="text-2xl font-bold text-emerald-600">${job.price}</div>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-gray-600">
            <span>👤</span>
            <span className="font-medium">{job.customerName}</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-gray-600">
            <span>📍</span>
            <span>{job.address}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
        <button
          onClick={() => handleAction('cancelled')}
          disabled={isUpdating}
          className="px-6 py-3 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-700 font-medium rounded-xl border border-gray-200 transition-colors"
        >
          {isUpdating ? 'Processing...' : 'Cancel Job'}
        </button>
      </div>
    </div>
  );
}



