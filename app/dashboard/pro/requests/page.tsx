'use client';

/**
 * Job Requests Page
 * Shows pending booking requests that need pro's response
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  updateBookingStatus,
  type Booking,
  type JobStatusAction,
  type UpdateBookingStatusResult,
} from '@/lib/api';
import { useProBookingsRealtime } from '@/hooks';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function JobRequestsPage() {
  const { user } = useCurrentUser();
  const { jobs, loading, error } = useProBookingsRealtime(user?.role === 'pro' ? user.id : null);

  const handleUpdateStatus = async (
    bookingId: string,
    newStatus: JobStatusAction
  ): Promise<UpdateBookingStatusResult> => {
    if (!user?.id || user.role !== 'pro') {
      return { success: false, error: 'User not authenticated' };
    }
    return await updateBookingStatus({ bookingId, newStatus, proUserId: user.id });
  };

  const requestedJobs = jobs.filter((j) => j.status === 'requested');

  return (
    <>
      <section className="bg-gradient-to-r from-amber-500 to-amber-600 text-white py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">📬</span>
            <div>
              <h1 className="text-2xl font-bold">Job Requests</h1>
              <p className="text-amber-100">New bookings awaiting your response</p>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <span className="text-lg font-bold text-gray-900">
              {loading ? '...' : requestedJobs.length} Pending Request
              {requestedJobs.length !== 1 ? 's' : ''}
            </span>
            {requestedJobs.length > 0 && (
              <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm font-medium rounded-full animate-pulse">
                Action Required
              </span>
            )}
          </div>
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
            <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading requests...</p>
          </div>
        ) : requestedJobs.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-amber-50 p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No Pending Requests</h2>
            <p className="text-gray-500 mb-6">
              You&apos;re all caught up! New booking requests will appear here.
            </p>
            <Link
              href="/dashboard/pro"
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {requestedJobs.map((job) => (
              <JobRequestCard key={job.id} job={job} onUpdateStatus={handleUpdateStatus} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function JobRequestCard({
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
    <div className="bg-white rounded-2xl shadow-lg border border-amber-200 p-6 transition-all hover:shadow-xl">
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
            <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
              New Request
            </span>
            <span className="text-xs text-gray-400">
              {new Date(job.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 capitalize">{job.category} Service</h3>
        </div>
        {job.price && (
          <div className="text-right">
            <div className="text-sm text-gray-500">Estimated</div>
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
            <span>📅</span>
            <span>
              {new Date(job.date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </span>
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
          onClick={() => handleAction('accepted')}
          disabled={isUpdating}
          className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium rounded-xl transition-colors shadow-lg shadow-emerald-200"
        >
          {isUpdating ? 'Processing...' : '✓ Accept Job'}
        </button>
        <button
          onClick={() => handleAction('declined')}
          disabled={isUpdating}
          className="px-6 py-3 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-700 font-medium rounded-xl border border-gray-200 transition-colors"
        >
          {isUpdating ? '...' : 'Decline'}
        </button>
      </div>
    </div>
  );
}



