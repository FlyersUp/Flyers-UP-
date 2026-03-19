'use client';

/**
 * Pro Review Section
 *
 * STRUCTURE
 * 1. Review summary (avg rating, total count, rating distribution)
 * 2. Highlight tags (most common positive traits)
 * 3. Sort options (most recent, highest, lowest)
 * 4. Review list (rating, text, tags, date, verified badge)
 *
 * STATE
 * - loading
 * - loaded (with data)
 * - empty (no reviews)
 */

import { useEffect, useState, useMemo } from 'react';

type SortKey = 'recent' | 'high' | 'low';

interface ReviewItem {
  id: string;
  rating: number;
  text: string;
  tags: string[];
  createdAt: string;
  reviewerFirstName: string;
  jobTitle: string | null;
  verifiedBooking: boolean;
  photoUrls: string[];
}

interface ReviewsData {
  avgRating: number | null;
  reviewCount: number;
  ratingDistribution: Record<number, number>;
  highlightTags: string[];
  reviews: ReviewItem[];
}

function Stars({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' }) {
  const r = Math.max(0, Math.min(5, Math.round(rating)));
  const cls = size === 'sm' ? 'text-sm' : 'text-base';
  return (
    <span className={`inline-flex gap-0.5 ${cls}`} aria-label={`${r} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={i <= r ? 'text-amber-500' : 'text-[#D9D5D2] dark:text-white/20'}
          aria-hidden
        >
          ★
        </span>
      ))}
    </span>
  );
}

export function ProReviewSection({
  proId,
  fallbackAvgRating,
  fallbackReviewCount,
}: {
  proId: string;
  fallbackAvgRating?: number | null;
  fallbackReviewCount?: number | null;
}) {
  const [data, setData] = useState<ReviewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>('recent');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/pro/${encodeURIComponent(proId)}/reviews`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) {
          setData({
            avgRating: json.avgRating ?? fallbackAvgRating ?? null,
            reviewCount: json.reviewCount ?? fallbackReviewCount ?? 0,
            ratingDistribution: json.ratingDistribution ?? { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
            highlightTags: json.highlightTags ?? [],
            reviews: json.reviews ?? [],
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData({
            avgRating: fallbackAvgRating ?? null,
            reviewCount: fallbackReviewCount ?? 0,
            ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
            highlightTags: [],
            reviews: [],
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [proId, fallbackAvgRating, fallbackReviewCount]);

  const sortedReviews = useMemo(() => {
    const list = data?.reviews ?? [];
    const arr = [...list];
    if (sort === 'high') arr.sort((a, b) => b.rating - a.rating);
    else if (sort === 'low') arr.sort((a, b) => a.rating - b.rating);
    else arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return arr;
  }, [data?.reviews, sort]);

  const total = data?.reviewCount ?? 0;
  const dist = data?.ratingDistribution ?? { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-24 rounded-xl bg-[#F5F5F5] dark:bg-[#1D2128]" />
        <div className="h-12 rounded-xl bg-[#F5F5F5] dark:bg-[#1D2128]" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-[#F5F5F5] dark:bg-[#1D2128]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 1. Review summary */}
      <section
        className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-5 shadow-sm"
        aria-labelledby="review-summary-heading"
      >
        <h2 id="review-summary-heading" className="sr-only">
          Review summary
        </h2>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="text-3xl font-bold text-[#111111] dark:text-[#F5F7FA] leading-none">
              {data?.avgRating != null ? data.avgRating.toFixed(1) : '—'}
            </div>
            <div className="mt-2">
              {data?.avgRating != null ? (
                <Stars rating={data.avgRating} />
              ) : (
                <span className="text-sm text-[#6A6A6A] dark:text-[#A1A8B3]">No rating yet</span>
              )}
            </div>
            <p className="mt-1 text-sm text-[#6A6A6A] dark:text-[#A1A8B3]">
              {total} {total === 1 ? 'review' : 'reviews'}
            </p>
          </div>

          {/* Rating distribution */}
          {total > 0 && (
            <div className="min-w-[140px] space-y-1.5">
              {([5, 4, 3, 2, 1] as const).map((star) => {
                const count = dist[star] ?? 0;
                const pct = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-xs text-[#6A6A6A] dark:text-[#A1A8B3] w-4">
                      {star}★
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-[#EBEBEB] dark:bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-[#6A6A6A] dark:text-[#A1A8B3] w-6">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 2. Highlight tags */}
      {data?.highlightTags && data.highlightTags.length > 0 && (
        <section aria-labelledby="highlight-tags-heading">
          <h2 id="highlight-tags-heading" className="text-sm font-medium text-[#6A6A6A] dark:text-[#A1A8B3] mb-2">
            What customers say
          </h2>
          <div className="flex flex-wrap gap-2">
            {data.highlightTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-[#058954]/10 text-[#058954] dark:bg-[#058954]/20"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 3. Sort + 4. Review list */}
      <section aria-labelledby="reviews-list-heading">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 id="reviews-list-heading" className="text-sm font-medium text-[#6A6A6A] dark:text-[#A1A8B3]">
            Reviews
          </h2>
          {total > 0 && (
            <div className="flex gap-1.5">
              {(
                [
                  { key: 'recent' as const, label: 'Most recent' },
                  { key: 'high' as const, label: 'Highest' },
                  { key: 'low' as const, label: 'Lowest' },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSort(key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    sort === key
                      ? 'bg-[#058954] text-white'
                      : 'bg-[#F5F5F5] dark:bg-[#1D2128] text-[#3A3A3A] dark:text-[#A1A8B3] hover:bg-[#EBEBEB] dark:hover:bg-[#252A33]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {sortedReviews.length === 0 ? (
          <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-6 text-center">
            <p className="text-sm font-medium text-[#111111] dark:text-[#F5F7FA]">
              No reviews yet
            </p>
            <p className="text-sm text-[#6A6A6A] dark:text-[#A1A8B3] mt-1">
              Reviews will appear after completed bookings.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedReviews.map((r) => (
              <article
                key={r.id}
                className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[#111111] dark:text-[#F5F7FA]">
                        {r.reviewerFirstName}
                      </span>
                      <span className="text-sm text-[#6A6A6A] dark:text-[#A1A8B3]">
                        {new Date(r.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="mt-1.5">
                      <Stars rating={r.rating} size="sm" />
                    </div>
                  </div>
                  {r.verifiedBooking && (
                    <span
                      className="shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide border border-black/5 dark:border-white/10 bg-[#F7F6F4] dark:bg-[#1D2128] text-[#6A6A6A] dark:text-[#A1A8B3]"
                      title="Verified booking"
                    >
                      Verified
                    </span>
                  )}
                </div>
                {r.text && (
                  <p className="mt-3 text-sm text-[#3A3A3A] dark:text-[#A1A8B3] leading-relaxed">
                    {r.text}
                  </p>
                )}
                {r.tags && r.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {r.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-[#F5F5F5] dark:bg-[#1D2128] text-[#3A3A3A] dark:text-[#A1A8B3]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {r.jobTitle && (
                  <p className="mt-2 text-xs text-[#6A6A6A] dark:text-[#A1A8B3]">
                    {r.jobTitle}
                  </p>
                )}
                {r.photoUrls && r.photoUrls.length > 0 && (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {r.photoUrls.map((url, i) => (
                      <div
                        key={i}
                        className="w-16 h-16 rounded-lg bg-[#F5F5F5] dark:bg-[#1D2128] overflow-hidden"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
