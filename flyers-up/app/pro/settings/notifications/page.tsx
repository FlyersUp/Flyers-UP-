'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { getNotificationSettingsV2, updateNotificationSettingsV2 } from '@/lib/api';
import { TrustRow } from '@/components/ui/TrustRow';

type ProNotificationPrefs = {
  delivery: {
    email: boolean;
    push: boolean;
  };
  alerts: {
    new_booking_requests: boolean;
    job_reminders: boolean;
    payment_released: boolean;
    disputes_opened: boolean;
    promotions_tips: boolean;
    messages: boolean;
  };
};

function getDefaultPrefs(): ProNotificationPrefs {
  return {
    delivery: { email: true, push: true },
    alerts: {
      new_booking_requests: true,
      job_reminders: true,
      payment_released: true,
      disputes_opened: true,
      promotions_tips: false,
      messages: true,
    },
  };
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 border border-border rounded-lg bg-surface">
      <div className="min-w-0">
        <h3 className="font-medium text-text">{title}</h3>
        <p className="text-sm text-muted">{description}</p>
      </div>

      <button
        type="button"
        aria-pressed={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors border border-border ${
          checked ? 'bg-accent' : 'bg-surface2'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-surface transition-transform shadow ${
            checked ? 'translate-x-[20px]' : 'translate-x-[2px]'
          }`}
        />
      </button>
    </div>
  );
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

        const server = await getNotificationSettingsV2(user.id);
        setPrefs((prev) => ({
          ...prev,
          delivery: { email: server.delivery.email, push: server.delivery.push },
          alerts: {
            ...prev.alerts,
            new_booking_requests: server.alerts.new_booking_requests ?? server.new_booking,
            job_reminders: server.alerts.job_reminders ?? server.job_status_updates,
            payment_released: server.alerts.payment_released ?? prev.alerts.payment_released,
            disputes_opened: server.alerts.disputes_opened ?? prev.alerts.disputes_opened,
            messages: server.alerts.messages ?? server.messages,
            promotions_tips: server.alerts.promotions_tips ?? server.marketing_emails,
          },
        }));
      } catch (err) {
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
      const result = await updateNotificationSettingsV2(userId, {
        delivery: prefs.delivery,
        alerts: prefs.alerts,
        legacy: {
          new_booking: prefs.alerts.new_booking_requests,
          job_status_updates: prefs.alerts.job_reminders,
          messages: prefs.alerts.messages,
          marketing_emails: prefs.alerts.promotions_tips,
        },
      });

      if (!result.success) {
        setError(result.error || 'Failed to save notification settings.');
        return;
      }

      setSuccess('Notification settings saved.');
    } catch (err) {
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
          <div className="p-4 bg-success/15 border border-success/30 rounded-lg text-text">
            {success}
          </div>
        )}
        {error && (
          <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg text-text">
            {error}
          </div>
        )}

        <Card withRail>
          <Label>DELIVERY</Label>
          <div className="mt-4 space-y-3">
            <ToggleRow
              title="Email"
              description="Receive notifications by email."
              checked={prefs.delivery.email}
              onChange={(next) => setPrefs((p) => ({ ...p, delivery: { ...p.delivery, email: next } }))}
            />
            <ToggleRow
              title="Push"
              description="Receive push notifications on your device (when enabled)."
              checked={prefs.delivery.push}
              onChange={(next) => setPrefs((p) => ({ ...p, delivery: { ...p.delivery, push: next } }))}
            />
          </div>
        </Card>

        <Card withRail>
          <Label>WHAT ALERTS I RECEIVE</Label>
          <div className="mt-4 space-y-3">
            <ToggleRow
              title="New booking requests"
              description="Get alerted when a customer requests a booking."
              checked={prefs.alerts.new_booking_requests}
              onChange={(next) =>
                setPrefs((p) => ({ ...p, alerts: { ...p.alerts, new_booking_requests: next } }))
              }
            />
            <ToggleRow
              title="Job reminders"
              description="Reminders before scheduled jobs and key status updates."
              checked={prefs.alerts.job_reminders}
              onChange={(next) => setPrefs((p) => ({ ...p, alerts: { ...p.alerts, job_reminders: next } }))}
            />
            <ToggleRow
              title="Payment released"
              description="Alerts when a payout is released or changes."
              checked={prefs.alerts.payment_released}
              onChange={(next) =>
                setPrefs((p) => ({ ...p, alerts: { ...p.alerts, payment_released: next } }))
              }
            />
            <ToggleRow
              title="Disputes opened"
              description="Alerts when a dispute is opened or updated."
              checked={prefs.alerts.disputes_opened}
              onChange={(next) =>
                setPrefs((p) => ({ ...p, alerts: { ...p.alerts, disputes_opened: next } }))
              }
            />
            <ToggleRow
              title="Promotions / tips"
              description="Occasional product updates, promos, and best-practice tips."
              checked={prefs.alerts.promotions_tips}
              onChange={(next) =>
                setPrefs((p) => ({ ...p, alerts: { ...p.alerts, promotions_tips: next } }))
              }
            />
            <ToggleRow
              title="Messages"
              description="Alerts when you receive a new message from a customer."
              checked={prefs.alerts.messages}
              onChange={(next) => setPrefs((p) => ({ ...p, alerts: { ...p.alerts, messages: next } }))}
            />
          </div>
        </Card>

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={handleSave}
            disabled={!canSave || saving}
            showArrow={false}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}

