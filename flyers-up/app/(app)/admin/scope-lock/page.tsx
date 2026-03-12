'use client';

import Layout from '@/components/Layout';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type Analytics = {
  total_mismatches?: number;
  scope_confirmed_count?: number;
  pending_scope_count?: number;
  avg_price_adjustment_dollars?: number;
  frequent_misrepresentation_count?: number;
  avg_job_price?: number;
};

type FrequentUser = {
  customer_id: string;
  mismatch_count: number;
  last_mismatch_at: string | null;
};

export default function AdminScopeLockPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [frequentUsers, setFrequentUsers] = useState<FrequentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/admin/scope-lock-analytics', { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? 'Failed to load');
          return;
        }
        setAnalytics(json.analytics ?? {});
        setFrequentUsers(json.frequentMisrepresentationUsers ?? []);
      } catch {
        setError('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <Layout title="Scope Lock Analytics – Admin">
      <div className="mx-auto max-w-4xl space-y-6 pb-24">
        <div>
          <Link href="/admin" className="text-sm text-muted hover:text-text mb-2 inline-block">
            ← Admin
          </Link>
          <h1 className="text-2xl font-semibold text-text">Scope Lock Analytics</h1>
          <p className="mt-1 text-sm text-muted">
            Mismatch rate, price adjustments, and customer misrepresentation tracking.
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
          <>
            <section className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase text-muted">Total mismatches</p>
                <p className="mt-1 text-2xl font-semibold text-text">
                  {analytics?.total_mismatches ?? 0}
                </p>
              </div>
              <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase text-muted">Scope confirmed</p>
                <p className="mt-1 text-2xl font-semibold text-text">
                  {analytics?.scope_confirmed_count ?? 0}
                </p>
              </div>
              <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase text-muted">Pending scope</p>
                <p className="mt-1 text-2xl font-semibold text-text">
                  {analytics?.pending_scope_count ?? 0}
                </p>
              </div>
              <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase text-muted">Avg price adjustment</p>
                <p className="mt-1 text-2xl font-semibold text-text">
                  ${(analytics?.avg_price_adjustment_dollars ?? 0).toFixed(2)}
                </p>
              </div>
              <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase text-muted">Frequent misrepresentation</p>
                <p className="mt-1 text-2xl font-semibold text-text">
                  {analytics?.frequent_misrepresentation_count ?? 0}
                </p>
              </div>
              <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase text-muted">Avg job price</p>
                <p className="mt-1 text-2xl font-semibold text-text">
                  ${(analytics?.avg_job_price ?? 0).toFixed(2)}
                </p>
              </div>
            </section>

            {frequentUsers.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-semibold text-text">Frequent misrepresentation (3+ mismatches)</h2>
                <div className="rounded-2xl border border-black/5 bg-white overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-black/5 bg-black/[0.02]">
                        <th className="px-4 py-3 text-left font-medium text-muted">Customer ID</th>
                        <th className="px-4 py-3 text-left font-medium text-muted">Mismatch count</th>
                        <th className="px-4 py-3 text-left font-medium text-muted">Last mismatch</th>
                      </tr>
                    </thead>
                    <tbody>
                      {frequentUsers.map((u) => (
                        <tr key={u.customer_id} className="border-b border-black/5">
                          <td className="px-4 py-3 font-mono text-xs">{u.customer_id}</td>
                          <td className="px-4 py-3">{u.mismatch_count}</td>
                          <td className="px-4 py-3 text-muted">
                            {u.last_mismatch_at
                              ? new Date(u.last_mismatch_at).toLocaleDateString()
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
