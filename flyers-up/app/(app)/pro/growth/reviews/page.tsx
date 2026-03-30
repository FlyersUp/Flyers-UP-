'use client';

import Link from 'next/link';
import { GrowthPageShell, growthActionLinkClass } from '@/components/pro/GrowthPageShell';
import { Card } from '@/components/ui/Card';
import { useProGrowthMenu } from '@/hooks/useProGrowthMenu';

export default function ProGrowthReviewsPage() {
  const { data, error, loading } = useProGrowthMenu();
  const reviews = data?.items.find((i) => i.id === 'reviews');
  const count = reviews?.meta?.reviewCount ?? 0;
  const avg = reviews?.meta?.avgRating;

  return (
    <GrowthPageShell title="Reviews & ratings">
      {loading && (
        <Card className="animate-pulse">
          <div className="h-28 bg-surface2 rounded-xl" />
        </Card>
      )}
      {error && (
        <Card>
          <p className="text-text2 text-sm">Couldn&apos;t load review summary.</p>
        </Card>
      )}
      {data && count === 0 && (
        <Card padding="lg" className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-text">No reviews yet</h2>
            <p className="mt-2 text-sm text-text2 leading-relaxed">
              Reviews appear after customers complete bookings and rate their experience. Focus on clear communication,
              showing up on time, and finishing the scope you agreed to — satisfied customers are the fastest path to
              your first ratings.
            </p>
          </div>
          <ul className="text-sm text-text2 space-y-2 list-disc list-inside">
            <li>Confirm job details in chat before you start.</li>
            <li>Mark work complete promptly so the customer can review.</li>
            <li>Follow up politely if a job went well and they haven&apos;t left feedback yet.</li>
          </ul>
          <Link href="/pro/bookings" className={`${growthActionLinkClass} w-full sm:w-auto`}>
            Open bookings
          </Link>
        </Card>
      )}
      {data && count > 0 && (
        <Card padding="lg" className="space-y-4">
          <div>
            <p className="text-sm text-text2">Your public average</p>
            <p className="text-3xl font-bold text-text mt-1 tabular-nums">
              {avg != null ? avg.toFixed(1) : '—'}
              <span className="text-lg font-normal text-text2 ml-2">· {count} review{count === 1 ? '' : 's'}</span>
            </p>
            <p className="mt-3 text-sm text-text2 leading-relaxed">
              Keep delivering consistent quality — your profile highlights this score to new customers.
            </p>
          </div>
          <Link href="/pro/profile" className={`${growthActionLinkClass} w-full sm:w-auto`}>
            View profile
          </Link>
        </Card>
      )}
    </GrowthPageShell>
  );
}
