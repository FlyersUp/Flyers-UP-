'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
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
  const [resolving, setResolving] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [issueStrike, setIssueStrike] = useState(false);
  const [freezePayout, setFreezePayout] = useState(false);

  const refetch = useCallback(() => {
    if (!bookingId) return;
    fetch(`/api/admin/disputes/${bookingId}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error);
        else setData(json);
      })
      .catch(() => setError('Failed to load'));
  }, [bookingId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  async function handleResolve(decision: string) {
    if (!bookingId || resolving) return;
    setResolving(true);
    try {
      const res = await fetch(`/api/admin/disputes/${bookingId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          admin_notes: adminNotes || undefined,
          issue_strike: issueStrike,
          freeze_payout: freezePayout,
        }),
      });
      const json = await res.json();
      if (json.error) setError(json.error);
      else refetch();
    } catch {
      setError('Failed to resolve');
    } finally {
      setResolving(false);
    }
  }

  if (loading) return <AppLayout><div className="p-6">Loading…</div></AppLayout>;
  if (error || !data) return <AppLayout><div className="p-6 text-red-600">{error ?? 'Not found'}</div></AppLayout>;

  const { booking, dispute, evidence, arrivals, events, completenessScore, missingEvidence } = data;

  const timelineItems = (events as Array<{ type?: string; created_at?: string; data?: unknown }>).map((e, i) => (
    <li key={i} className="flex gap-3">
      <span className="text-muted shrink-0">{e.created_at ? String(new Date(String(e.created_at)).toLocaleString()) : ''}</span>
      <span className="font-medium">{String(e.type ?? 'event')}</span>
      {e.data != null && Object.keys(e.data as object).length > 0 ? (
        <span className="text-muted">({JSON.stringify(e.data)})</span>
      ) : null}
    </li>
  )) as unknown as ReactNode[];

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
          {(dispute as { dispute_reason_code?: string })?.dispute_reason_code && (
            <p className="text-sm text-muted mb-2">
              Reason: <strong>{(dispute as { dispute_reason_code: string }).dispute_reason_code}</strong>
            </p>
          )}
          {((dispute as { risk_flags?: string[] })?.risk_flags?.length ?? 0) > 0 && (
            <p className="text-sm text-amber-600 mb-2">
              Risk flags: {(dispute as { risk_flags: string[] }).risk_flags.join(', ')}
            </p>
          )}
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
                <dd>{String(booking.refund_type ?? '—')} ({String(booking.refund_amount_cents ?? 0)}¢)</dd>
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
            {timelineItems}
          </ul>
        </section>

        {/* C. Claims + Evidence */}
        <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Claims & Evidence</h2>
          {(dispute as { customer_claim?: string })?.customer_claim && (
            <div className="mb-3">
              <p className="text-muted text-xs font-medium uppercase">Customer claim</p>
              <p className="text-sm">{String((dispute as { customer_claim: string }).customer_claim)}</p>
            </div>
          )}
          {(dispute as { pro_claim?: string })?.pro_claim && (
            <div className="mb-3">
              <p className="text-muted text-xs font-medium uppercase">Pro claim</p>
              <p className="text-sm">{String((dispute as { pro_claim: string }).pro_claim)}</p>
            </div>
          )}
          <h3 className="text-sm font-medium mt-4 mb-2">Evidence</h3>
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
            {arrivals != null && (
              <div>
                <p className="text-muted text-sm">GPS Arrival</p>
                <p className="text-sm">Verified: {String(arrivals.location_verified)} at {String(arrivals.arrival_timestamp)}</p>
              </div>
            )}
            {evidence != null && (
              <div>
                <p className="text-muted text-sm">Evidence bundle</p>
                <pre className="text-xs bg-black/5 p-2 rounded overflow-auto max-h-40">{JSON.stringify(evidence, null, 2)}</pre>
              </div>
            )}
          </div>
        </section>

        {/* D. Policy decision */}
        {booking.policy_decision_snapshot != null && (
          <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Policy Decision</h2>
            <pre className="text-sm bg-black/5 p-3 rounded overflow-auto">{JSON.stringify(booking.policy_decision_snapshot, null, 2)}</pre>
            <p className="mt-2 text-sm text-muted">{String(booking.policy_explanation)}</p>
          </section>
        )}

        {/* E. Admin action bar */}
        <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Admin Actions</h2>
          <textarea
            placeholder="Admin notes (optional)"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-black/10 text-sm mb-3 min-h-[60px]"
            rows={2}
          />
          <div className="flex flex-wrap gap-2 mb-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={issueStrike} onChange={(e) => setIssueStrike(e.target.checked)} />
              Issue strike to Pro
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={freezePayout} onChange={(e) => setFreezePayout(e.target.checked)} />
              Freeze payout
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={resolving}
              onClick={() => handleResolve('uphold_customer')}
              className="px-4 py-2 rounded-lg bg-green-100 text-green-800 text-sm font-medium hover:bg-green-200 disabled:opacity-50"
            >
              Uphold Customer
            </button>
            <button
              type="button"
              disabled={resolving}
              onClick={() => handleResolve('uphold_pro')}
              className="px-4 py-2 rounded-lg bg-amber-100 text-amber-800 text-sm font-medium hover:bg-amber-200 disabled:opacity-50"
            >
              Uphold Pro
            </button>
            <button
              type="button"
              disabled={resolving}
              onClick={() => handleResolve('split_refund')}
              className="px-4 py-2 rounded-lg bg-blue-100 text-blue-800 text-sm font-medium hover:bg-blue-200 disabled:opacity-50"
            >
              Split Refund
            </button>
            <button
              type="button"
              disabled={resolving}
              onClick={() => handleResolve('request_evidence')}
              className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
            >
              Request Evidence
            </button>
          </div>
          {resolving && <p className="mt-2 text-xs text-muted">Saving…</p>}
        </section>
      </div>
    </AppLayout>
  );
}
