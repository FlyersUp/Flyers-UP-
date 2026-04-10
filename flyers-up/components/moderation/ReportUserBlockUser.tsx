'use client';

/**
 * Report user / Block user — report opens a reason + details modal; block is immediate with confirm.
 */
import { useState } from 'react';
import { USER_REPORT_REASONS } from '@/lib/moderation/report-reasons';

interface ReportUserBlockUserProps {
  targetUserId: string;
  targetDisplayName?: string;
  bookingId?: string;
  variant?: 'menu' | 'inline';
  /** When set, replaces default classes for the ⋯ menu trigger (menu variant only). */
  menuTriggerClassName?: string;
}

const defaultMenuTriggerClass =
  'h-8 w-8 shrink-0 flex items-center justify-center rounded-full p-0 text-muted hover:text-text hover:bg-black/5 dark:hover:bg-white/10 transition-colors';

export function ReportUserBlockUser({
  targetUserId,
  targetDisplayName = 'this user',
  bookingId,
  variant = 'menu',
  menuTriggerClassName,
}: ReportUserBlockUserProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState<string>('other');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState<'report' | 'block' | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  const closeReport = () => {
    setReportOpen(false);
    setReportError(null);
    setDetails('');
    setReason('other');
  };

  const submitReport = async () => {
    setLoading('report');
    setReportError(null);
    try {
      const contextParts: string[] = [];
      if (details.trim()) contextParts.push(details.trim());
      if (bookingId) contextParts.push(`Booking: ${bookingId}`);
      const res = await fetch('/api/users/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportedUserId: targetUserId,
          reason,
          context: contextParts.length ? contextParts.join('\n\n') : undefined,
          bookingId: bookingId || undefined,
        }),
      });
      if (res.ok) {
        alert("Thanks for reporting. We'll review it.");
        closeReport();
        setMenuOpen(false);
      } else {
        const data = await res.json().catch(() => ({}));
        setReportError(data?.error || 'Could not submit report.');
      }
    } catch {
      setReportError('Could not submit. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleBlock = async () => {
    if (
      !confirm(
        `Block ${targetDisplayName}?\n\nBlocking is separate from reporting them to Flyers Up. While blocked, you won’t send them new messages in chat where blocking is enforced; other areas may still improve over time. You can unblock from the banner in chat.`
      )
    )
      return;
    setLoading('block');
    try {
      const res = await fetch('/api/users/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockedUserId: targetUserId }),
      });
      if (res.ok) {
        alert('User blocked.');
        setMenuOpen(false);
        window.location.reload();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || 'Could not block user.');
      }
    } catch {
      alert('Could not block. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const openReportModal = () => {
    setReportOpen(true);
    setMenuOpen(false);
  };

  const reportModal = reportOpen ? (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={() => !loading && closeReport()}
      />
      <div className="relative z-[201] w-full max-w-md rounded-2xl border border-border bg-surface p-4 shadow-xl">
        <h3 className="text-lg font-semibold text-text">Report {targetDisplayName}</h3>
        <p className="mt-1 text-sm text-muted">
          This sends a moderation report for our team to review. It does <span className="font-medium text-text">not</span>{' '}
          automatically block them — use Block separately if you want to stop messaging them where the app supports it.
          False reports may affect your account. We do not guarantee a specific outcome or timeline.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="report-reason" className="block text-sm font-medium text-text mb-1">
              Reason
            </label>
            <select
              id="report-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-text"
            >
              {USER_REPORT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="report-details" className="block text-sm font-medium text-text mb-1">
              Details <span className="text-muted font-normal">(optional)</span>
            </label>
            <textarea
              id="report-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="What happened? Include relevant messages or context."
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-text"
            />
          </div>
        </div>

        {reportError ? <p className="mt-2 text-sm text-red-600">{reportError}</p> : null}

        <div className="mt-4 flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => !loading && closeReport()}
            className="px-4 py-2 text-sm font-medium text-muted hover:text-text"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!!loading}
            onClick={() => void submitReport()}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-accent text-accentContrast disabled:opacity-50"
          >
            {loading === 'report' ? 'Submitting…' : 'Submit report'}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  if (variant === 'inline') {
    return (
      <>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={openReportModal}
            disabled={!!loading}
            className="px-3 py-1.5 text-sm font-medium text-muted hover:text-text border border-border rounded-lg transition-colors disabled:opacity-50"
          >
            Report
          </button>
          <button
            type="button"
            onClick={handleBlock}
            disabled={!!loading}
            className="px-3 py-1.5 text-sm font-medium text-danger hover:opacity-90 border border-border rounded-lg transition-colors disabled:opacity-50"
          >
            {loading === 'block' ? 'Blocking…' : 'Block'}
          </button>
        </div>
        {reportModal}
      </>
    );
  }

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className={menuTriggerClassName ?? defaultMenuTriggerClass}
          aria-label="More options"
        >
          <span className="text-lg leading-none" aria-hidden>
            ⋯
          </span>
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} aria-hidden />
            <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-xl border border-border bg-surface shadow-lg py-1">
              <button
                type="button"
                onClick={openReportModal}
                disabled={!!loading}
                className="w-full px-4 py-2 text-left text-sm text-text hover:bg-surface2 disabled:opacity-50"
              >
                Report user
              </button>
              <button
                type="button"
                onClick={handleBlock}
                disabled={!!loading}
                className="w-full px-4 py-2 text-left text-sm text-danger hover:bg-surface2 disabled:opacity-50"
              >
                {loading === 'block' ? 'Blocking…' : 'Block user'}
              </button>
            </div>
          </>
        )}
      </div>
      {reportModal}
    </>
  );
}
