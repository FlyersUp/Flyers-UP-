'use client';

import { useState, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

const REASON_OPTIONS: { value: string; label: string }[] = [
  { value: 'customer_schedule', label: 'Need a different time' },
  { value: 'weather', label: 'Weather' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'other', label: 'Other' },
];

export interface RescheduleModalProps {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  currentDate?: string;
  currentTime?: string;
  onSuccess?: () => void;
}

export function RescheduleModal({
  open,
  onClose,
  bookingId,
  currentDate,
  currentTime,
  onSuccess,
}: RescheduleModalProps) {
  const [proposedDate, setProposedDate] = useState(currentDate ?? '');
  const [proposedTime, setProposedTime] = useState(currentTime ?? '');
  const [reason, setReason] = useState('customer_schedule');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      setProposedDate(currentDate ?? '');
      setProposedTime(currentTime ?? '');
      setReason('customer_schedule');
      setMessage('');
      setError(null);
      setSuccess(false);
    }
  }, [open, currentDate, currentTime]);

  const handleSubmit = useCallback(async () => {
    if (!proposedDate || !proposedTime) {
      setError('Please select a date and time.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposed_service_date: proposedDate,
          proposed_service_time: proposedTime,
          reason_code: reason,
          message: message.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Failed to submit reschedule request.');
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
  }, [bookingId, proposedDate, proposedTime, reason, message, onSuccess]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reschedule-title"
      aria-describedby="reschedule-desc"
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
          <h2 id="reschedule-title" className="text-lg font-semibold text-[#111111] dark:text-[#F5F7FA]">
            Reschedule booking
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
          <p id="reschedule-desc" className="text-sm text-[#6A6A6A] dark:text-[#A1A8B3]">
            This sends a <strong className="text-[#111111] dark:text-[#F5F7FA]">reschedule request</strong> to your pro.
            They must approve the new date and time. You can request up to one reschedule per booking.
          </p>

          {success ? (
            <div className="rounded-xl border border-[#058954]/30 bg-[#058954]/10 dark:bg-[#058954]/20 p-4">
              <p className="font-medium text-[#058954]">Request sent</p>
              <p className="mt-1 text-sm text-[#6A6A6A] dark:text-[#A1A8B3]">
                Your pro will review and respond. You&apos;ll get a notification when they do.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 w-full h-11 rounded-full text-sm font-semibold text-white bg-[#058954] hover:bg-[#047a48] transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="reschedule-date" className="block text-sm font-medium text-[#111111] dark:text-[#F5F7FA] mb-2">
                  New date
                </label>
                <input
                  id="reschedule-date"
                  type="date"
                  value={proposedDate}
                  onChange={(e) => setProposedDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  className="w-full h-11 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1D2128] px-4 text-[#111111] dark:text-[#F5F7FA] focus:outline-none focus:ring-2 focus:ring-[#058954]/50"
                />
              </div>
              <div>
                <label htmlFor="reschedule-time" className="block text-sm font-medium text-[#111111] dark:text-[#F5F7FA] mb-2">
                  New time
                </label>
                <input
                  id="reschedule-time"
                  type="time"
                  value={proposedTime}
                  onChange={(e) => setProposedTime(e.target.value)}
                  className="w-full h-11 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1D2128] px-4 text-[#111111] dark:text-[#F5F7FA] focus:outline-none focus:ring-2 focus:ring-[#058954]/50"
                />
              </div>
              <div>
                <label htmlFor="reschedule-reason" className="block text-sm font-medium text-[#111111] dark:text-[#F5F7FA] mb-2">
                  Reason
                </label>
                <select
                  id="reschedule-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full h-11 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1D2128] px-4 text-[#111111] dark:text-[#F5F7FA] focus:outline-none focus:ring-2 focus:ring-[#058954]/50"
                >
                  {REASON_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="reschedule-message" className="block text-sm font-medium text-[#111111] dark:text-[#F5F7FA] mb-2">
                  Note to pro (optional)
                </label>
                <textarea
                  id="reschedule-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g. I have a conflict that day"
                  rows={2}
                  className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1D2128] px-4 py-3 text-[#111111] dark:text-[#F5F7FA] placeholder:text-[#8A8A8A] focus:outline-none focus:ring-2 focus:ring-[#058954]/50 resize-none"
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {error}
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 h-11 rounded-full text-sm font-medium border border-black/15 dark:border-white/10 text-[#111111] dark:text-[#F5F7FA] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 h-11 rounded-full text-sm font-semibold text-white bg-[#058954] hover:bg-[#047a48] disabled:opacity-60 transition-colors focus:outline-none focus:ring-2 focus:ring-[#058954]/50 focus:ring-offset-2"
                >
                  {loading ? 'Sending…' : 'Send request'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
