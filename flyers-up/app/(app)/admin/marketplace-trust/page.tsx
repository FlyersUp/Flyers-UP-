'use client';

import Layout from '@/components/Layout';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type Analytics = {
  arrivalVerifiedCount?: number;
  arrivalTotalCount?: number;
  arrivalVerificationRate?: number;
  rebookCustomerCount?: number;
  rebookEventCount?: number;
  completionProofCount?: number;
  flyerShareCount?: number;
  neighborhoodJobs7d?: number;
};

export default function AdminMarketplaceTrustPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/admin/marketplace-trust', { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? 'Failed to load');
          return;
        }
        setAnalytics(json);
      } catch {
        setError('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <Layout title="Marketplace Trust – Admin">
      <div className="mx-auto max-w-4xl space-y-6 pb-24">
        <div>
          <Link href="/admin" className="text-sm text-muted hover:text-text mb-2 inline-block">
            ← Admin
          </Link>
          <h1 className="text-2xl font-semibold text-text">Marketplace Trust Analytics</h1>
          <p className="mt-1 text-sm text-muted">
            Arrival verification, rebook rate, completion proofs, and flyer shares.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-black/5 bg-white p-8 text-center text-muted">
            Loading…
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
            {error}
          </div>
        ) : (
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase text-muted">Arrival verified</p>
              <p className="mt-1 text-2xl font-semibold text-text">
                {analytics?.arrivalVerifiedCount ?? 0} / {analytics?.arrivalTotalCount ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase text-muted">Arrival verification rate</p>
              <p className="mt-1 text-2xl font-semibold text-text">
                {(analytics?.arrivalVerificationRate ?? 0).toFixed(1)}%
              </p>
            </div>
            <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase text-muted">Repeat customers</p>
              <p className="mt-1 text-2xl font-semibold text-text">
                {analytics?.rebookCustomerCount ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase text-muted">Rebook events</p>
              <p className="mt-1 text-2xl font-semibold text-text">
                {analytics?.rebookEventCount ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase text-muted">Completion proof uploads</p>
              <p className="mt-1 text-2xl font-semibold text-text">
                {analytics?.completionProofCount ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase text-muted">Flyer shares</p>
              <p className="mt-1 text-2xl font-semibold text-text">
                {analytics?.flyerShareCount ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase text-muted">Neighborhood jobs (7d)</p>
              <p className="mt-1 text-2xl font-semibold text-text">
                {analytics?.neighborhoodJobs7d ?? 0}
              </p>
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}
