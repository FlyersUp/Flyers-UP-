'use client';

import Image from 'next/image';
import Link from 'next/link';

export interface NeighborhoodJob {
  id: string;
  serviceType: string;
  neighborhood: string;
  proName: string;
  proId: string;
  rating: number;
  beforePhotoUrls: string[];
  afterPhotoUrls: string[];
  completedAt: string;
}

export interface NeighborhoodJobsFeedProps {
  jobs: NeighborhoodJob[];
  className?: string;
}

export function NeighborhoodJobsFeed({ jobs, className = '' }: NeighborhoodJobsFeedProps) {
  if (jobs.length === 0) {
    return (
      <div className={`rounded-2xl border border-black/5 bg-white p-8 text-center ${className}`}>
        <p className="text-sm text-[#6A6A6A]">No recent completed jobs in your area yet.</p>
        <p className="text-xs text-[#6A6A6A] mt-1">Check back soon for local social proof!</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <h2 className="text-lg font-semibold text-[#111]">Live Local Jobs</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="rounded-2xl border border-black/5 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="p-4">
              <p className="text-sm font-semibold text-[#111]">
                {job.serviceType} Completed
              </p>
              <p className="text-xs text-[#6A6A6A]">{job.neighborhood}</p>
              <div className="flex gap-2 mt-3">
                {job.beforePhotoUrls[0] && (
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-[#F5F5F5] shrink-0">
                    <Image src={job.beforePhotoUrls[0]} alt="Before" fill className="object-cover" sizes="64px" />
                  </div>
                )}
                <span className="self-center text-[#6A6A6A]">→</span>
                {job.afterPhotoUrls[0] && (
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-[#F5F5F5] shrink-0">
                    <Image src={job.afterPhotoUrls[0]} alt="After" fill className="object-cover" sizes="64px" />
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#111]">{job.proName}</p>
                  <p className="text-xs text-amber-600">{'★'.repeat(Math.round(job.rating))}</p>
                </div>
                <Link
                  href={`/booking/${job.proId}`}
                  className="px-3 py-2 rounded-lg text-sm font-semibold bg-[#B2FBA5] text-black hover:opacity-95"
                >
                  Book this Pro
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
