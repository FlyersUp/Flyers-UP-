'use client';

/**
 * Job Details Page
 * Shows job information, status, map, and actions
 */

import { use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { StatusBadge } from '@/components/ui/Badge';
import { RatingCompact } from '@/components/ui/RatingStars';
import TrustShieldBanner from '@/components/ui/TrustShieldBanner';
import MapPlaceholder from '@/components/MapPlaceholder';
import { getJobById, getConversationId, type Job } from '@/lib/mockData';

interface PageProps {
  params: Promise<{ jobId: string }>;
}

export default function JobDetailsPage({ params }: PageProps) {
  const { jobId } = use(params);
  const job = getJobById(jobId);

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">📋</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Job Not Found</h1>
          <p className="text-gray-500 mb-6">This job may have been removed or doesn&apos;t exist.</p>
          <Link
            href="/"
            className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Format date
  const formattedDate = new Date(job.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Copy address to clipboard
  const copyAddress = async () => {
    await navigator.clipboard.writeText(job.address);
    // In a real app, show a toast notification
    alert('Address copied to clipboard');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
              <span>←</span>
              <span className="font-medium">Back</span>
            </Link>
            <h1 className="font-semibold text-gray-900">Job Details</h1>
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <span className="text-xl">⋮</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Status banner */}
        <section className="mb-6">
          <JobStatusBanner status={job.status} />
        </section>

        {/* Map section */}
        <section className="mb-6">
          <MapPlaceholder address={job.address} />
        </section>

        {/* Job info */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">{job.serviceType}</h2>
            <StatusBadge status={job.status} />
          </div>

          {/* Details */}
          <div className="space-y-4">
            {/* Address */}
            <div className="flex items-start gap-3">
              <span className="text-xl mt-0.5">📍</span>
              <div className="flex-1">
                <p className="text-sm text-gray-500">Address</p>
                <p className="text-gray-900">{job.address}</p>
              </div>
              <button 
                onClick={copyAddress}
                className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                title="Copy address"
              >
                📋
              </button>
            </div>

            {/* Date & Time */}
            <div className="flex items-start gap-3">
              <span className="text-xl mt-0.5">📅</span>
              <div>
                <p className="text-sm text-gray-500">Date & Time</p>
                <p className="text-gray-900">{formattedDate}</p>
                <p className="text-gray-700 font-medium">{job.time}</p>
              </div>
            </div>

            {/* Category */}
            <div className="flex items-start gap-3">
              <span className="text-xl mt-0.5">🏷️</span>
              <div>
                <p className="text-sm text-gray-500">Category</p>
                <p className="text-gray-900">{job.category}</p>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-start gap-3">
              <span className="text-xl mt-0.5">💵</span>
              <div>
                <p className="text-sm text-gray-500">Price</p>
                <p className="text-2xl font-bold text-gray-900">${job.price}</p>
              </div>
            </div>

            {/* Notes */}
            {job.notes && (
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">📝</span>
                <div>
                  <p className="text-sm text-gray-500">Notes</p>
                  <p className="text-gray-700">{job.notes}</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Pro info */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Your Pro</h3>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
              {job.pro.avatar ? (
                <Image
                  src={job.pro.avatar}
                  alt={job.pro.name}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <span className="text-2xl">👤</span>
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">{job.pro.name}</h4>
              <RatingCompact rating={job.pro.rating} />
            </div>
            <Link
              href={`/pro/${job.pro.id}`}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
            >
              View Profile
            </Link>
          </div>

          {/* Contact buttons */}
          <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
            <a
              href={`tel:${job.pro.phone}`}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium transition-colors"
            >
              <span>📞</span>
              Call Pro
            </a>
            <Link
              href={`/messages/${getConversationId('customer-1', job.pro.id, jobId)}`}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
            >
              <span>💬</span>
              Message
            </Link>
          </div>
        </section>

        {/* Trust shield */}
        <TrustShieldBanner variant="compact" className="mb-6" />

        {/* Status timeline */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Status Timeline</h3>
          <StatusTimeline currentStatus={job.status} />
        </section>

        {/* Action buttons */}
        <section className="space-y-3 mb-6">
          {job.status === 'scheduled' && (
            <>
              <button className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold transition-colors">
                Update Status
              </button>
              <button className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">
                Reschedule
              </button>
              <button className="w-full py-4 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-colors">
                Cancel Job
              </button>
            </>
          )}
          
          {job.status === 'on_my_way' && (
            <div className="text-center py-4">
              <p className="text-gray-500">Your pro is on the way!</p>
              <p className="text-sm text-gray-400 mt-1">You can contact them if needed.</p>
            </div>
          )}

          {job.status === 'completed' && (
            <>
              <button className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold transition-colors">
                Leave a Review
              </button>
              <Link 
                href={`/booking/${job.pro.id}`}
                className="block w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium text-center transition-colors"
              >
                Book Again
              </Link>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

// Job status banner component
function JobStatusBanner({ status }: { status: Job['status'] }) {
  const config: Record<Job['status'], { bg: string; text: string; icon: string; message: string }> = {
    scheduled: {
      bg: 'bg-blue-50 border-blue-100',
      text: 'text-blue-700',
      icon: '📅',
      message: 'Your job is scheduled. We\'ll notify you when your pro is on the way.',
    },
    on_my_way: {
      bg: 'bg-orange-50 border-orange-100',
      text: 'text-orange-700',
      icon: '🚗',
      message: 'Your pro is on the way! ETA approximately 15 minutes.',
    },
    in_progress: {
      bg: 'bg-purple-50 border-purple-100',
      text: 'text-purple-700',
      icon: '⚡',
      message: 'Your job is in progress. Your pro is working on it now.',
    },
    completed: {
      bg: 'bg-emerald-50 border-emerald-100',
      text: 'text-emerald-700',
      icon: '✓',
      message: 'Job completed! Don\'t forget to leave a review.',
    },
    cancelled: {
      bg: 'bg-gray-50 border-gray-200',
      text: 'text-gray-600',
      icon: '✕',
      message: 'This job has been cancelled.',
    },
  };

  const { bg, text, icon, message } = config[status];

  return (
    <div className={`p-4 rounded-xl border ${bg}`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <p className={`${text} font-medium`}>{message}</p>
      </div>
    </div>
  );
}

// Status timeline component
function StatusTimeline({ currentStatus }: { currentStatus: Job['status'] }) {
  const statuses: { key: Job['status']; label: string; icon: string }[] = [
    { key: 'scheduled', label: 'Scheduled', icon: '📅' },
    { key: 'on_my_way', label: 'On The Way', icon: '🚗' },
    { key: 'in_progress', label: 'In Progress', icon: '⚡' },
    { key: 'completed', label: 'Completed', icon: '✓' },
  ];

  const statusOrder = ['scheduled', 'on_my_way', 'in_progress', 'completed'];
  const currentIndex = statusOrder.indexOf(currentStatus);

  if (currentStatus === 'cancelled') {
    return (
      <div className="text-center text-gray-500 py-4">
        This job was cancelled.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {statuses.map((status, index) => {
        const isCompleted = index <= currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div key={status.key} className="flex items-center gap-4">
            {/* Status indicator */}
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
              ${isCompleted 
                ? 'bg-teal-600 text-white' 
                : 'bg-gray-100 text-gray-400'
              }
              ${isCurrent ? 'ring-4 ring-teal-100' : ''}
            `}>
              <span>{status.icon}</span>
            </div>

            {/* Label */}
            <div className="flex-1">
              <p className={`font-medium ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                {status.label}
              </p>
              {isCurrent && (
                <p className="text-sm text-teal-600">Current status</p>
              )}
            </div>

            {/* Checkmark for completed */}
            {isCompleted && !isCurrent && (
              <span className="text-teal-600">✓</span>
            )}
          </div>
        );
      })}
    </div>
  );
}




