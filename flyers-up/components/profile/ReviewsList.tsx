'use client';

import { useMemo, useState } from 'react';
import type { ProReview } from '@/lib/profileData';

type FilterKey = 'recent' | 'high' | 'low';

function Stars({ rating }: { rating: number }) {
  const r = Math.max(0, Math.min(5, rating));
  const full = Math.floor(r);
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${r} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < full ? 'text-warning' : 'text-muted/30'} aria-hidden>
          ★
        </span>
      ))}
    </span>
  );
}

function Pill({
  on,
  label,
  onClick,
}: {
  on: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-full px-3 py-1.5 text-xs font-semibold border bg-white transition-shadow',
        on ? 'border-accent/60 shadow-sm' : 'border-hairline hover:shadow-sm',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

export function ReviewsList({
  avgRating,
  reviewCount,
  reviews,
}: {
  avgRating: number | null;
  reviewCount: number | null;
  reviews: ProReview[];
}) {
  const [filter, setFilter] = useState<FilterKey>('recent');

  const sorted = useMemo(() => {
    const arr = reviews.slice();
    if (filter === 'high') arr.sort((a, b) => b.rating - a.rating);
    else if (filter === 'low') arr.sort((a, b) => a.rating - b.rating);
    else arr.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return arr;
  }, [reviews, filter]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-hairline bg-white shadow-sm p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-3xl font-bold leading-none">{avgRating != null ? avgRating.toFixed(1) : '—'}</div>
            <div className="mt-1">
              {avgRating != null ? <Stars rating={avgRating} /> : <span className="text-sm text-muted">No rating yet</span>}
            </div>
            <div className="mt-1 text-sm text-muted">{reviewCount != null ? `${reviewCount} reviews` : '—'}</div>
          </div>
          <div className="flex gap-2">
            <Pill on={filter === 'recent'} label="Most recent" onClick={() => setFilter('recent')} />
            <Pill on={filter === 'high'} label="Highest" onClick={() => setFilter('high')} />
            <Pill on={filter === 'low'} label="Lowest" onClick={() => setFilter('low')} />
          </div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-hairline bg-white shadow-sm p-5">
          <div className="text-sm font-semibold">No reviews yet</div>
          <div className="mt-1 text-sm text-muted">Reviews will appear after completed bookings.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((r, idx) => (
            <div key={`${r.createdAt}-${idx}`} className="rounded-2xl border border-hairline bg-white shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">
                    {r.reviewerFirstName} •{' '}
                    <span className="text-muted font-medium">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mt-1">
                    <Stars rating={r.rating} />
                  </div>
                </div>
                {r.verifiedBooking ? (
                  <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide border border-hairline bg-white shadow-[0_1px_0_rgba(0,0,0,0.04)]">
                    Verified booking
                  </span>
                ) : null}
              </div>
              <div className="mt-3 text-sm text-text/90 line-clamp-4">{r.text}</div>
              {r.jobTitle ? <div className="mt-2 text-xs text-muted">Job: {r.jobTitle}</div> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

