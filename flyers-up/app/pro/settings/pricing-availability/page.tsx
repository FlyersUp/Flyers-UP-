'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getCurrentUser, getProPricingSettings, updateProPricingSettings } from '@/lib/api';
import { TrustRow } from '@/components/ui/TrustRow';
import { ProAccessNotice } from '@/components/ui/ProAccessNotice';
import { ToggleRow } from '@/components/ui/ToggleRow';

export default function ProPricingAvailabilitySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [access, setAccess] = useState<'signed_out' | 'not_pro' | 'pro'>('signed_out');

  const [hourlyPricing, setHourlyPricing] = useState(false);
  const [travelFeeEnabled, setTravelFeeEnabled] = useState(false);
  const [minimumJobPrice, setMinimumJobPrice] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
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
      const s = await getProPricingSettings(user.id);
      setHourlyPricing(s.hourlyPricing);
      setTravelFeeEnabled(s.travelFeeEnabled);
      setMinimumJobPrice(s.minimumJobPrice != null ? String(s.minimumJobPrice) : '');
      setLoading(false);
    };
    void load();
  }, []);

  async function save() {
    if (!userId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    const min = minimumJobPrice.trim() === '' ? null : Number(minimumJobPrice);
    if (min !== null && (Number.isNaN(min) || min < 0)) {
      setError('Minimum job price must be a positive number.');
      setSaving(false);
      return;
    }

    const res = await updateProPricingSettings(userId, {
      hourlyPricing,
      travelFeeEnabled,
      minimumJobPrice: min,
    });
    if (!res.success) setError(res.error || 'Failed to save pricing settings.');
    else setSuccess('Pricing settings saved.');
    setSaving(false);
  }

  return (
    <AppLayout mode="pro">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div>
          <Link href="/pro/settings" className="text-sm text-muted hover:text-text">
            ← Back to Settings
          </Link>
          <h1 className="text-2xl font-semibold text-text mt-3">Pricing &amp; Availability</h1>
          <p className="text-muted mt-1">How and when you work.</p>
          <div className="mt-3">
            <TrustRow />
          </div>
        </div>

        {error && <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg text-text">{error}</div>}
        {success && (
          <div className="p-4 bg-surface2 border border-[var(--surface-border)] border-l-[3px] border-l-accent rounded-lg text-text">
            {success}
          </div>
        )}

        <Card withRail>
          <Label>HOW AND WHEN I WORK</Label>
          {loading ? (
            <p className="mt-4 text-sm text-muted/70">Loading…</p>
          ) : !userId ? (
            <ProAccessNotice nextHref="/pro/settings/pricing-availability" signedIn={access !== 'signed_out'} />
          ) : (
            <div className="mt-4 space-y-3">
              <ToggleRow
                title="Hourly pricing"
                description="Charge hourly instead of flat-rate (where supported)."
                checked={hourlyPricing}
                onChange={setHourlyPricing}
              />
              <ToggleRow
                title="Travel fee"
                description="Enable a travel fee toggle for bookings (coming next)."
                checked={travelFeeEnabled}
                onChange={setTravelFeeEnabled}
              />
              <Input
                label="Minimum job price"
                type="number"
                min="0"
                step="1"
                value={minimumJobPrice}
                onChange={(e) => setMinimumJobPrice(e.target.value)}
                placeholder="e.g., 75"
              />
              <p className="text-sm text-muted">
                Base prices per service + schedule availability live in{' '}
                <Link
                  href="/pro/settings/business"
                  className="text-text underline underline-offset-4 decoration-border hover:decoration-text"
                >
                  My Business
                </Link>.
              </p>
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/pro/settings/business" className="block">
            <Card withRail>
              <Label>PRICING &amp; SCHEDULE</Label>
              <p className="mt-3 text-sm text-muted">
                Configure pricing, services, and availability (current UI lives under My Business).
              </p>
            </Card>
          </Link>
          <Link href="/pro/addons" className="block">
            <Card withRail>
              <Label>ADD-ONS</Label>
              <p className="mt-3 text-sm text-muted">Upsells customers can add at checkout.</p>
            </Card>
          </Link>
        </div>

        <div className="flex justify-end">
          <Button type="button" onClick={() => void save()} disabled={!userId || saving || loading} showArrow={false}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}

