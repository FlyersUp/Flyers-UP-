'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, Camera, Loader2, Upload } from 'lucide-react';
import { AppLayout } from '@/components/layouts/AppLayout';

type BookingContext = {
  id: string;
  serviceName?: string;
  proName?: string;
  serviceDate?: string;
  serviceTime?: string;
  status?: string;
};

const ISSUE_TYPES = [
  { value: 'work_incomplete', label: 'Work incomplete' },
  { value: 'wrong_service', label: 'Wrong service provided' },
  { value: 'pro_late', label: 'Pro was significantly late' },
  { value: 'damage_or_loss', label: 'Damage or missing item' },
  { value: 'safety_concern', label: 'Safety concern' },
  { value: 'billing_problem', label: 'Billing or charge issue' },
  { value: 'other', label: 'Other' },
] as const;

const RESOLUTION_OPTIONS = [
  { value: '', label: 'No preference' },
  { value: 'refund', label: 'Full refund' },
  { value: 'partial_refund', label: 'Partial refund' },
  { value: 'redo_service', label: 'Redo service / fix' },
  { value: 'other', label: 'Other' },
] as const;

function formatDate(serviceDate?: string, serviceTime?: string): string {
  if (!serviceDate) return '—';
  const d = new Date(serviceDate);
  if (Number.isNaN(d.getTime())) return serviceDate;
  return `${d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}${serviceTime ? ` at ${serviceTime}` : ''}`;
}

export default function ReportIssueFormPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = use(params);
  const router = useRouter();

  const [loadingContext, setLoadingContext] = useState(true);
  const [context, setContext] = useState<BookingContext | null>(null);

  const [issueType, setIssueType] = useState<(typeof ISSUE_TYPES)[number]['value']>('work_incomplete');
  const [description, setDescription] = useState('');
  const [requestedResolution, setRequestedResolution] = useState('');
  const [uploading, setUploading] = useState(false);
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch(`/api/customer/bookings/${bookingId}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((json) => {
        if (!mounted || !json?.booking) return;
        setContext({
          id: json.booking.id,
          serviceName: json.booking.serviceName,
          proName: json.booking.proName,
          serviceDate: json.booking.serviceDate,
          serviceTime: json.booking.serviceTime,
          status: json.booking.status,
        });
      })
      .catch(() => {
        if (mounted) setError('Unable to load booking details.');
      })
      .finally(() => {
        if (mounted) setLoadingContext(false);
      });
    return () => {
      mounted = false;
    };
  }, [bookingId]);

  const canSubmit = useMemo(() => description.trim().length >= 12 && !submitting, [description, submitting]);

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
        setEvidenceUrls((prev) => (prev.length >= 8 ? prev : [...prev, json.url]));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload evidence.');
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueType,
          description: description.trim(),
          notes: description.trim().slice(0, 300),
          evidenceUrls,
          requestedResolution: requestedResolution || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.issueId) {
        throw new Error(json?.error || 'Failed to submit issue');
      }
      router.push(`/customer/bookings/${bookingId}/issues/${json.issueId}/submitted`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit issue.');
      setSubmitting(false);
    }
  };

  return (
    <AppLayout mode="customer">
      <div className="min-h-screen bg-bg pb-24">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <Link
            href={`/customer/bookings/${bookingId}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text"
          >
            <ArrowLeft size={16} />
            Back to booking
          </Link>

          <header className="mt-4 mb-5">
            <h1 className="text-2xl font-semibold text-text">Report an issue</h1>
            <p className="text-sm text-muted mt-1">
              We review every case fairly and keep you updated throughout the process.
            </p>
          </header>

          <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm mb-4">
            {loadingContext ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 w-1/3 rounded bg-surface2" />
                <div className="h-4 w-2/3 rounded bg-surface2" />
              </div>
            ) : context ? (
              <div className="space-y-1.5">
                <p className="text-xs uppercase tracking-wide text-muted">Booking context</p>
                <p className="text-sm font-semibold text-text">{context.serviceName ?? 'Service'}</p>
                <p className="text-sm text-muted">{context.proName ?? 'Pro'}</p>
                <p className="text-sm text-muted">{formatDate(context.serviceDate, context.serviceTime)}</p>
              </div>
            ) : (
              <p className="text-sm text-muted">Booking details unavailable.</p>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm mb-4">
            <h2 className="text-sm font-semibold text-text mb-3">Issue type</h2>
            <div className="space-y-2">
              {ISSUE_TYPES.map((t) => (
                <label
                  key={t.value}
                  className="flex items-center gap-3 rounded-xl border border-border bg-bg px-3 py-2.5 text-sm"
                >
                  <input
                    type="radio"
                    name="issueType"
                    value={t.value}
                    checked={issueType === t.value}
                    onChange={() => setIssueType(t.value)}
                  />
                  <span>{t.label}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm mb-4">
            <label className="block text-sm font-semibold text-text mb-2" htmlFor="issue-description">
              What happened?
            </label>
            <textarea
              id="issue-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Describe what happened and why this booking outcome feels incorrect."
              className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <p className="mt-1 text-xs text-muted">{description.trim().length}/3000 characters</p>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm mb-4">
            <h2 className="text-sm font-semibold text-text mb-2">Evidence (optional)</h2>
            <label className="inline-flex items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2 text-sm font-medium text-text cursor-pointer hover:bg-surface2">
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              Upload photos
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => void onUploadFiles(e.target.files)}
                disabled={uploading}
              />
            </label>
            {evidenceUrls.length > 0 ? (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {evidenceUrls.map((url, idx) => (
                  <div key={url} className="relative rounded-xl overflow-hidden border border-border bg-bg aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Evidence ${idx + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setEvidenceUrls((prev) => prev.filter((u) => u !== url))}
                      className="absolute top-1.5 right-1.5 rounded-full bg-black/65 text-white h-5 w-5 text-xs"
                      aria-label={`Remove evidence ${idx + 1}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted inline-flex items-center gap-1.5">
                <Camera size={12} />
                Add up to 8 photos
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm mb-4">
            <label className="block text-sm font-semibold text-text mb-2" htmlFor="resolution-request">
              Preferred resolution (optional)
            </label>
            <select
              id="resolution-request"
              value={requestedResolution}
              onChange={(e) => setRequestedResolution(e.target.value)}
              className="w-full h-11 rounded-xl border border-border bg-bg px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              {RESOLUTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </section>

          {error ? (
            <div className="mb-4 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/70 dark:bg-red-950/20 p-3 text-sm text-red-700 dark:text-red-300 inline-flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-bg/95 backdrop-blur-md border-t border-border">
            <button
              type="button"
              onClick={() => void onSubmit()}
              disabled={!canSubmit || uploading}
              className="w-full h-11 rounded-full bg-accent text-accentContrast text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-95"
            >
              {submitting ? 'Submitting…' : 'Submit issue'}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

