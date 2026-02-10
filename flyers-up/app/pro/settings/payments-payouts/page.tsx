'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { PlacardHeader } from '@/components/ui/PlacardHeader';
import { TrustRow } from '@/components/ui/TrustRow';
import { Button } from '@/components/ui/Button';
import {
  getCurrentUser,
  getProPayoutPreferences,
  updateProPayoutPreferences,
  type ProPayoutPreferences,
} from '@/lib/api';
import PaymentSettingsPage from '@/app/settings/payments/page';
import { ProAccessNotice } from '@/components/ui/ProAccessNotice';

export default function ProPaymentsPayoutsSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [access, setAccess] = useState<'signed_out' | 'not_pro' | 'pro'>('signed_out');

  const [prefs, setPrefs] = useState<ProPayoutPreferences>({
    payoutSchedule: 'weekly',
    showFeeBreakdown: true,
    showEscrowHoldback: true,
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      const user = await getCurrentUser();
      if (!user) {
        setAccess('signed_out');
        setUserId(null);
        setLoading(false);
        return;
      }
      if (user.role !== 'pro') {
        setAccess('not_pro');
        setUserId(null);
        setLoading(false);
        return;
      }
      setAccess('pro');
      setUserId(user.id);
      const p = await getProPayoutPreferences(user.id);
      setPrefs(p);
      setLoading(false);
    };
    void load();
  }, []);

  async function save() {
    if (!userId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    const res = await updateProPayoutPreferences(userId, prefs);
    if (!res.success) setError(res.error || 'Failed to save payout preferences.');
    else setSuccess('Payout preferences saved.');
    setSaving(false);
  }

  return (
    <AppLayout mode="pro">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div>
          <Link href="/pro/settings" className="text-sm text-muted hover:text-text">
            ← Back to Settings
          </Link>
          <div className="mt-3">
            <PlacardHeader title="Payments & Payouts" subtitle="Payout schedule, tax, and what you see in earnings." tone="primary" />
          </div>
          <div className="mt-3">
            <TrustRow />
          </div>
        </div>

        <Card withRail>
          <Label>HOW I GET PAID</Label>

          {error && <div className="mt-4 p-4 bg-danger/10 border border-danger/30 rounded-lg text-text">{error}</div>}
          {success && (
            <div className="mt-4 p-4 bg-surface2 border border-[var(--surface-border)] border-l-[3px] border-l-accent rounded-lg text-text">
              {success}
            </div>
          )}

          {loading ? (
            <p className="mt-4 text-sm text-muted/70">Loading…</p>
          ) : !userId ? (
            <ProAccessNotice nextHref="/pro/settings/payments-payouts" signedIn={access !== 'signed_out'} />
          ) : (
            <div className="mt-4 space-y-3">
              <div className="p-4 border border-border rounded-lg bg-surface">
                <h3 className="font-medium text-text">Payout schedule</h3>
                <p className="text-sm text-muted">Choose how often you want payouts sent.</p>
                <select
                  value={prefs.payoutSchedule}
                  onChange={(e) => setPrefs((p) => ({ ...p, payoutSchedule: e.target.value as any }))}
                  className="mt-3 w-full px-3 py-2 border border-border rounded-lg bg-surface text-text"
                >
                  <option value="instant">Instant</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>

              <button
                type="button"
                className="w-full text-left p-4 border border-border rounded-lg bg-surface hover:bg-surface2 transition-colors"
                onClick={() => setPrefs((p) => ({ ...p, showFeeBreakdown: !p.showFeeBreakdown }))}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium text-text">Fees breakdown</div>
                    <div className="text-sm text-muted">Show platform fee details in earnings.</div>
                  </div>
                  <div className="text-sm font-medium text-muted">{prefs.showFeeBreakdown ? 'On' : 'Off'}</div>
                </div>
              </button>

              <button
                type="button"
                className="w-full text-left p-4 border border-border rounded-lg bg-surface hover:bg-surface2 transition-colors"
                onClick={() => setPrefs((p) => ({ ...p, showEscrowHoldback: !p.showEscrowHoldback }))}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium text-text">Payment status visibility</div>
                    <div className="text-sm text-muted">Show booking payment status updates where available.</div>
                  </div>
                  <div className="text-sm font-medium text-muted">{prefs.showEscrowHoldback ? 'On' : 'Off'}</div>
                </div>
              </button>
            </div>
          )}
        </Card>

        <Card withRail>
          <Label>PAYOUT METHOD + TAX</Label>
          <div className="mt-4">
            <PaymentSettingsPage />
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="button" onClick={() => void save()} disabled={!userId || saving || loading} showArrow={false}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}

