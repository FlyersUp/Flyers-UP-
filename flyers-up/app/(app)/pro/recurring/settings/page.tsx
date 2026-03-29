'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layouts/AppLayout';

export default function ProRecurringSettingsPage() {
  const [prefs, setPrefs] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch('/api/pro/recurring/preferences', { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok && j.preferences) setPrefs(j.preferences);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(patch: Record<string, unknown>) {
    const res = await fetch('/api/pro/recurring/preferences', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const j = await res.json();
    if (j.ok && j.preferences) setPrefs(j.preferences);
  }

  if (loading || !prefs) {
    return (
      <AppLayout mode="pro">
        <div className="max-w-xl mx-auto px-4 py-6 text-sm text-muted">Loading…</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout mode="pro">
      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        <Link href="/pro/recurring" className="text-sm text-muted hover:text-text">
          ← Recurring dashboard
        </Link>
        <h1 className="text-2xl font-semibold text-text">Recurring settings</h1>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={prefs.recurring_enabled !== false}
            onChange={(e) => void save({ recurring_enabled: e.target.checked })}
          />
          Recurring enabled
        </label>

        <label className="block text-sm">
          <span className="text-muted">Max recurring customers</span>
          <input
            type="number"
            min={0}
            max={100}
            value={Number(prefs.max_recurring_customers ?? 5)}
            onChange={(e) => void save({ max_recurring_customers: Number(e.target.value) })}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2"
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={prefs.only_preferred_clients_can_request === true}
            onChange={(e) => void save({ only_preferred_clients_can_request: e.target.checked })}
          />
          Only preferred clients can request recurring
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={prefs.allow_auto_approval_for_mutual_preference === true}
            onChange={(e) => void save({ allow_auto_approval_for_mutual_preference: e.target.checked })}
          />
          Auto-approve when mutual match + open slot (still respects conflicts & windows)
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={prefs.recurring_only_windows_enabled === true}
            onChange={(e) => void save({ recurring_only_windows_enabled: e.target.checked })}
          />
          Enforce recurring-only weekly windows
        </label>

        <p className="text-xs text-muted">
          Configure allowed occupations and time windows under the API routes{' '}
          <code className="font-mono">/api/pro/recurring/occupations</code> and{' '}
          <code className="font-mono">/api/pro/recurring/windows</code> (UI editor can be added next).
        </p>
      </div>
    </AppLayout>
  );
}
