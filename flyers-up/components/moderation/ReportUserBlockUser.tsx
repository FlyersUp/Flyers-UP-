'use client';

/**
 * Report user / Block user — report opens a reason + details modal; block is immediate with confirm.
 * Block state: viewer → target via `blocked_users` / useYouBlockedOtherUser (RLS + /api/users/block).
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { USER_REPORT_REASONS } from '@/lib/moderation/report-reasons';
import { useYouBlockedOtherUser, type YouBlockedOtherUserState } from '@/hooks/useYouBlockedOtherUser';
import { blockMenuItemLabel, blockMenuItemPendingLabel } from '@/lib/messaging/block-relationship-ui';

interface ReportUserBlockUserProps {
  targetUserId: string;
  targetDisplayName?: string;
  bookingId?: string;
  variant?: 'menu' | 'inline';
  /** When set, replaces default classes for the ⋯ menu trigger (menu variant only). */
  menuTriggerClassName?: string;
  /**
   * When set, block/unblock UI uses this state (e.g. share one hook with a parent “Blocked” badge).
   * When omitted, fetches via useYouBlockedOtherUser(targetUserId).
   */
  blockRelationship?: YouBlockedOtherUserState;
}

const defaultMenuTriggerClass =
  'h-8 w-8 shrink-0 flex items-center justify-center rounded-full p-0 text-muted hover:text-text hover:bg-black/5 dark:hover:bg-white/10 transition-colors';

export function ReportUserBlockUser({
  targetUserId,
  targetDisplayName = 'this user',
  bookingId,
  variant = 'menu',
  menuTriggerClassName,
  blockRelationship: blockRelationshipProp,
}: ReportUserBlockUserProps) {
  const router = useRouter();
  const internalBlock = useYouBlockedOtherUser(blockRelationshipProp ? null : targetUserId);
  const rel = blockRelationshipProp ?? internalBlock;

  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState<string>('other');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState<'report' | 'block' | 'unblock' | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  /** Optimistic override; null = follow `rel.youBlocked`. */
  const [optimisticBlocked, setOptimisticBlocked] = useState<boolean | null>(null);

  const statusLoading = rel.loading;
  /** Displayed block state (optimistic while mutating). */
  const displayBlocked = optimisticBlocked !== null ? optimisticBlocked : rel.youBlocked;
  const blockBusy = loading === 'block' || loading === 'unblock';

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
        credentials: 'include',
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
        `Block ${targetDisplayName}?\n\nBlocking is separate from reporting them to Flyers Up. While blocked, you won’t send them new messages in chat where blocking is enforced; other areas may still improve over time. You can unblock from this menu or from the banner in chat.`
      )
    )
      return;
    setOptimisticBlocked(true);
    setLoading('block');
    try {
      const ok = await rel.block();
      if (!ok) {
        setOptimisticBlocked(null);
        await rel.refetch();
        alert('Could not block user.');
        return;
      }
      await rel.refetch();
      setOptimisticBlocked(null);
      setMenuOpen(false);
      router.refresh();
    } catch {
      setOptimisticBlocked(null);
      void rel.refetch();
      alert('Could not block. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleUnblock = async () => {
    if (
      !confirm(
        `Unblock ${targetDisplayName}?\n\nThey will be able to message you again where the app allows it.`
      )
    )
      return;
    setOptimisticBlocked(false);
    setLoading('unblock');
    try {
      const ok = await rel.unblock();
      if (!ok) {
        setOptimisticBlocked(null);
        await rel.refetch();
        alert('Could not unblock user.');
        return;
      }
      await rel.refetch();
      setOptimisticBlocked(null);
      setMenuOpen(false);
      router.refresh();
    } catch {
      setOptimisticBlocked(null);
      void rel.refetch();
      alert('Could not unblock. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleBlockOrUnblock = () => {
    if (displayBlocked) void handleUnblock();
    else void handleBlock();
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

  const blockButtonDisabled = !!loading || statusLoading || blockBusy;
  const blockButtonLabel =
    loading === 'unblock'
      ? blockMenuItemPendingLabel(true)
      : loading === 'block'
        ? blockMenuItemPendingLabel(false)
        : blockMenuItemLabel(displayBlocked);

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
            onClick={() => void handleBlockOrUnblock()}
            disabled={blockButtonDisabled}
            className="px-3 py-1.5 text-sm font-medium text-danger hover:opacity-90 border border-border rounded-lg transition-colors disabled:opacity-50"
          >
            {loading === 'unblock'
              ? 'Unblocking…'
              : loading === 'block'
                ? 'Blocking…'
                : displayBlocked
                  ? 'Unblock'
                  : 'Block'}
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
                onClick={() => void handleBlockOrUnblock()}
                disabled={blockButtonDisabled}
                className="w-full px-4 py-2 text-left text-sm text-danger hover:bg-surface2 disabled:opacity-50"
              >
                {blockButtonLabel}
              </button>
            </div>
          </>
        )}
      </div>
      {reportModal}
    </>
  );
}
