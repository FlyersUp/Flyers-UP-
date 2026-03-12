'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppLayout } from '@/components/layouts/AppLayout';

type DisputeData = {
  booking: Record<string, unknown>;
  dispute: Record<string, unknown> | null;
  evidence: Record<string, unknown> | null;
  arrivals: Record<string, unknown> | null;
  completions: Record<string, unknown> | null;
  contactAttempts: unknown[];
  events: unknown[];
  issues: unknown[];
  customer: Record<string, unknown> | null;
  pro: { display_name?: string; profile?: { full_name?: string; email?: string } } | null;
  completenessScore: number;
  missingEvidence: string[];
};

export default function AdminDisputePage() {
  const params = useParams();
  const bookingId = params?.bookingId as string;
  const [data, setData] = useState<DisputeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    fetch(`/api/admin/disputes/${bookingId}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error);
        else setData(json);
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false));
  }, [bookingId]);

  if (loading) return <AppLayout><div className="p-6">Loading…</div></AppLayout>;
  if (error || !data) return <AppLayout><div className="p-6 text-red-600">{error ?? 'Not found'}</div></AppLayout>;

  const { booking, dispute, evidence, arrivals, events, completenessScore, missingEvidence } = data;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <Link href="/admin" className="text-sm text-muted hover:text-text">← Admin</Link>
          <h1 className="text-2xl font-semibold mt-2">Dispute Evidence — Booking {String(booking.id).slice(0, 8)}…</h1>
        </div>

        {/* A. Booking overview */}
        <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Booking Overview</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted">Status</dt>
            <dd>{String(booking.status)}</dd>
            <dt className="text-muted">Service</dt>
            <dd>{String(booking.service_date)} {String(booking.service_time)}</dd>
            <dt className="text-muted">Address</dt>
            <dd>{String(booking.address ?? '—')}</dd>
            <dt className="text-muted">Customer</dt>
            <dd>{data.customer ? String(data.customer.full_name ?? data.customer.email) : '—'}</dd>
            <dt className="text-muted">Pro</dt>
            <dd>{data.pro?.display_name ?? data.pro?.profile?.full_name ?? '—'}</dd>
            {Boolean(booking.cancelled_at) && (
              <>
                <dt className="text-muted">Canceled</dt>
                <dd>{String(booking.cancelled_at)}</dd>
                <dt className="text-muted">Refund</dt>
                <dd>{String(booking.refund_type ?? '—')} ({booking.refund_amount_cents ?? 0}¢)</dd>
                <dt className="text-muted">Policy</dt>
                <dd>{String(booking.policy_explanation ?? '—')}</dd>
              </>
            )}
          </dl>
        </section>

        {/* B. Chronological timeline */}
        <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Timeline</h2>
          <ul className="space-y-2 text-sm">
            {events.map((e: { type?: string; created_at?: string; data?: unknown }, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-muted shrink-0">{e.created_at ? new Date(e.created_at).toLocaleString() : ''}</span>
                <span className="font-medium">{e.type ?? 'event'}</span>
                {e.data && Object.keys(e.data as object).length > 0 && (
                  <span className="text-muted">({JSON.stringify(e.data)})</span>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* C. Evidence panel */}
        <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Evidence</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span>Completeness</span>
              <span className={`font-semibold ${completenessScore >= 80 ? 'text-green-600' : completenessScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                {completenessScore}%
              </span>
            </div>
            {missingEvidence.length > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm">
                <p className="font-medium text-amber-800">Missing evidence:</p>
                <ul className="list-disc list-inside text-amber-700">{missingEvidence.map((m, i) => <li key={i}>{m}</li>)}</ul>
              </div>
            )}
            {arrivals && (
              <div>
                <p className="text-muted text-sm">GPS Arrival</p>
                <p className="text-sm">Verified: {String(arrivals.location_verified)} at {String(arrivals.arrival_timestamp)}</p>
              </div>
            )}
            {evidence && (
              <div>
                <p className="text-muted text-sm">Evidence bundle</p>
                <pre className="text-xs bg-black/5 p-2 rounded overflow-auto max-h-40">{JSON.stringify(evidence, null, 2)}</pre>
              </div>
            )}
          </div>
        </section>

        {/* D. Policy decision */}
        {booking.policy_decision_snapshot && (
          <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Policy Decision</h2>
            <pre className="text-sm bg-black/5 p-3 rounded overflow-auto">{JSON.stringify(booking.policy_decision_snapshot, null, 2)}</pre>
            <p className="mt-2 text-sm text-muted">{String(booking.policy_explanation)}</p>
          </section>
        )}

        {/* E. Admin action bar */}
        <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Admin Actions</h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="px-4 py-2 rounded-lg bg-green-100 text-green-800 text-sm font-medium hover:bg-green-200">
              Uphold Customer
            </button>
            <button type="button" className="px-4 py-2 rounded-lg bg-amber-100 text-amber-800 text-sm font-medium hover:bg-amber-200">
              Uphold Pro
            </button>
            <button type="button" className="px-4 py-2 rounded-lg bg-blue-100 text-blue-800 text-sm font-medium hover:bg-blue-200">
              Split Refund
            </button>
            <button type="button" className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 text-sm font-medium hover:bg-gray-200">
              Request Evidence
            </button>
            <button type="button" className="px-4 py-2 rounded-lg bg-red-100 text-red-800 text-sm font-medium hover:bg-red-200">
              Issue Strike
            </button>
            <button type="button" className="px-4 py-2 rounded-lg bg-red-100 text-red-800 text-sm font-medium hover:bg-red-200">
              Freeze Payout
            </button>
          </div>
          <p className="mt-3 text-xs text-muted">Actions require backend implementation.</p>
        </section>
      </div>
    </AppLayout>
  );
}
