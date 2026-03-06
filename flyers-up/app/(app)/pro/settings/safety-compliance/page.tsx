'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { SectionHeader } from '@/components/settings/SectionHeader';
import { TrustStatusSummary } from '@/components/settings/TrustStatusSummary';
import { StatusChip } from '@/components/settings/StatusChip';
import { InsuranceUploader } from '@/components/settings/InsuranceUploader';
import { Button } from '@/components/ui/Button';
import { getCurrentUser, getProSafetyComplianceSettings, updateProSafetyComplianceSettings } from '@/lib/api';
import { ProAccessNotice } from '@/components/ui/ProAccessNotice';

export default function ProTrustSafetyPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [access, setAccess] = useState<'signed_out' | 'not_pro' | 'pro'>('signed_out');

  const [guidelinesAcknowledged, setGuidelinesAcknowledged] = useState(false);
  const [guidelinesAcceptedAt, setGuidelinesAcceptedAt] = useState<string | null>(null);
  const [insuranceDocPath, setInsuranceDocPath] = useState<string | null>(null);
  const [insuranceExpiresAt, setInsuranceExpiresAt] = useState<string | null>(null);
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [backgroundCheckStatus, setBackgroundCheckStatus] = useState('not_started');
  const [warningCount, setWarningCount] = useState(0);
  const [strikeCount, setStrikeCount] = useState(0);

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
      setGuidelinesAcceptedAt(s.guidelinesAcceptedAt);
      setInsuranceDocPath(s.insuranceDocPath);
      setInsuranceExpiresAt(s.insuranceExpiresAt);
      setInsuranceProvider(s.insuranceProvider ?? '');
      setBackgroundCheckStatus(s.backgroundCheckStatus);
      setWarningCount(s.warningCount);
      setStrikeCount(s.strikeCount);
      setLoading(false);
    };
    void load();
  }, []);

  async function handleAcknowledgeGuidelines() {
    if (!userId) return;
    setSaving(true);
    setError(null);
    const res = await updateProSafetyComplianceSettings(userId, {
      guidelinesAcknowledged: true,
      guidelinesAcceptedAt: new Date().toISOString(),
    });
    if (res.success) {
      setGuidelinesAcknowledged(true);
      setGuidelinesAcceptedAt(new Date().toISOString());
      setSuccess('Guidelines acknowledged.');
    } else {
      setError(res.error ?? 'Failed to save.');
    }
    setSaving(false);
  }

  async function handleInsuranceUpload(file: File) {
    const formData = new FormData();
    formData.set('file', file);
    const res = await fetch('/api/pro/insurance', { method: 'POST', body: formData });
    const data = (await res.json()) as { success?: boolean; error?: string; path?: string };
    if (res.ok && data.success && data.path) {
      setInsuranceDocPath(data.path);
      return { success: true };
    }
    return { success: false, error: data.error };
  }

  async function handleInsuranceRemove() {
    const res = await fetch('/api/pro/insurance', { method: 'DELETE' });
    const data = (await res.json()) as { success?: boolean };
    if (res.ok && data.success) {
      setInsuranceDocPath(null);
      return { success: true };
    }
    return { success: false, error: 'Failed to remove' };
  }

  async function saveMetadata() {
    if (!userId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    const res = await updateProSafetyComplianceSettings(userId, {
      insuranceExpiresAt: insuranceExpiresAt || null,
      insuranceProvider: insuranceProvider.trim() || null,
    });
    if (res.success) setSuccess('Saved.');
    else setError(res.error ?? 'Failed to save.');
    setSaving(false);
  }

  const hasEdits = true;

  return (
    <AppLayout mode="pro">
      <div className="min-h-screen" style={{ backgroundColor: '#F5F5F5' }}>
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          <Link href="/pro/settings" className="text-sm text-muted hover:text-text">
            ← Back to Settings
          </Link>

          <div>
            <h1 className="text-2xl font-semibold text-text">Trust & Safety</h1>
            <p className="mt-1 text-sm text-muted">Clear rules, verified proof, no surprises.</p>
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
              {success}
            </div>
          )}

          {loading ? (
            <SettingsCard>
              <p className="text-sm text-muted">Loading…</p>
            </SettingsCard>
          ) : !userId ? (
            <SettingsCard>
              <ProAccessNotice nextHref="/pro/settings/safety-compliance" signedIn={access !== 'signed_out'} />
            </SettingsCard>
          ) : (
            <>
              {/* A1) Trust Status Summary */}
              <SettingsCard>
                <SectionHeader label="Trust status" />
                <TrustStatusSummary
                  guidelinesStatus={guidelinesAcknowledged ? 'verified' : 'not_started'}
                  guidelinesAcceptedAt={guidelinesAcceptedAt}
                  insuranceStatus={insuranceDocPath ? 'verified' : 'not_started'}
                  backgroundCheckStatus={backgroundCheckStatus as 'not_started' | 'pending' | 'verified'}
                  accountStanding={warningCount > 0 || strikeCount > 0 ? 'warning' : 'good'}
                />
              </SettingsCard>

              {/* A2) Community Guidelines */}
              <SettingsCard>
                <SectionHeader label="Community guidelines" />
                <p className="text-sm text-muted mb-4">Professional standards for safe service.</p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/legal/guidelines"
                    className="inline-flex items-center justify-center h-10 px-4 rounded-full text-sm font-medium border border-black/10 text-text hover:bg-black/[0.02]"
                  >
                    Read guidelines
                  </Link>
                  {!guidelinesAcknowledged ? (
                    <Button
                      type="button"
                      onClick={() => void handleAcknowledgeGuidelines()}
                      disabled={saving}
                      showArrow={false}
                    >
                      Acknowledge
                    </Button>
                  ) : (
                    <span className="inline-flex items-center h-10 px-4 text-sm text-muted">
                      Accepted on {guidelinesAcceptedAt ? new Date(guidelinesAcceptedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </span>
                  )}
                </div>
              </SettingsCard>

              {/* A3) Insurance */}
              <SettingsCard>
                <SectionHeader label="Insurance proof (optional)" />
                <InsuranceUploader
                  currentPath={insuranceDocPath}
                  onUpload={handleInsuranceUpload}
                  onRemove={handleInsuranceRemove}
                  disabled={!userId}
                />
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="insurance-provider" className="block text-xs font-medium text-muted mb-1">Provider (optional)</label>
                    <input
                      id="insurance-provider"
                      type="text"
                      value={insuranceProvider}
                      onChange={(e) => setInsuranceProvider(e.target.value)}
                      placeholder="e.g. State Farm"
                      className="w-full px-3 py-2 rounded-xl border border-black/10 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="insurance-expires" className="block text-xs font-medium text-muted mb-1">Expires (optional)</label>
                    <input
                      id="insurance-expires"
                      type="date"
                      value={insuranceExpiresAt ?? ''}
                      onChange={(e) => setInsuranceExpiresAt(e.target.value || null)}
                      className="w-full px-3 py-2 rounded-xl border border-black/10 text-sm"
                    />
                  </div>
                </div>
              </SettingsCard>

              {/* A4) Background check */}
              <SettingsCard>
                <SectionHeader label="Background check" />
                <div className="flex items-center justify-between gap-4 mb-2">
                  <span className="text-sm text-text">Status</span>
                  <StatusChip status="not_started" label="Not started" />
                </div>
                <p className="text-xs text-muted mb-4">
                  A background check helps build customer trust. This feature is coming soon.
                </p>
                <button
                  type="button"
                  disabled
                  title="Coming soon"
                  className="inline-flex items-center justify-center h-10 px-4 rounded-full text-sm font-medium border border-black/10 text-muted cursor-not-allowed"
                >
                  Start background check
                </button>
              </SettingsCard>

              {/* A5) Account standing */}
              <SettingsCard>
                <SectionHeader label="Account standing" />
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-text">Current standing</span>
                  <StatusChip
                    status={warningCount > 0 || strikeCount > 0 ? 'warning' : 'good'}
                    label={warningCount > 0 || strikeCount > 0 ? 'Warning' : 'Good standing'}
                  />
                </div>
              </SettingsCard>

              {hasEdits && (
                <div className="flex justify-end">
                  <Button type="button" onClick={() => void saveMetadata()} disabled={saving} showArrow={false}>
                    {saving ? 'Saving…' : 'Save changes'}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
