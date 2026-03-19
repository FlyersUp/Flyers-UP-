'use client';

/**
 * Report Issue Modal
 * Reusable modal/sheet for submitting bug reports from error pages, not-found, etc.
 * Collects user note and auto-attaches debugging context (pathname, URL, user, etc.).
 * Easy to extend later for admin support tooling.
 */

import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { submitBugReport } from '@/app/actions/bugReports';
import { cn } from '@/lib/cn';

export interface ReportIssueContext {
  errorMessage?: string | null;
  errorDigest?: string | null;
  stack?: string | null;
  errorType?: string | null;
}

export interface ReportIssueModalProps {
  open: boolean;
  onClose: () => void;
  /** Pre-filled context from error boundary or not-found */
  context?: ReportIssueContext | null;
  /** Optional variant: 'modal' (centered) or 'sheet' (bottom) */
  variant?: 'modal' | 'sheet';
  /** Optional class for the trigger/container */
  className?: string;
}

function getViewport(): string {
  if (typeof window === 'undefined') return '';
  return `${window.innerWidth}x${window.innerHeight}`;
}

function getAppVersion(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    (typeof (window as unknown as { __NEXT_DATA__?: { buildId?: string } }).__NEXT_DATA__?.buildId === 'string'
      ? (window as unknown as { __NEXT_DATA__?: { buildId?: string } }).__NEXT_DATA__?.buildId
      : null) ?? null
  );
}

function collectContext(extra?: ReportIssueContext | null) {
  const base = typeof window === 'undefined'
    ? { pathname: '', fullUrl: '', userAgent: '', viewport: '', referrer: '', appVersion: null as string | null }
    : {
        pathname: window.location.pathname,
        fullUrl: window.location.href,
        userAgent: navigator.userAgent,
        viewport: getViewport(),
        referrer: document.referrer || '',
        appVersion: getAppVersion(),
      };
  return {
    ...base,
    errorType: extra?.errorType ?? null,
    errorMessage: extra?.errorMessage ?? null,
    errorDigest: extra?.errorDigest ?? null,
    stack: extra?.stack ?? null,
  };
}

export function ReportIssueModal({
  open,
  onClose,
  context,
  variant = 'modal',
}: ReportIssueModalProps) {
  const [userNote, setUserNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ referenceId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setUserNote('');
      setResult(null);
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
    const first = focusables[0];
    first?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const ctx = collectContext(context);
      const res = await submitBugReport({
        userNote: userNote.trim() || null,
        pathname: ctx.pathname,
        fullUrl: ctx.fullUrl,
        errorType: ctx.errorType ?? null,
        errorMessage: ctx.errorMessage ?? null,
        errorDigest: ctx.errorDigest ?? null,
        stack: ctx.stack ?? null,
        userAgent: ctx.userAgent,
        viewport: ctx.viewport,
        referrer: ctx.referrer,
      });
      if (res.ok) {
        setResult({ referenceId: res.referenceId });
      } else {
        setError(res.error);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const panelClasses = cn(
    'bg-[#F5F5F5] dark:bg-[#171A20] rounded-2xl border border-black/10 dark:border-white/10 shadow-xl p-6 max-w-md w-full max-h-[90vh] overflow-auto',
    variant === 'sheet' && 'rounded-t-2xl rounded-b-none pb-[env(safe-area-inset-bottom)]'
  );

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 dark:bg-black/50 p-4"
      style={variant === 'sheet' ? { alignItems: 'flex-end' } : undefined}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-issue-title"
    >
      <div
        ref={panelRef}
        className={panelClasses}
        onClick={(e) => e.stopPropagation()}
        style={variant === 'sheet' ? { maxHeight: '85vh' } : undefined}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="report-issue-title" className="text-lg font-semibold text-[#111111] dark:text-[#F5F7FA]">
            Report Issue
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-[#6A6A6A] dark:text-[#A1A8B3] transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {result ? (
          <div className="py-4">
            <p className="text-[#111111] dark:text-[#F5F7FA] font-medium">
              Thanks — your report was sent.
            </p>
            <p className="mt-2 text-sm text-[#6A6A6A] dark:text-[#A1A8B3]">
              Reference: <code className="font-mono text-xs bg-black/5 dark:bg-white/10 px-2 py-1 rounded">{result.referenceId}</code>
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full h-11 rounded-full text-sm font-semibold bg-accent text-accentContrast hover:opacity-95 transition-opacity"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="report-note" className="block text-sm font-medium text-[#3A3A3A] dark:text-[#A1A8B3] mb-2">
                What were you trying to do?
              </label>
              <textarea
                id="report-note"
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
                placeholder="Describe what happened..."
                rows={4}
                className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1D2128] px-4 py-3 text-[#111111] dark:text-[#F5F7FA] placeholder:text-[#6A6A6A] dark:placeholder:text-[#A1A8B3] focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
                disabled={loading}
              />
            </div>
            {error && (
              <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-sm text-danger">
                {error}
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 h-11 rounded-full text-sm font-semibold bg-accent text-accentContrast hover:opacity-95 disabled:opacity-60 transition-all"
              >
                {loading ? 'Sending…' : 'Send Report'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="h-11 px-5 rounded-full text-sm font-medium border border-black/15 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
