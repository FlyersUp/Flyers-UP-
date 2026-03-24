'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layouts/AppLayout';

type ReviewItem = {
  id: string;
  booking_id: string;
  reason: string;
  details: Record<string, unknown>;
  status: string;
  created_at: string;
  booking?: {
    id: string;
    status: string;
    service_date: string;
    service_time: string;
    suspicious_completion?: boolean;
    suspicious_completion_reason?: string | null;
    minimum_expected_duration_minutes?: number | null;
  };
  proName: string;
  customerName: string;
  categoryName: string;
  reliabilityScore: number | null;
  evidenceCounts: { before: number; after: number };
};

export default function AdminPayoutReviewPage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const refetch = useCallback(() => {
    fetch('/api/admin/payout-review', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error);
        else setItems(json.items ?? []);
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  async function handleAction(id: string, action: string, notes?: string) {
    setActing(id);
    try {
      const res = await fetch(`/api/admin/payout-review/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes }),
      });
      const json = await res.json();
      if (json.error) setError(json.error);
      else refetch();
    } catch {
      setError('Failed to process');
    } finally {
      setActing(null);
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-muted">Loading…</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <Link href="/admin" className="text-sm text-muted hover:text-text">
            ← Admin
          </Link>
          <h1 className="text-2xl font-semibold mt-2">Payout Review Queue</h1>
          <p className="text-sm text-muted mt-1">
            Bookings flagged for manual review before payout release.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 p-3 text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {items.length === 0 ? (
          <div className="rounded-xl border border-black/5 bg-white p-8 text-center text-muted">
            No pending reviews.
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-black/5 bg-white p-5 shadow-sm space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <Link
                      href={`/admin/disputes/${item.booking_id}`}
                      className="font-mono text-sm text-accent hover:underline"
                    >
                      {item.booking_id}
                    </Link>
                    <div className="text-xs text-muted mt-0.5">
                      {item.booking?.service_date} {item.booking?.service_time} · {item.categoryName}
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      item.reason === 'suspicious_completion'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                        : item.reason === 'missing_evidence'
                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                    }`}
                  >
                    {item.reason.replace(/_/g, ' ')}
                  </span>
                </div>

                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                  <dt className="text-muted">Pro</dt>
                  <dd>{item.proName}</dd>
                  <dt className="text-muted">Customer</dt>
                  <dd>{item.customerName}</dd>
                  <dt className="text-muted">Reliability</dt>
                  <dd>{item.reliabilityScore != null ? item.reliabilityScore : '—'}</dd>
                  <dt className="text-muted">Evidence</dt>
                  <dd>
                    {item.evidenceCounts.before} before / {item.evidenceCounts.after} after
                  </dd>
                </dl>

                {item.booking?.suspicious_completion_reason && (
                  <div className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Reason:</strong> {item.booking.suspicious_completion_reason}
                    {item.booking.minimum_expected_duration_minutes != null && (
                      <span className="ml-2">
                        (min {item.booking.minimum_expected_duration_minutes} min)
                      </span>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2 border-t border-black/5">
                  <button
                    type="button"
                    onClick={() => handleAction(item.id, 'approve')}
                    disabled={acting === item.id}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {acting === item.id ? '…' : 'Approve'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction(item.id, 'deny')}
                    disabled={acting === item.id}
                    className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60"
                  >
                    {acting === item.id ? '…' : 'Deny'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction(item.id, 'escalate')}
                    disabled={acting === item.id}
                    className="px-3 py-1.5 rounded-lg border border-black/15 bg-white text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
                  >
                    {acting === item.id ? '…' : 'Escalate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
