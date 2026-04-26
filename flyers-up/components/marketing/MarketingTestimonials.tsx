'use client';

import { useEffect, useState } from 'react';
import { MarketingSection } from '@/components/marketing/ui/Section';

type ReviewCard = {
  id: string;
  customerName: string;
  neighborhood: string;
  serviceCategory: string;
  rating: number;
  quote: string;
};

export function MarketingTestimonials() {
  const [reviews, setReviews] = useState<ReviewCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/public/reviews', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setReviews((data.reviews ?? []) as ReviewCard[]);
      })
      .catch(() => {
        if (!cancelled) setReviews([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <MarketingSection className="bg-market-linen">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight text-market-slate sm:text-4xl">
          Real customer reviews
        </h2>
      </div>
      {loading ? (
        <div className="mt-10 rounded-2xl border border-market-line/90 bg-white p-6 text-center text-sm text-market-charcoal shadow-[0_4px_20px_rgba(45,52,54,0.07)]">
          Loading reviews...
        </div>
      ) : reviews.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-market-line/90 bg-white p-6 text-center text-sm text-market-charcoal shadow-[0_4px_20px_rgba(45,52,54,0.07)]">
          Real customer reviews will appear here after completed Flyers Up jobs.
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          {reviews.map((review) => (
            <figure
              key={review.id}
              className="rounded-2xl border border-market-line/90 bg-white p-6 text-center shadow-[0_4px_20px_rgba(45,52,54,0.07)] md:text-left"
            >
              <figcaption className="text-xs font-semibold uppercase tracking-wide text-market-slate">
                {review.customerName} · {review.neighborhood}
              </figcaption>
              <p className="mt-1 text-xs text-market-charcoal">{review.serviceCategory}</p>
              <p className="mt-2 text-sm font-semibold text-market-slate">⭐ {review.rating.toFixed(1)}</p>
              <blockquote className="mt-3 text-sm leading-relaxed text-market-charcoal">
                <p className="font-medium">&ldquo;{review.quote}&rdquo;</p>
              </blockquote>
            </figure>
          ))}
        </div>
      )}
    </MarketingSection>
  );
}
