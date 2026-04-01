'use client';

import { ProBookingJobNotes } from '@/components/bookings/ProBookingJobNotes';

type JobStartBriefingModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirmStart: () => void | Promise<void>;
  address: string;
  notes: string | null | undefined;
  bookingAddonSnapshots?: Array<{ titleSnapshot: string; priceSnapshotCents: number }>;
  loading?: boolean;
};

/**
 * Shown before the pro transitions to in_progress — recap address + scope/notes.
 */
export function JobStartBriefingModal({
  open,
  onClose,
  onConfirmStart,
  address,
  notes,
  bookingAddonSnapshots,
  loading = false,
}: JobStartBriefingModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-briefing-title"
        className="w-full max-w-lg max-h-[min(90vh,640px)] overflow-y-auto rounded-2xl border border-border bg-[hsl(var(--surface))] shadow-xl"
      >
        <div className="p-5 sm:p-6 space-y-4">
          <h2 id="job-briefing-title" className="text-lg font-semibold text-text">
            Ready to start?
          </h2>
          <p className="text-sm text-muted">
            Confirm what you&apos;re about to do. This matches what the customer booked.
          </p>

          <div className="rounded-xl border border-border bg-surface2/50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">Service address</p>
            <p className="text-sm font-medium text-text">{address?.trim() || '—'}</p>
          </div>

          <ProBookingJobNotes notes={notes} bookingAddonSnapshots={bookingAddonSnapshots} />

          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-full sm:flex-1 h-11 rounded-full border border-border text-sm font-medium text-text hover:bg-hover disabled:opacity-50"
            >
              Not yet
            </button>
            <button
              type="button"
              onClick={() => void onConfirmStart()}
              disabled={loading}
              className="w-full sm:flex-1 h-11 rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95 disabled:opacity-70"
            >
              {loading ? 'Starting…' : 'Start job'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
