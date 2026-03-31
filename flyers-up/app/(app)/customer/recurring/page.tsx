'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/layouts/AppLayout';
import { normalizeUuidOrNull } from '@/lib/isUuid';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDaysOfWeek(raw: unknown): string {
  if (!Array.isArray(raw) || raw.length === 0) return '—';
  const nums = raw.map((x) => Number(x)).filter((n) => n >= 0 && n <= 6);
  if (nums.length === 0) return '—';
  return [...new Set(nums)]
    .sort((a, b) => a - b)
    .map((d) => DAY_LABELS[d])
    .join(', ');
}

function formatTime(raw: unknown): string {
  if (raw == null) return '—';
  const s = String(raw);
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return s;
  let h = parseInt(m[1]!, 10);
  const min = m[2]!;
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${min} ${ap}`;
}

type SeriesRow = Record<string, unknown>;
type OccRow = { id: string; scheduled_start_at: string; status: string; booking_id: string | null };

function CustomerRecurringHubInner() {
  const sp = useSearchParams();
  const seriesId = useMemo(() => normalizeUuidOrNull(sp.get('series')), [sp]);

  const [loading, setLoading] = useState(Boolean(seriesId));
  const [error, setError] = useState<string | null>(null);
  const [series, setSeries] = useState<SeriesRow | null>(null);
  const [occurrences, setOccurrences] = useState<OccRow[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/recurring/series/${id}`, { credentials: 'include' });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error ?? 'Could not load this recurring plan');
        setSeries(null);
        setOccurrences([]);
        return;
      }
      setSeries(j.series ?? null);
      setOccurrences(Array.isArray(j.occurrences) ? j.occurrences : []);
    } catch {
      setError('Network error');
      setSeries(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!seriesId) {
      setLoading(false);
      return;
    }
    void load(seriesId);
  }, [seriesId, load]);

  async function acceptCounter() {
    if (!seriesId) return;
    setActionLoading(true);
    setActionMsg(null);
    try {
      const r = await fetch(`/api/recurring/series/${seriesId}/accept-counter`, {
        method: 'POST',
        credentials: 'include',
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setActionMsg(typeof j.error === 'string' ? j.error : 'Could not accept the counter offer');
        return;
      }
      setActionMsg("You accepted the pro's updated schedule. Your recurring plan is now active.");
      await load(seriesId);
    } catch {
      setActionMsg('Network error');
    } finally {
      setActionLoading(false);
    }
  }

  async function declineCounter() {
    if (!seriesId) return;
    if (!window.confirm('Decline this offer and cancel this recurring request?')) return;
    setActionLoading(true);
    setActionMsg(null);
    try {
      const r = await fetch(`/api/recurring/series/${seriesId}/cancel`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancellation_reason: 'Customer declined counter proposal' }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setActionMsg(typeof j.error === 'string' ? j.error : 'Could not cancel');
        return;
      }
      await load(seriesId);
    } catch {
      setActionMsg('Network error');
    } finally {
      setActionLoading(false);
    }
  }

  if (!seriesId) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold text-[#5D695D]">Recurring plans</h1>
        <p className="text-sm text-[#5D695D]/75 leading-relaxed">
          Open a recurring plan from a notification link, or start a new recurring request from a pro you work with.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/customer/favorites"
            className="inline-flex rounded-xl bg-[#E48C35] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
          >
            Favorites &amp; pros
          </Link>
          <Link
            href="/customer"
            className="inline-flex rounded-xl border border-[#5D695D]/20 bg-[#F8F4EE]/80 px-4 py-2.5 text-sm font-semibold text-[#5D695D] transition hover:border-[#5D695D]/35"
          >
            Customer home
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10 text-sm text-[#5D695D]/70">Loading your recurring plan…</div>
    );
  }

  if (error || !series) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10 space-y-4">
        <h1 className="text-xl font-semibold text-[#5D695D]">Couldn’t open this plan</h1>
        <p className="text-sm text-[#5D695D]/75">{error ?? 'Something went wrong.'}</p>
        <Link href="/customer" className="inline-block text-sm font-semibold text-[#E48C35] hover:underline">
          ← Back to home
        </Link>
      </div>
    );
  }

  const status = String(series.status ?? '');
  const occupation = String(series.occupation_slug ?? '—');
  const freq = String(series.frequency ?? '—');
  const counter = series.counter_proposal;
  const proNote = series.pro_note != null ? String(series.pro_note) : '';

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <Link href="/customer" className="text-sm text-[#5D695D]/65 hover:text-[#5D695D]">
        ← Home
      </Link>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#AAA06D]">Recurring plan</p>
        <h1 className="mt-1 text-2xl font-semibold text-[#5D695D]">{occupation}</h1>
        <p className="mt-2 text-sm text-[#5D695D]/70">
          Status:{' '}
          <span className="font-medium text-[#5D695D]">
            {status === 'countered'
              ? 'Counter offer from your pro'
              : status === 'pending'
                ? 'Awaiting pro'
                : status === 'approved'
                  ? 'Active'
                  : status}
          </span>
        </p>
      </div>

      {status === 'countered' && counter != null && typeof counter === 'object' && (
        <div className="rounded-2xl border border-[#AAA06D]/40 bg-[#F8F4EE]/90 p-5 shadow-[0_4px_20px_rgba(93,105,93,0.08)] space-y-4">
          <h2 className="text-sm font-semibold text-[#5D695D]">Your pro suggested changes</h2>
          <p className="text-sm text-[#5D695D]/75">
            Review the updated schedule below. If it works for you, accept to activate the plan on these terms.
          </p>
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-4 border-b border-[#5D695D]/10 pb-2">
              <dt className="text-[#5D695D]/60">Your original</dt>
              <dd className="text-right font-medium text-[#5D695D]">
                {formatDaysOfWeek(series.days_of_week)} · {formatTime(series.preferred_start_time)} · {freq}
              </dd>
            </div>
            <div className="flex justify-between gap-4 pt-1">
              <dt className="text-[#5D695D]/60">Pro suggests</dt>
              <dd className="text-right font-medium text-[#5D695D]">
                {(counter as { days_of_week?: unknown }).days_of_week != null
                  ? formatDaysOfWeek((counter as { days_of_week: unknown }).days_of_week)
                  : formatDaysOfWeek(series.days_of_week)}{' '}
                ·{' '}
                {(counter as { preferred_start_time?: unknown }).preferred_start_time != null
                  ? formatTime((counter as { preferred_start_time: unknown }).preferred_start_time)
                  : formatTime(series.preferred_start_time)}{' '}
                · {(counter as { frequency?: unknown }).frequency != null
                  ? String((counter as { frequency: unknown }).frequency)
                  : freq}
                {(counter as { duration_minutes?: unknown }).duration_minutes != null && (
                  <> · {String((counter as { duration_minutes: unknown }).duration_minutes)} min</>
                )}
              </dd>
            </div>
          </dl>
          {proNote ? (
            <div className="rounded-xl bg-[#AAA06D]/15 px-3 py-2 text-sm text-[#5D695D]">
              <span className="font-medium text-[#5D695D]">Note from pro: </span>
              {proNote}
            </div>
          ) : null}
          {actionMsg ? <p className="text-sm text-[#5D695D]">{actionMsg}</p> : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => void acceptCounter()}
              className="rounded-xl bg-[#E48C35] px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-105 disabled:opacity-50"
            >
              {actionLoading ? 'Working…' : 'Accept new schedule'}
            </button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => void declineCounter()}
              className="rounded-xl border border-[#5D695D]/25 bg-white/70 px-4 py-3 text-sm font-semibold text-[#5D695D] transition hover:bg-[#F8F4EE] disabled:opacity-50"
            >
              Decline &amp; cancel request
            </button>
          </div>
        </div>
      )}

      {status === 'pending' && (
        <div className="rounded-2xl border border-[#E0AF70]/50 bg-[#EBCEAE]/40 p-4 text-sm text-[#5D695D]">
          Your recurring request is with the pro. You’ll get a notification when they approve, counter, or decline.
        </div>
      )}

      {status === 'approved' && (
        <div className="rounded-2xl border border-[#AAA06D]/35 bg-[#F8F4EE]/80 p-4 text-sm text-[#5D695D]">
          <p className="font-medium text-[#5D695D]">This plan is active.</p>
          <p className="mt-1 text-[#5D695D]/75">
            {formatDaysOfWeek(series.days_of_week)} · {formatTime(series.preferred_start_time)} · {freq} ·{' '}
            {String(series.duration_minutes ?? '')} min
          </p>
          {occurrences.length > 0 && (
            <p className="mt-3 text-xs text-[#5D695D]/60">
              Next visits are being added to your calendar as they’re scheduled.
            </p>
          )}
        </div>
      )}

      {(status === 'declined' || status === 'canceled' || status === 'completed') && (
        <div className="rounded-2xl border border-[#5D695D]/15 bg-[#F8F4EE]/60 p-4 text-sm text-[#5D695D]/80">
          This recurring plan is no longer active ({status}).
        </div>
      )}
    </div>
  );
}

export default function CustomerRecurringPage() {
  return (
    <AppLayout mode="customer">
      <Suspense
        fallback={
          <div className="max-w-lg mx-auto px-4 py-10 text-sm text-[#5D695D]/70">Loading…</div>
        }
      >
        <CustomerRecurringHubInner />
      </Suspense>
    </AppLayout>
  );
}
