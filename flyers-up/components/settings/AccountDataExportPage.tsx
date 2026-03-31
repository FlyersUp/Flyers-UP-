'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type ExportPayload = {
  ok: boolean;
  exportedAt?: string;
  authEmail?: string | null;
  role?: string;
  profile?: Record<string, unknown> | null;
  servicePro?: Record<string, unknown> | null;
  bookingsPerspective?: string;
  bookings?: unknown[];
  paymentHistory?: unknown[];
  note?: string;
  error?: string;
};

function formatLabel(k: string): string {
  return k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function ProfileSummary({ profile }: { profile: Record<string, unknown> }) {
  const keys = ['full_name', 'first_name', 'phone', 'zip_code', 'language_preference', 'role', 'account_status', 'created_at'];
  return (
    <dl className="grid gap-2 text-sm sm:grid-cols-2">
      {keys.map((k) => {
        const v = profile[k];
        if (v === null || v === undefined || v === '') return null;
        return (
          <div key={k} className="min-w-0">
            <dt className="text-text3">{formatLabel(k)}</dt>
            <dd className="font-medium text-text truncate">{String(v)}</dd>
          </div>
        );
      })}
    </dl>
  );
}

export function AccountDataExportPage({ mode }: { mode: 'customer' | 'pro' }) {
  const [data, setData] = useState<ExportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const backHref = mode === 'pro' ? '/pro/settings/privacy-security' : '/customer/settings/privacy-security';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch('/api/account/data-export', { credentials: 'include', cache: 'no-store' });
        const json = (await res.json()) as ExportPayload;
        if (cancelled) return;
        if (!res.ok || !json.ok) {
          setErr(json.error || 'Could not load your data');
          setData(null);
          return;
        }
        setData(json);
      } catch {
        if (!cancelled) setErr('Could not load your data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const downloadJson = useCallback(() => {
    if (!data?.ok) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flyers-up-data-${data.exportedAt?.slice(0, 10) ?? 'export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  return (
    <div className="space-y-8">
      <div>
        <Link href={backHref} className="text-sm font-medium text-accent hover:underline">
          ← Privacy & Security
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-text">Your data</h1>
        <p className="mt-2 text-sm text-muted max-w-2xl">
          A simple snapshot of your profile, recent bookings, and payment-related fields on those bookings. Download a JSON
          copy for your records. This is an MVP export—not a full legal data request workflow.
        </p>
      </div>

      {loading && <p className="text-sm text-muted">Loading…</p>}
      {err && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-text">{err}</div>
      )}

      {!loading && data?.ok && (
        <>
          {data.note ? <p className="text-sm text-muted border border-border rounded-lg p-4 bg-surface2">{data.note}</p> : null}

          <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-text mb-3">Profile</h2>
            {data.profile && typeof data.profile === 'object' ? (
              <ProfileSummary profile={data.profile as Record<string, unknown>} />
            ) : (
              <p className="text-sm text-muted">No profile row.</p>
            )}
            {data.authEmail ? (
              <p className="mt-3 text-xs text-text3">Sign-in email: {data.authEmail}</p>
            ) : null}
          </section>

          {data.servicePro && Object.keys(data.servicePro).length > 0 ? (
            <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-text mb-3">Service pro profile</h2>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                {Object.entries(data.servicePro).map(([k, v]) =>
                  v === null || v === undefined || v === '' ? null : (
                    <div key={k} className="min-w-0">
                      <dt className="text-text3">{formatLabel(k)}</dt>
                      <dd className="font-medium text-text break-words">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</dd>
                    </div>
                  )
                )}
              </dl>
            </section>
          ) : null}

          <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-text mb-3">
              Recent bookings
              {data.bookingsPerspective ? (
                <span className="ml-2 text-xs font-normal text-text3">({data.bookingsPerspective} view)</span>
              ) : null}
            </h2>
            {!data.bookings?.length ? (
              <p className="text-sm text-muted">No bookings in this export window (up to 100 most recent).</p>
            ) : (
              <ul className="space-y-3 text-sm max-h-[320px] overflow-y-auto pr-1">
                {data.bookings.map((b) => {
                  const row = b as Record<string, unknown>;
                  return (
                    <li key={String(row.id)} className="border-b border-border pb-3 last:border-0">
                      <div className="font-medium text-text">
                        {String(row.service_date ?? '')} · {String(row.service_time ?? '')}
                      </div>
                      <div className="text-text2 truncate">{String(row.address ?? '')}</div>
                      <div className="text-text3 text-xs mt-1">
                        Status: {String(row.status ?? '')}
                        {row.price != null ? ` · Price: ${String(row.price)}` : ''}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-text mb-3">Payment history (from bookings)</h2>
            {!data.paymentHistory?.length ? (
              <p className="text-sm text-muted">No payment rows derived from bookings.</p>
            ) : (
              <ul className="space-y-2 text-xs font-mono text-text2 max-h-[240px] overflow-y-auto">
                {data.paymentHistory.slice(0, 20).map((p) => (
                  <li key={String((p as Record<string, unknown>).bookingId)} className="border-b border-border/60 pb-2">
                    {JSON.stringify(p)}
                  </li>
                ))}
                {data.paymentHistory.length > 20 ? (
                  <li className="text-text3 pt-1">…and {data.paymentHistory.length - 20} more (see JSON download)</li>
                ) : null}
              </ul>
            )}
          </section>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => downloadJson()}
              className="inline-flex items-center justify-center rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accentContrast hover:opacity-95"
            >
              Download JSON
            </button>
            <p className="text-xs text-text3 self-center max-w-md">
              Exported at {data.exportedAt ? new Date(data.exportedAt).toLocaleString() : '—'}. Keep this file private.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
