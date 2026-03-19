'use client';

import { useState, useCallback, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/cn';

const REASON_OPTIONS: { value: string; label: string }[] = [
  { value: 'customer_change_plans', label: 'Booked by mistake / Need different time' },
  { value: 'other', label: 'Found another pro' },
  { value: 'other', label: 'Issue with price or scope' },
  { value: 'other', label: 'Other' },
];

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export interface CancelBookingModalProps {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  amountDeposit?: number | null;
  onSuccess?: () => void;
}

export function CancelBookingModal({
  open,
  onClose,
  bookingId,
  amountDeposit = 0,
  onSuccess,
}: CancelBookingModalProps) {
  const [step, setStep] = useState<'reason' | 'confirm'>('reason');
  const [reason, setReason] = useState('customer_change_plans');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [preview, setPreview] = useState<{
    refundType: string;
    refundAmountCents: number;
    explanation: string;
    manualReviewRequired: boolean;
  } | null>(null);

  const fetchPreview = useCallback(async () => {
    try {
      const res = await fetch(`/api/customer/bookings/${bookingId}/cancel-preview?reason=${encodeURIComponent(reason)}`);
      const data = await res.json();
      if (res.ok) setPreview(data);
      else setPreview({ refundType: 'none', refundAmountCents: 0, explanation: 'Unable to preview', manualReviewRequired: true });
    } catch {
      setPreview({ refundType: 'none', refundAmountCents: 0, explanation: 'Unable to preview', manualReviewRequired: true });
    }
  }, [bookingId, reason]);

  useEffect(() => {
    if (open) {
      setStep('reason');
      setReason('customer_change_plans');
      setNote('');
      setError(null);
      setSuccess(false);
      setPreview(null);
    }
  }, [open]);

  useEffect(() => {
    if (open && step === 'confirm') void fetchPreview();
  }, [open, step, fetchPreview]);

  const handleContinueToConfirm = useCallback(() => {
    setStep('confirm');
    setError(null);
  }, []);

  const handleBack = useCallback(() => {
    setStep('reason');
    setError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason_code: reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Failed to cancel booking.');
        setLoading(false);
        return;
      }
      setSuccess(true);
      onSuccess?.();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [bookingId, reason, onSuccess]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  if (!open) return null;

  const refundLabel =
    preview?.refundType === 'full' && (preview?.refundAmountCents ?? 0) > 0
      ? `Full refund: ${formatCents(preview.refundAmountCents)}`
      : preview?.refundType === 'partial' && (preview?.refundAmountCents ?? 0) > 0
        ? `Partial refund: ${formatCents(preview.refundAmountCents)}`
        : (preview?.refundAmountCents ?? 0) > 0
          ? formatCents(preview?.refundAmountCents ?? 0)
          : 'No refund';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-title"
      aria-describedby="cancel-desc"
      onKeyDown={handleKeyDown}
    >
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={cn(
          'relative w-full max-w-md max-h-[90vh] overflow-y-auto',
          'rounded-t-2xl sm:rounded-2xl border-t sm:border border-black/10 dark:border-white/10',
          'bg-white dark:bg-[#171A20] shadow-xl',
          'animate-in slide-in-from-bottom sm:slide-in-from-bottom-4 sm:zoom-in-95'
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] px-5 py-4">
          <h2 id="cancel-title" className="text-lg font-semibold text-[#111111] dark:text-[#F5F7FA]">
            Cancel booking
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#6A6A6A] hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#058954]/50"
            aria-label="Close"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {success ? (
            <div className="rounded-xl border border-[#058954]/30 bg-[#058954]/10 dark:bg-[#058954]/20 p-4">
              <p className="font-medium text-[#058954]">Booking cancelled</p>
              <p className="mt-1 text-sm text-[#6A6A6A] dark:text-[#A1A8B3]">
                {preview?.refundAmountCents ? `Refund of ${formatCents(preview.refundAmountCents)} will be processed.` : 'No refund applies.'}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 w-full h-11 rounded-full text-sm font-semibold text-white bg-[#058954] hover:bg-[#047a48] transition-colors"
              >
                Done
              </button>
            </div>
          ) : step === 'reason' ? (
            <>
              <p id="cancel-desc" className="text-sm text-[#6A6A6A] dark:text-[#A1A8B3]">
                Cancelling is permanent. Refund depends on timing and our policy.
              </p>
              <div>
                <label htmlFor="cancel-reason" className="block text-sm font-medium text-[#111111] dark:text-[#F5F7FA] mb-2">
                  Reason for cancelling
                </label>
                <select
                  id="cancel-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full h-11 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1D2128] px-4 text-[#111111] dark:text-[#F5F7FA] focus:outline-none focus:ring-2 focus:ring-[#058954]/50"
                >
                  {REASON_OPTIONS.map((o, i) => (
                    <option key={i} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="cancel-note" className="block text-sm font-medium text-[#111111] dark:text-[#F5F7FA] mb-2">
                  Note (optional)
                </label>
                <textarea
                  id="cancel-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Help us improve"
                  rows={2}
                  className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1D2128] px-4 py-3 text-[#111111] dark:text-[#F5F7FA] placeholder:text-[#8A8A8A] focus:outline-none focus:ring-2 focus:ring-[#058954]/50 resize-none"
                />
              </div>
              <button
                type="button"
                onClick={handleContinueToConfirm}
                className="w-full h-11 rounded-full text-sm font-semibold border-2 border-[#8A8A8A] text-[#6A6A6A] dark:text-[#A1A8B3] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                Continue
              </button>
            </>
          ) : (
            <>
              <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 flex gap-3">
                <AlertTriangle size={24} className="shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                <div>
                  <p className="font-medium text-[#111111] dark:text-[#F5F7FA]">Refund impact</p>
                  <p className="mt-1 text-sm text-[#6A6A6A] dark:text-[#A1A8B3]">
                    {preview?.explanation ?? 'Loading…'}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#111111] dark:text-[#F5F7FA]">
                    {refundLabel}
                  </p>
                  {preview?.manualReviewRequired && (
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                      May require manual review.
                    </p>
                  )}
                </div>
              </div>
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {error}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 h-11 rounded-full text-sm font-medium border border-black/15 dark:border-white/10 text-[#111111] dark:text-[#F5F7FA] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 h-11 rounded-full text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2"
                >
                  {loading ? 'Cancelling…' : 'Cancel booking'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
