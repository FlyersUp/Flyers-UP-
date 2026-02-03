'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { PlacardHeader } from '@/components/ui/PlacardHeader';
import { TrustRow } from '@/components/ui/TrustRow';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getCurrentUser, getProSafetyComplianceSettings, updateProSafetyComplianceSettings } from '@/lib/api';
import { ProAccessNotice } from '@/components/ui/ProAccessNotice';

export default function ProSafetyComplianceSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [access, setAccess] = useState<'signed_out' | 'not_pro' | 'pro'>('signed_out');

  const [guidelinesAcknowledged, setGuidelinesAcknowledged] = useState(false);
  const [insuranceDocumentUrl, setInsuranceDocumentUrl] = useState('');

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
      const s = await getProSafetyComplianceSettings(user.id);
      setGuidelinesAcknowledged(s.guidelinesAcknowledged);
      setInsuranceDocumentUrl(s.insuranceDocumentUrl);
      setLoading(false);
    };
    void load();
  }, []);

  async function save() {
    if (!userId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    const res = await updateProSafetyComplianceSettings(userId, {
      guidelinesAcknowledged,
      insuranceDocumentUrl: insuranceDocumentUrl.trim(),
    });
    if (!res.success) setError(res.error || 'Failed to save safety & compliance settings.');
    else setSuccess('Safety & compliance settings saved.');
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
            <PlacardHeader title="Safety & Compliance" subtitle="Clear rules, clear proof, no surprises." tone="success" />
          </div>
          <div className="mt-3">
            <TrustRow />
          </div>
        </div>

        {error && <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg text-text">{error}</div>}
        {success && (
          <div className="p-4 bg-success/15 border border-success/30 rounded-lg text-text">{success}</div>
        )}

        <Card withRail>
          <Label>RULES AND PROTECTION</Label>
          {loading ? (
            <p className="mt-4 text-sm text-muted/70">Loading…</p>
          ) : !userId ? (
            <ProAccessNotice nextHref="/pro/settings/safety-compliance" signedIn={access !== 'signed_out'} />
          ) : (
            <div className="mt-4 space-y-3">
              <button
                type="button"
                className="w-full text-left p-4 border border-border rounded-lg bg-surface hover:bg-surface2 transition-colors"
                onClick={() => setGuidelinesAcknowledged((v) => !v)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium text-text">Community guidelines</div>
                    <div className="text-sm text-muted">Acknowledge the rules for safe, professional service.</div>
                  </div>
                  <div className="text-sm font-medium text-muted">{guidelinesAcknowledged ? 'Acknowledged' : 'Review'}</div>
                </div>
              </button>

              <Input
                label="Insurance document URL (optional)"
                value={insuranceDocumentUrl}
                onChange={(e) => setInsuranceDocumentUrl(e.target.value)}
                placeholder="https://..."
              />

              <div className="p-4 border border-border rounded-lg bg-surface">
                <div className="font-medium text-text">Background check status</div>
                <div className="text-sm text-muted">Coming next.</div>
              </div>

              <div className="p-4 border border-border rounded-lg bg-surface">
                <div className="font-medium text-text">Account warnings / strikes</div>
                <div className="text-sm text-muted">Coming next.</div>
              </div>
            </div>
          )}
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

