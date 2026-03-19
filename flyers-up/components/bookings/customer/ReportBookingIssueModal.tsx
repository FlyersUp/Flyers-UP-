'use client';

/**
 * Report Booking Issue Modal
 * For customers to report issues (work incomplete, wrong service, etc.) on a completed booking.
 * Uses POST /api/bookings/[bookingId]/issues.
 */

import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

const ISSUE_TYPES = [
  { value: 'work_incomplete', label: 'Work incomplete' },
  { value: 'wrong_service', label: 'Wrong service provided' },
  { value: 'pro_late', label: 'Pro was late' },
  { value: 'billing_problem', label: 'Billing problem' },
  { value: 'other', label: 'Other dispute' },
  { value: 'contact_support', label: 'Contact support' },
] as const;

export interface ReportBookingIssueModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  bookingId: string;
}

export function ReportBookingIssueModal({
  open,
  onClose,
  onSuccess,
  bookingId,
}: ReportBookingIssueModalProps) {
  const [issueType, setIssueType] = useState<string>('work_incomplete');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setIssueType('work_incomplete');
      setNotes('');
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusables[0]?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueType,
          notes: notes.trim() || undefined,
          description: (notes.trim() || 'Issue reported from booking flow.'),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to report issue');
        return;
      }
      onSuccess();
    } catch {
      setError('Failed to report issue');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-issue-title"
    >
      <div
        ref={panelRef}
        className={cn(
          'w-full max-w-md bg-white dark:bg-[#171A20] rounded-t-2xl sm:rounded-2xl shadow-xl',
          'max-h-[90vh] overflow-y-auto'
        )}
      >
        <div className="sticky top-0 bg-white dark:bg-[#171A20] border-b border-black/5 dark:border-white/10 px-4 py-3 flex items-center justify-between">
          <h2 id="report-issue-title" className="text-lg font-semibold text-[#111111] dark:text-[#F5F7FA]">
            Report an issue
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-sm text-[#6A6A6A] dark:text-[#A1A8B3]">
            Describe what went wrong. We&apos;ll review and get back to you.
          </p>
          <div>
            <label htmlFor="issue-type" className="block text-sm font-medium text-[#111111] dark:text-[#F5F7FA] mb-2">
              Issue type
            </label>
            <select
              id="issue-type"
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1D2128] text-[#111111] dark:text-[#F5F7FA] text-sm focus:outline-none focus:ring-2 focus:ring-[#058954]/50"
            >
              {ISSUE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="issue-notes" className="block text-sm font-medium text-[#111111] dark:text-[#F5F7FA] mb-2">
              Details (optional)
            </label>
            <textarea
              id="issue-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe what happened..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1D2128] text-[#111111] dark:text-[#F5F7FA] text-sm placeholder:text-[#6A6A6A] dark:placeholder:text-[#A1A8B3] focus:outline-none focus:ring-2 focus:ring-[#058954]/50 resize-none"
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
              className="flex-1 h-11 rounded-full text-sm font-medium border border-black/10 dark:border-white/10 text-[#111111] dark:text-[#F5F7FA] hover:bg-black/5 dark:hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 h-11 rounded-full text-sm font-semibold text-white bg-[#058954] hover:bg-[#047a48] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
