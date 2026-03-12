'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { NeighborhoodJobsFeed } from '@/components/marketplace/NeighborhoodJobsFeed';
import { useEffect, useState } from 'react';

type NeighborhoodJob = {
  id: string;
  serviceType: string;
  neighborhood: string;
  proName: string;
  proId: string;
  rating: number;
  beforePhotoUrls: string[];
  afterPhotoUrls: string[];
  completedAt: string;
};

export default function DiscoverJobsPage() {
  const [jobs, setJobs] = useState<NeighborhoodJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/discover/jobs', { cache: 'no-store' });
        const json = await res.json();
        if (res.ok && Array.isArray(json.jobs)) {
          setJobs(json.jobs);
        }
      } catch {
        setJobs([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold text-[#111] mb-2">Live Local Jobs</h1>
        <p className="text-sm text-black/60 mb-6">
          Recently completed jobs in your area. Book trusted local pros.
        </p>

        {loading ? (
          <div className="rounded-2xl border border-black/5 bg-white p-8 text-center">
            <p className="text-sm text-[#6A6A6A]">Loading…</p>
          </div>
        ) : (
          <NeighborhoodJobsFeed jobs={jobs} />
        )}
      </div>
    </AppLayout>
  );
}
