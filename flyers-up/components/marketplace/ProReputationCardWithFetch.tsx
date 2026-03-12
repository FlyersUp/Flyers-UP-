'use client';

import { useEffect, useState } from 'react';
import { ProReputationCard } from './ProReputationCard';

export interface ProReputationCardWithFetchProps {
  proId: string;
  fallbackRating?: number;
  fallbackJobsCompleted?: number;
  className?: string;
}

export function ProReputationCardWithFetch({
  proId,
  fallbackRating = 0,
  fallbackJobsCompleted = 0,
  className = '',
}: ProReputationCardWithFetchProps) {
  const [data, setData] = useState<{
    averageRating: number;
    jobsCompleted: number;
    onTimeRate: number;
    scopeAccuracyRate: number;
    repeatCustomerRate: number;
    completionRate?: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/pro/${encodeURIComponent(proId)}/reputation`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json) {
          setData({
            averageRating: Number(json.averageRating ?? fallbackRating),
            jobsCompleted: Number(json.jobsCompleted ?? fallbackJobsCompleted),
            onTimeRate: Number(json.onTimeRate ?? 95),
            scopeAccuracyRate: Number(json.scopeAccuracyRate ?? 96),
            repeatCustomerRate: Number(json.repeatCustomerRate ?? 40),
            completionRate: json.completionRate != null ? Number(json.completionRate) : undefined,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData({
            averageRating: fallbackRating,
            jobsCompleted: fallbackJobsCompleted,
            onTimeRate: 95,
            scopeAccuracyRate: 96,
            repeatCustomerRate: 40,
          });
        }
      });
    return () => { cancelled = true; };
  }, [proId, fallbackRating, fallbackJobsCompleted]);

  if (!data) return null;

  return (
    <ProReputationCard
      averageRating={data.averageRating}
      jobsCompleted={data.jobsCompleted}
      onTimeRate={data.onTimeRate}
      scopeAccuracyRate={data.scopeAccuracyRate}
      repeatCustomerRate={data.repeatCustomerRate}
      completionRate={data.completionRate}
      className={className}
    />
  );
}
