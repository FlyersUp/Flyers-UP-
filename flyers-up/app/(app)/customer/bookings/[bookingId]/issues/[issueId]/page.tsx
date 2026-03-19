'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layouts/AppLayout';
import { AlertCircle, ArrowLeft, Loader2, Upload } from 'lucide-react';

type DisputeStatus = 'submitted' | 'under_review' | 'waiting_for_pro' | 'resolved';
type ResolutionOutcome = 'refund' | 'partial_refund' | 'denied' | null;

type IssueData = {
  id: string;
  issue_type: string;
  description: string | null;
  notes: string | null;
  status: DisputeStatus;
  requested_resolution: string | null;
  resolution_outcome: ResolutionOutcome;
  status_reason: string | null;
  evidence_urls: string[];
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

type IssueUpdate = {
  id: string;
  author_role: 'customer' | 'pro' | 'support' | 'system';
  message: string;
  attachment_urls: string[];
  created_at: string;
};

type Payload = {
  booking: {
    id: string;
    serviceDate: string | null;
    serviceTime: string | null;
    status: string;
    address: string | null;
    proName: string;
    categoryName: string | null;
  };
  issue: IssueData;
  updates: IssueUpdate[];
};

const STATUS_STEPS: Array<{ key: DisputeStatus; label: string }> = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'under_review', label: 'Under review' },
  { key: 'waiting_for_pro', label: 'Waiting for pro' },
  { key: 'resolved', label: 'Resolved' },
];

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function resolutionLabel(outcome: ResolutionOutcome): string {
  if (outcome === 'refund') return 'Resolved: Refund approved';
  if (outcome === 'partial_refund') return 'Resolved: Partial refund approved';
  if (outcome === 'denied') return 'Resolved: Request denied';
  return 'Resolved';
}

