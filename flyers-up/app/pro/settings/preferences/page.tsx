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
  getUserAppPreferences,
  updateLanguage,
  updateUserAppPreferences,
  type UserAppPreferences,
} from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';
import { TOP_LANGUAGES } from '@/lib/languages';
import { ProAccessNotice } from '@/components/ui/ProAccessNotice';
import { useTheme } from '@/contexts/ThemeContext';

export default function ProPreferencesSettingsPage() {
  return (
    <AppLayout mode="pro">
      <ProPreferencesSettingsInner />
    </AppLayout>
  );
}

function ProPreferencesSettingsInner() {
  const { setDarkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [access, setAccess] = useState<'signed_out' | 'not_pro' | 'pro'>('signed_out');

  const [language, setLanguage] = useState('en');
  const [prefs, setPrefs] = useState<UserAppPreferences>({
    darkMode: false,
    distanceUnits: 'miles',
    defaultMapView: 'map',
    locationEnabled: true,
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

      const p = await getUserAppPreferences(user.id);
      setPrefs(p);

      const { data } = await supabase.from('profiles').select('language_preference').eq('id', user.id).single();
      if (data?.language_preference) setLanguage(String(data.language_preference));

      setLoading(false);
    };
    void load();
  }, []);

  async function save() {
    if (!userId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    const resPrefs = await updateUserAppPreferences(userId, prefs);
    const resLang = await updateLanguage(userId, language);

    const msg = [resPrefs.success ? null : resPrefs.error, resLang.success ? null : resLang.error].filter(Boolean).join(' / ');
    if (msg) setError(msg || 'Failed to save preferences.');
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
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div>
        <Link href="/pro/settings" className="text-sm text-muted hover:text-text">
          ← Back to Settings
        </Link>
        <div className="mt-3">
          <PlacardHeader title="App Preferences" subtitle="Make the app feel right for you." tone="primary" />
        </div>
        <div className="mt-3">
          <TrustRow />
        </div>
      </div>

      {error && <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg text-text">{error}</div>}
      {success && <div className="p-4 bg-success/15 border border-success/30 rounded-lg text-text">{success}</div>}

      <Card withRail>
        <Label>QUALITY OF LIFE</Label>
        {loading ? (
          <p className="mt-4 text-sm text-muted/70">Loading…</p>
        ) : !userId ? (
          <ProAccessNotice nextHref="/pro/settings/preferences" signedIn={access !== 'signed_out'} />
        ) : (
          <div className="mt-4 space-y-3">
            <ToggleRow
              title="Dark mode"
              description="Store your preference."
              checked={prefs.darkMode}
              onChange={(next) => {
                setPrefs((p) => ({ ...p, darkMode: next }));
                setDarkMode(next);
              }}
            />
            <ToggleRow
              title="Location enabled"
              description="Allow location-based suggestions and map features."
              checked={prefs.locationEnabled}
              onChange={(next) => setPrefs((p) => ({ ...p, locationEnabled: next }))}
            />

            <div className="p-4 border border-border rounded-lg bg-surface">
              <h3 className="font-medium text-text">Language</h3>
              <p className="text-sm text-muted">Choose your default language.</p>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="mt-3 w-full px-3 py-2 border border-border rounded-lg bg-surface text-text focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none"
              >
                {TOP_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-4 border border-border rounded-lg bg-surface">
              <h3 className="font-medium text-text">Distance units</h3>
              <p className="text-sm text-muted">Choose miles or kilometers.</p>
              <select
                value={prefs.distanceUnits}
                onChange={(e) => setPrefs((p) => ({ ...p, distanceUnits: e.target.value as any }))}
                className="mt-3 w-full px-3 py-2 border border-border rounded-lg bg-surface text-text focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none"
              >
                <option value="miles">Miles</option>
                <option value="km">Kilometers</option>
              </select>
            </div>

            <div className="p-4 border border-border rounded-lg bg-surface">
              <h3 className="font-medium text-text">Default map view</h3>
              <p className="text-sm text-muted">Choose the default view when browsing.</p>
              <select
                value={prefs.defaultMapView}
                onChange={(e) => setPrefs((p) => ({ ...p, defaultMapView: e.target.value as any }))}
                className="mt-3 w-full px-3 py-2 border border-border rounded-lg bg-surface text-text focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none"
              >
                <option value="map">Map</option>
                <option value="list">List</option>
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
  );
}

