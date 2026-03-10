'use client';

/**
 * Report user / Block user actions for content moderation.
 * Used on profiles and in conversation headers.
 */
import { useState } from 'react';

interface ReportUserBlockUserProps {
  targetUserId: string;
  targetDisplayName?: string;
  bookingId?: string;
  variant?: 'menu' | 'inline';
}

export function ReportUserBlockUser({
  targetUserId,
  targetDisplayName = 'this user',
  bookingId,
  variant = 'menu',
}: ReportUserBlockUserProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<'report' | 'block' | null>(null);

  const handleReport = async () => {
    setLoading('report');
    try {
      const res = await fetch('/api/users/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportedUserId: targetUserId,
          reason: 'other',
          context: bookingId ? `Booking: ${bookingId}` : undefined,
          bookingId: bookingId || undefined,
        }),
      });
      if (res.ok) {
        alert('Thanks for reporting. We\'ll look into it.');
        setOpen(false);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || 'Could not submit report.');
      }
    } catch {
      alert('Could not submit. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleBlock = async () => {
    if (!confirm(`Block ${targetDisplayName}? You won't see their messages or profile.`)) return;
    setLoading('block');
    try {
      const res = await fetch('/api/users/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockedUserId: targetUserId }),
      });
      if (res.ok) {
        alert('User blocked.');
        setOpen(false);
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

  if (variant === 'inline') {
    return (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleReport}
          disabled={!!loading}
          className="px-3 py-1.5 text-sm font-medium text-muted hover:text-text border border-border rounded-lg transition-colors disabled:opacity-50"
        >
          {loading === 'report' ? 'Reporting…' : 'Report'}
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
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg text-muted hover:text-text hover:bg-surface2 transition-colors"
        aria-label="More options"
      >
        <span className="text-lg">⋯</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-xl border border-border bg-surface shadow-lg py-1">
            <button
              type="button"
              onClick={handleReport}
              disabled={!!loading}
              className="w-full px-4 py-2 text-left text-sm text-text hover:bg-surface2 disabled:opacity-50"
            >
              {loading === 'report' ? 'Reporting…' : 'Report user'}
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
  );
}
