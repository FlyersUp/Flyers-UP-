'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function AccountDeactivatedClient({ scheduledDeletionAt }: { scheduledDeletionAt: string | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deadlineLabel = scheduledDeletionAt
    ? new Date(scheduledDeletionAt).toLocaleString(undefined, {
        dateStyle: 'long',
        timeStyle: 'short',
      })
    : 'the scheduled date';

  async function reactivate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/account/reactivate', {
        method: 'POST',
        credentials: 'include',
      });
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string };
      if (!res.ok || !data.success) {
        setError(data.message || 'Could not reactivate.');
        setLoading(false);
        return;
      }
      router.replace('/');
      router.refresh();
    } catch {
      setError('Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  return (
    <div className="mx-auto max-w-md space-y-5 px-4 py-12 text-text">
      <h1 className="text-2xl font-semibold tracking-tight">Account deactivated</h1>
      <p className="text-sm text-muted leading-relaxed">
        Your profile is hidden, new bookings are disabled, and you won&apos;t appear in search. Financial and booking
        records stay on file as required by law and platform policy.
      </p>
      <p className="text-sm text-muted leading-relaxed">
        Permanent deletion is scheduled for <span className="font-medium text-text">{deadlineLabel}</span>. Before
        then, you can reactivate with one click.
      </p>
      {error ? (
        <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-text">{error}</div>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          disabled={loading}
          onClick={() => void reactivate()}
          className="btn-press rounded-lg bg-[hsl(var(--accent-customer))] px-4 py-2.5 text-sm font-semibold text-[hsl(var(--accent-contrast))] disabled:opacity-50"
        >
          {loading ? 'Working…' : 'Reactivate account'}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void signOut()}
          className="rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-muted hover:bg-surface2"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
