'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { getCurrentUser, getUserSafetyPreferences, updateUserSafetyPreferences, type UserSafetyPreferences } from '@/lib/api';
import { TrustRow } from '@/components/ui/TrustRow';

export default function CustomerSafetyPreferencesSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<UserSafetyPreferences>({
    noContactService: false,
    petPresent: false,
    genderPreference: 'no_preference',
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const user = await getCurrentUser();
      if (!user) {
        setUserId(null);
        setLoading(false);
        return;
      }
      setUserId(user.id);
      const p = await getUserSafetyPreferences(user.id);
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
    const res = await updateUserSafetyPreferences(userId, prefs);
    if (!res.success) setError(res.error || 'Failed to save preferences.');
    else setSuccess('Preferences saved.');
    setSaving(false);
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

  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div>
          <Link href="/customer/settings" className="text-sm text-muted hover:text-text">
            ← Back to Settings
          </Link>
          <h1 className="text-2xl font-semibold text-text mt-3">Safety &amp; Preferences</h1>
          <p className="text-muted mt-1">Comfort.</p>
          <div className="mt-3">
            <TrustRow />
          </div>
        </div>

        {error && <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg text-text">{error}</div>}
        {success && (
          <div className="p-4 bg-success/15 border border-success/30 rounded-lg text-text">{success}</div>
        )}

        <Card withRail>
          <Label>COMFORT</Label>

          {loading ? (
            <p className="mt-4 text-sm text-muted/70">Loading…</p>
          ) : !userId ? (
            <p className="mt-4 text-sm text-muted">Sign in to edit safety preferences.</p>
          ) : (
            <div className="mt-4 space-y-3">
              <ToggleRow
                title="No-contact service"
                description="Indicate that you prefer service without in-person contact."
                checked={prefs.noContactService}
                onChange={(next) => setPrefs((p) => ({ ...p, noContactService: next }))}
              />
              <ToggleRow
                title="Pet present"
                description="Let pros know a pet may be present during service."
                checked={prefs.petPresent}
                onChange={(next) => setPrefs((p) => ({ ...p, petPresent: next }))}
              />

              <div className="p-4 border border-border rounded-lg bg-surface">
                <h3 className="font-medium text-text">Gender preference (optional)</h3>
                <p className="text-sm text-muted">If you have a preference, we’ll use it when suggesting pros.</p>
                <select
                  value={prefs.genderPreference}
                  onChange={(e) =>
                    setPrefs((p) => ({ ...p, genderPreference: e.target.value as UserSafetyPreferences['genderPreference'] }))
                  }
                  className="mt-3 w-full px-3 py-2 border border-border rounded-lg bg-surface text-text outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                >
                  <option value="no_preference">No preference</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other / Prefer not to say</option>
                </select>
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