export default function IssueStatusPage({
  params,
}: {
  params: Promise<{ bookingId: string; issueId: string }>;
}) {
  const { bookingId, issueId } = use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<Payload | null>(null);

  const [addInfoText, setAddInfoText] = useState('');
  const [newEvidenceUrls, setNewEvidenceUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/issues/${issueId}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'Failed to load case');
      setPayload({
        booking: json.booking,
        issue: {
          ...json.issue,
          evidence_urls: Array.isArray(json.issue?.evidence_urls) ? json.issue.evidence_urls : [],
        },
        updates: Array.isArray(json.updates)
          ? json.updates.map((u: any) => ({
              ...u,
              attachment_urls: Array.isArray(u.attachment_urls) ? u.attachment_urls : [],
            }))
          : [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load case.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [bookingId, issueId]);

  const stepIndex = useMemo(() => {
    const status = payload?.issue.status ?? 'submitted';
    return STATUS_STEPS.findIndex((s) => s.key === status);
  }, [payload?.issue.status]);

  const canAddInfo = payload?.issue.status !== 'resolved';

  const onUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files).slice(0, 6)) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch(`/api/bookings/${bookingId}/issues/upload`, {
          method: 'POST',
          body: fd,
        });
        const json = await res.json();
        if (!res.ok || !json?.url) {
          throw new Error(json?.error || 'Upload failed');
        }
        setNewEvidenceUrls((prev) => (prev.length >= 8 ? prev : [...prev, json.url]));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload evidence.');
    } finally {
      setUploading(false);
    }
  };

  const submitAddInfo = async () => {
    if ((!addInfoText.trim() && newEvidenceUrls.length === 0) || !canAddInfo) return;
    setSavingInfo(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addInfoMessage: addInfoText.trim() || undefined,
          evidenceUrls: newEvidenceUrls,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to add info');
      setAddInfoText('');
      setNewEvidenceUrls([]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add info.');
    } finally {
      setSavingInfo(false);
    }
  };

  return (
    <AppLayout mode="customer">
      <div className="min-h-screen bg-bg pb-20">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <Link
            href={`/customer/bookings/${bookingId}/track`}
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text"
          >
            <ArrowLeft size={16} />
            Back to booking
          </Link>

          <header className="mt-4 mb-4">
            <h1 className="text-2xl font-semibold text-text">Issue status</h1>
            <p className="text-sm text-muted mt-1">Follow progress, review updates, and add information if needed.</p>
          </header>

          {loading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-28 rounded-2xl border border-border bg-surface" />
              <div className="h-44 rounded-2xl border border-border bg-surface" />
              <div className="h-44 rounded-2xl border border-border bg-surface" />
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50/70 dark:bg-red-950/20 p-4 text-sm text-red-700 dark:text-red-300 inline-flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <div>
                <p>{error}</p>
                <button
                  type="button"
                  onClick={() => void load()}
                  className="mt-2 rounded-lg bg-red-600 text-white px-3 py-1.5 text-xs font-semibold"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : payload ? (
            <div className="space-y-4">
              <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Current status</p>
                    <p className="text-base font-semibold text-text mt-1">
                      {payload.issue.status === 'resolved'
                        ? resolutionLabel(payload.issue.resolution_outcome)
                        : STATUS_STEPS.find((s) => s.key === payload.issue.status)?.label ?? 'Submitted'}
                    </p>
                    <p className="text-sm text-muted mt-1">
                      {payload.issue.status_reason || 'We’ll keep this page updated as the case progresses.'}
                    </p>
                  </div>
                  <span className="text-xs text-muted">Case #{payload.issue.id.slice(0, 8).toUpperCase()}</span>
                </div>

                <ol className="mt-4 space-y-2">
                  {STATUS_STEPS.map((step, idx) => {
                    const complete = idx <= stepIndex;
                    return (
                      <li key={step.key} className="flex items-center gap-2 text-sm">
                        <span
                          className={`h-5 w-5 rounded-full border flex items-center justify-center text-[11px] ${
                            complete
                              ? 'bg-[hsl(var(--customer-tint))] border-accent text-accent'
                              : 'bg-bg border-border text-muted'
                          }`}
                          aria-hidden
                        >
                          {complete ? '✓' : idx + 1}
                        </span>
                        <span className={complete ? 'text-text font-medium' : 'text-muted'}>{step.label}</span>
                      </li>
                    );
                  })}
                </ol>
              </section>

              <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-text mb-2">Case summary</h2>
                <div className="space-y-1 text-sm text-muted">
                  <p>
                    <span className="text-text font-medium">Booking:</span> {payload.booking.categoryName || 'Service'} with {payload.booking.proName}
                  </p>
                  <p>
                    <span className="text-text font-medium">Date:</span>{' '}
                    {payload.booking.serviceDate
                      ? new Date(payload.booking.serviceDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : '—'}
                    {payload.booking.serviceTime ? ` at ${payload.booking.serviceTime}` : ''}
                  </p>
                  <p>
                    <span className="text-text font-medium">Issue type:</span> {payload.issue.issue_type.replace(/_/g, ' ')}
                  </p>
                  <p>
                    <span className="text-text font-medium">Submitted:</span> {formatTimestamp(payload.issue.created_at)}
                  </p>
                </div>
                {payload.issue.description ? (
                  <p className="mt-3 text-sm text-text whitespace-pre-wrap">{payload.issue.description}</p>
                ) : null}
              </section>

              <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-text mb-2">Evidence</h2>
                {payload.issue.evidence_urls.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {payload.issue.evidence_urls.map((url, idx) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-xl overflow-hidden border border-border bg-bg aspect-square"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Evidence ${idx + 1}`} className="h-full w-full object-cover" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">No evidence uploaded yet.</p>
                )}
              </section>

              <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-text mb-2">Support updates</h2>
                {payload.updates.length > 0 ? (
                  <div className="space-y-3">
                    {payload.updates.map((u) => (
                      <div key={u.id} className="rounded-xl border border-border bg-bg p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{u.author_role}</p>
                          <p className="text-xs text-muted">{formatTimestamp(u.created_at)}</p>
                        </div>
                        <p className="mt-1 text-sm text-text whitespace-pre-wrap">{u.message}</p>
                        {u.attachment_urls.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {u.attachment_urls.map((url) => (
                              <a key={url} href={url} target="_blank" rel="noreferrer" className="text-xs text-accent hover:underline">
                                Attachment
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">No updates yet.</p>
                )}
              </section>

              <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-text mb-2">Actions</h2>
                {canAddInfo ? (
                  <div className="space-y-3">
                    <textarea
                      rows={3}
                      value={addInfoText}
                      onChange={(e) => setAddInfoText(e.target.value)}
                      placeholder="Add details that might help support review your case."
                      className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                    <label className="inline-flex items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2 text-sm font-medium text-text cursor-pointer hover:bg-surface2">
                      {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                      Add evidence
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="sr-only"
                        onChange={(e) => void onUploadFiles(e.target.files)}
                        disabled={uploading}
                      />
                    </label>
                    {newEvidenceUrls.length > 0 ? (
                      <div className="grid grid-cols-4 gap-2">
                        {newEvidenceUrls.map((url) => (
                          <div key={url} className="relative rounded-lg overflow-hidden border border-border bg-bg aspect-square">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="" className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setNewEvidenceUrls((prev) => prev.filter((u) => u !== url))}
                              className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white text-xs"
                              aria-label="Remove"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void submitAddInfo()}
                      disabled={savingInfo || uploading || (!addInfoText.trim() && newEvidenceUrls.length === 0)}
                      className="h-10 rounded-full bg-accent text-accentContrast px-4 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {savingInfo ? 'Saving…' : 'Add information'}
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-muted">This case is resolved and no longer accepts additional details.</p>
                )}
                <Link
                  href={`/customer/settings/help-support?booking=${bookingId}&issue=${issueId}`}
                  className="mt-3 inline-flex text-sm font-medium text-accent hover:underline"
                >
                  Contact support
                </Link>
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </AppLayout>
  );
}

