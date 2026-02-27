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
import { ToggleRow } from '@/components/ui/ToggleRow';

type CustomerNotificationPrefs = {
  delivery: {
    email: boolean;
    push: boolean;
  };
  alerts: {
    booking_confirmations: boolean;
    pro_arrival: boolean;
    job_completion: boolean;
    payment_receipts: boolean;
    dispute_updates: boolean;
    promotions: boolean;
  };
};

function getDefaultPrefs(): CustomerNotificationPrefs {
  return {
    delivery: { email: true, push: true },
    alerts: {
      booking_confirmations: true,
      pro_arrival: true,
      job_completion: true,
      payment_receipts: true,
      dispute_updates: true,
      promotions: false,
    },
  };
}

export default function CustomerNotificationSettingsPage() {
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [prefs, setPrefs] = useState<CustomerNotificationPrefs>(() => getDefaultPrefs());
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
          delivery: {
            email: server.delivery.email,
            push: server.delivery.push,
          },
          alerts: {
            ...prev.alerts,
            booking_confirmations: server.alerts.booking_confirmations ?? server.new_booking,
            pro_arrival: server.alerts.pro_arrival ?? server.job_status_updates,
            job_completion: server.alerts.job_completion ?? server.job_status_updates,
            payment_receipts: server.alerts.payment_receipts ?? prev.alerts.payment_receipts,
            dispute_updates: server.alerts.dispute_updates ?? prev.alerts.dispute_updates,
            promotions: server.alerts.promotions ?? server.marketing_emails,
          },
        }));
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
      const result = await updateNotificationSettingsV2(userId, {
        delivery: prefs.delivery,
        alerts: prefs.alerts,
        legacy: {
          new_booking: prefs.alerts.booking_confirmations,
          job_status_updates: prefs.alerts.pro_arrival || prefs.alerts.job_completion,
          marketing_emails: prefs.alerts.promotions,
        },
      });

      if (!result.success) {
        setError(result.error || 'Failed to save notification settings.');
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
      <AppLayout mode="customer">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-muted/70">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div>
          <Link href="/customer/settings" className="text-sm text-muted hover:text-text">
            ← Back to Settings
          </Link>
          <h1 className="text-2xl font-semibold text-text mt-3">Notifications</h1>
          <p className="text-muted mt-1">Choose what you get notified about and how.</p>
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
          <Label>WHAT I GET NOTIFIED ABOUT</Label>
          <div className="mt-4 space-y-3">
            <ToggleRow
              title="Booking confirmations"
              description="Confirmation, reschedules, and key booking updates."
              checked={prefs.alerts.booking_confirmations}
              onChange={(next) =>
                setPrefs((p) => ({ ...p, alerts: { ...p.alerts, booking_confirmations: next } }))
              }
            />
            <ToggleRow
              title="Pro arrival"
              description="When your pro is on the way or arrives."
              checked={prefs.alerts.pro_arrival}
              onChange={(next) => setPrefs((p) => ({ ...p, alerts: { ...p.alerts, pro_arrival: next } }))}
            />
            <ToggleRow
              title="Job completion"
              description="When the job is marked complete and ready for review."
              checked={prefs.alerts.job_completion}
              onChange={(next) =>
                setPrefs((p) => ({ ...p, alerts: { ...p.alerts, job_completion: next } }))
              }
            />
            <ToggleRow
              title="Payment receipts"
              description="Receipts, refunds, and payment status updates."
              checked={prefs.alerts.payment_receipts}
              onChange={(next) =>
                setPrefs((p) => ({ ...p, alerts: { ...p.alerts, payment_receipts: next } }))
              }
            />
            <ToggleRow
              title="Dispute updates"
              description="Dispute status changes and claim updates."
              checked={prefs.alerts.dispute_updates}
              onChange={(next) =>
                setPrefs((p) => ({ ...p, alerts: { ...p.alerts, dispute_updates: next } }))
              }
            />
            <ToggleRow
              title="Promotions"
              description="Occasional promos, product updates, and tips."
              checked={prefs.alerts.promotions}
              onChange={(next) => setPrefs((p) => ({ ...p, alerts: { ...p.alerts, promotions: next } }))}
            />
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

