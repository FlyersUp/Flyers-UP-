'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { getCurrentUser } from '@/lib/api';
import { NYC_BOROUGH_OPTIONS, boroughLabelFromSlug, normalizeBoroughSlug } from '@/lib/marketplace/nycBoroughs';

function MatchRequestFormInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const serviceSlug = sp.get('serviceSlug')?.trim() ?? '';
  const boroughParam = normalizeBoroughSlug(sp.get('borough') ?? sp.get('boroughSlug') ?? '') ?? 'brooklyn';
  const occupationParam = sp.get('occupationSlug')?.trim() ?? '';

  const [ready, setReady] = useState(false);
  const [occupationSlug, setOccupationSlug] = useState(occupationParam);
  const [boroughSlug, setBoroughSlug] = useState(boroughParam);
  const [preferredTime, setPreferredTime] = useState('');
  const [urgency, setUrgency] = useState<'asap' | 'today' | 'flexible'>('flexible');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const u = await getCurrentUser();
      if (!u) {
        router.replace(`/signin?next=${encodeURIComponent(`/customer/match?${sp.toString()}`)}`);
        return;
      }
      setReady(true);
    })();
  }, [router, sp]);

  useEffect(() => {
    if (!serviceSlug || occupationParam) return;
    void (async () => {
      try {
        const res = await fetch(`/api/marketplace/category-gate?serviceSlug=${encodeURIComponent(serviceSlug)}&boroughSlug=${encodeURIComponent(boroughSlug)}`, {
          cache: 'no-store',
        });
        const data = await res.json();
        if (data?.occupationSlug) setOccupationSlug(String(data.occupationSlug));
      } catch {
        /* keep empty */
      }
    })();
  }, [serviceSlug, boroughSlug, occupationParam]);

  const matchHref = useMemo(() => {
    const q = new URLSearchParams();
    if (serviceSlug) q.set('serviceSlug', serviceSlug);
    q.set('borough', boroughSlug);
    if (occupationSlug) q.set('occupationSlug', occupationSlug);
    return `/customer/match?${q.toString()}`;
  }, [serviceSlug, boroughSlug, occupationSlug]);

  const submit = async () => {
    setError(null);
    if (!occupationSlug.trim()) {
      setError('Missing occupation. Open this form from a service page or add occupationSlug to the URL.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/customer/match-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          occupationSlug: occupationSlug.trim(),
          boroughSlug,
          preferredTime: preferredTime.trim() || null,
          urgency,
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setError(typeof data?.error === 'string' ? data.error : 'Could not submit request');
        return;
      }
      router.push(`/customer/match/sent?id=${encodeURIComponent(String(data.id))}`);
    } catch {
      setError('Network error. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready) {
    return (
      <AppLayout mode="customer">
        <div className="max-w-lg mx-auto px-4 py-10 text-sm text-muted">Loading…</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout mode="customer">
      <div className="max-w-lg mx-auto px-4 py-8 pb-24">
        <Link href={serviceSlug ? `/customer/services/${encodeURIComponent(serviceSlug)}` : '/customer/services'} className="text-sm text-muted hover:text-text">
          ← Back
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-text">Get matched with a pro</h1>
        <p className="mt-2 text-sm text-muted">
          Tell us what you need. Flyers Up ops will reach out to trusted pros in NYC and follow up with next steps.
        </p>

        <div className="mt-8 space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Borough</label>
            <select
              value={boroughSlug}
              onChange={(e) => {
                const next = normalizeBoroughSlug(e.target.value);
                if (next) setBoroughSlug(next);
              }}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text"
            >
              {NYC_BOROUGH_OPTIONS.map((o) => (
                <option key={o.slug} value={o.slug}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1">Occupation (internal slug)</label>
            <input
              value={occupationSlug}
              onChange={(e) => setOccupationSlug(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text"
              placeholder="e.g. handyman"
            />
            <p className="mt-1 text-xs text-muted">
              Pre-filled when you arrive from a service page. Current borough: {boroughLabelFromSlug(boroughSlug)}.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1">Preferred time</label>
            <input
              value={preferredTime}
              onChange={(e) => setPreferredTime(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text"
              placeholder="e.g. Saturday morning, after 5pm weekdays"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1">Urgency</label>
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value as 'asap' | 'today' | 'flexible')}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text"
            >
              <option value="flexible">Flexible</option>
              <option value="today">Today</option>
              <option value="asap">ASAP</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text"
              placeholder="What should we know about the job?"
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting}
            className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-accentContrast hover:opacity-95 disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit request'}
          </button>

          <p className="text-xs text-muted">
            Bookmark: <span className="font-mono break-all">{matchHref}</span>
          </p>
        </div>
      </div>
    </AppLayout>
  );
}

export default function MatchRequestPage() {
  return (
    <Suspense
      fallback={
        <AppLayout mode="customer">
          <div className="max-w-lg mx-auto px-4 py-10 text-sm text-muted">Loading…</div>
        </AppLayout>
      }
    >
      <MatchRequestFormInner />
    </Suspense>
  );
}
