'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { TrustRow } from '@/components/ui/TrustRow';
import { ToggleRow } from '@/components/ui/ToggleRow';

type ProNotificationPrefs = {
  booking_push: boolean;
  message_push: boolean;
  payment_push: boolean;
  payout_push: boolean;
  marketing_in_app: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
};

function getDefaultPrefs(): ProNotificationPrefs {
  return {
    booking_push: true,
    message_push: true,
    payment_push: true,
    payout_push: true,
    marketing_in_app: true,
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
  };
}

function timeToInputValue(t: string | null): string {
  if (!t) return '22:00';
  const [h, m] = t.split(':').map(Number);
  return `${String(h ?? 22).padStart(2, '0')}:${String(m ?? 0).padStart(2, '0')}`;
}

export default function ProNotificationSettingsPage() {
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [prefs, setPrefs] = useState<ProNotificationPrefs>(() => getDefaultPrefs());
  const canSave = useMemo(() => Boolean(userId), [userId]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingData(true);
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);

        const res = await fetch('/api/notifications/preferences');
        if (!res.ok) {
          setPrefs(getDefaultPrefs());
          return;
        }
        const data = await res.json();
        setPrefs({
          booking_push: data.booking_push ?? true,
          message_push: data.message_push ?? true,
          payment_push: data.payment_push ?? true,
          payout_push: data.payout_push ?? true,
          marketing_in_app: data.marketing_in_app ?? true,
          quiet_hours_enabled: data.quiet_hours_enabled ?? false,
          quiet_hours_start: timeToInputValue(data.quiet_hours_start),
          quiet_hours_end: timeToInputValue(data.quiet_hours_end),
        });
      } catch {
        setError('Failed to load notification settings.');
      } finally {
        setLoadingData(false);
      }
    };

    void load();
  }, []);

  async function handleSave() {
    if (!userId) return;
    setSaving(true);
    setSuccess(null);
    setError(null);

    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_push: prefs.booking_push,
          message_push: prefs.message_push,
          payment_push: prefs.payment_push,
          payout_push: prefs.payout_push,
          marketing_in_app: prefs.marketing_in_app,
          quiet_hours_enabled: prefs.quiet_hours_enabled,
          quiet_hours_start: prefs.quiet_hours_enabled ? prefs.quiet_hours_start : null,
          quiet_hours_end: prefs.quiet_hours_enabled ? prefs.quiet_hours_end : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError((err as { error?: string }).error || 'Failed to save notification settings.');
        return;
      }

      setSuccess('Notification settings saved.');
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  }

  if (loadingData) {
    return (
      <AppLayout mode="pro">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-muted/70">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout mode="pro">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div>
          <Link href="/pro/settings" className="text-sm text-muted hover:text-text">
            ← Back to Settings
          </Link>
          <h1 className="text-2xl font-semibold text-text mt-3">Notifications</h1>
          <p className="text-muted mt-1">Choose what alerts you receive and how.</p>
          <div className="mt-3">
            <TrustRow />
          </div>
        </div>

        {success && (
          <div className="p-4 bg-surface2 border border-[var(--surface-border)] border-l-[3px] border-l-accent rounded-lg text-text">
            {success}
          </div>
        )}
        {error && (
          <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg text-text">
            {error}
          </div>
        )}

        <Card withRail>
          <Label>PUSH NOTIFICATIONS</Label>
          <p className="text-sm text-muted mt-1">Control which events trigger push notifications.</p>
          <div className="mt-4 space-y-3">
            <ToggleRow
              title="Booking requests"
              description="New booking requests and key updates."
              checked={prefs.booking_push}
              onChange={(next) => setPrefs((p) => ({ ...p, booking_push: next }))}
            />
            <ToggleRow
              title="Messages"
              description="New messages from customers."
              checked={prefs.message_push}
              onChange={(next) => setPrefs((p) => ({ ...p, message_push: next }))}
            />
            <ToggleRow
              title="Payments"
              description="Deposit paid, balance due."
              checked={prefs.payment_push}
              onChange={(next) => setPrefs((p) => ({ ...p, payment_push: next }))}
            />
            <ToggleRow
              title="Payouts"
              description="Payout sent, payout failed."
              checked={prefs.payout_push}
              onChange={(next) => setPrefs((p) => ({ ...p, payout_push: next }))}
            />
            <ToggleRow
              title="Marketing in-app"
              description="Promos and tips in the notification feed."
              checked={prefs.marketing_in_app}
              onChange={(next) => setPrefs((p) => ({ ...p, marketing_in_app: next }))}
            />
          </div>
        </Card>

        <Card withRail>
          <Label>QUIET HOURS</Label>
          <p className="text-sm text-muted mt-1">Suppress push notifications during these hours.</p>
          <div className="mt-4 space-y-3">
            <ToggleRow
              title="Enable quiet hours"
              description="No push notifications during the selected time."
              checked={prefs.quiet_hours_enabled}
              onChange={(next) => setPrefs((p) => ({ ...p, quiet_hours_enabled: next }))}
            />
            {prefs.quiet_hours_enabled && (
              <div className="flex flex-wrap gap-4 items-center pt-2">
                <label className="flex items-center gap-2 text-sm text-text">
                  <span>From</span>
                  <input
                    type="time"
                    value={prefs.quiet_hours_start}
                    onChange={(e) => setPrefs((p) => ({ ...p, quiet_hours_start: e.target.value }))}
                    className="rounded-lg border border-border bg-surface px-3 py-2 text-text"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-text">
                  <span>To</span>
                  <input
                    type="time"
                    value={prefs.quiet_hours_end}
                    onChange={(e) => setPrefs((p) => ({ ...p, quiet_hours_end: e.target.value }))}
                    className="rounded-lg border border-border bg-surface px-3 py-2 text-text"
                  />
                </label>
              </div>
            )}
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="button" onClick={handleSave} disabled={!canSave || saving} showArrow={false}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
