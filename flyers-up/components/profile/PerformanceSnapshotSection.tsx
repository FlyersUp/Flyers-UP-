'use client';

import type { ProPerformanceSnapshot } from '@/lib/profileData';

export function PerformanceSnapshotSection({ snapshot }: { snapshot: ProPerformanceSnapshot }) {
  const rating =
    snapshot.avgRating != null && snapshot.avgRating > 0 ? snapshot.avgRating.toFixed(1) : '—';
  const repeat =
    snapshot.repeatCustomerPct != null ? `${Math.round(snapshot.repeatCustomerPct)}%` : '—';

  const cells = [
    { label: 'Jobs completed', value: String(snapshot.jobsCompleted) },
    { label: 'Average rating', value: rating },
    { label: 'Repeat customers', value: repeat },
    { label: 'Avg. response time', value: snapshot.avgResponseLabel },
  ];

  return (
    <section
      className="rounded-2xl border border-black/8 bg-white p-5 shadow-sm"
      aria-labelledby="performance-snapshot-heading"
    >
      <h2 id="performance-snapshot-heading" className="text-sm font-semibold text-[#111] mb-1">
        Performance snapshot
      </h2>
      <p className="text-xs text-black/55 mb-4">
        Real outcomes from verified work on Flyers Up—no fees or payouts shown here.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {cells.map((c) => (
          <div
            key={c.label}
            className="rounded-xl bg-[#F5F5F5] border border-black/6 px-3 py-3 text-center"
          >
            <p className="text-lg font-semibold text-[#111] tabular-nums">{c.value}</p>
            <p className="text-[11px] text-black/55 mt-1 leading-snug">{c.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
