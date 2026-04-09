'use client';

import { useState } from 'react';

const STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'dismissed', label: 'Dismissed' },
] as const;

interface AdminUserReportPanelProps {
  reportId: string;
  initialStatus: string;
  initialAdminNotes: string | null;
}

export function AdminUserReportPanel({
  reportId,
  initialStatus,
  initialAdminNotes,
}: AdminUserReportPanelProps) {
  const [status, setStatus] = useState(initialStatus);
  const [adminNotes, setAdminNotes] = useState(initialAdminNotes ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/user-reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          admin_notes: adminNotes.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Save failed');
        return;
      }
      setMessage('Saved.');
    } catch {
      setError('Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-6 p-4 rounded-lg border border-border bg-surface2 space-y-4">
      <h2 className="text-sm font-semibold text-text">Moderation</h2>
      <div>
        <label className="block text-xs font-medium text-muted mb-1">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full max-w-xs px-3 py-2 rounded-lg bg-surface border border-border text-text text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-muted mb-1">Internal notes</label>
        <textarea
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          rows={5}
          className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-text text-sm placeholder:text-muted/70"
          placeholder="Team-only notes…"
        />
      </div>
      {message ? <p className="text-sm text-accent">{message}</p> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  );
}
