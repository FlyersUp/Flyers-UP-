'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { PlacardHeader } from '@/components/ui/PlacardHeader';
import { TrustRow } from '@/components/ui/TrustRow';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { SettingsSelectRow } from '@/components/ui/SettingsSelectRow';
import { ProAccessNotice } from '@/components/ui/ProAccessNotice';
import {
  getCurrentUser,
  getUserAppPreferences,
  updateLanguage,
  updateUserAppPreferences,
  type UserAppPreferences,
} from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';
import { TOP_LANGUAGES } from '@/lib/languages';
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
  const [saved, setSaved] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [access, setAccess] = useState<'signed_out' | 'not_pro' | 'pro'>('signed_out');
  const [language, setLanguage] = useState('en');
  const [prefs, setPrefs] = useState<UserAppPreferences>({
    darkMode: false,
    distanceUnits: 'miles',
    defaultMapView: 'map',
    locationEnabled: true,
  });
  const skipNextSave = useRef(true);

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

  async function persist() {
    if (!userId) return;
    setSaving(true);
    setError(null);
    const resPrefs = await updateUserAppPreferences(userId, prefs);
    const resLang = await updateLanguage(userId, language);
    const msg = [resPrefs.success ? null : resPrefs.error, resLang.success ? null : resLang.error].filter(Boolean).join(' / ');
    if (msg) setError(msg);
    else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  function handlePrefChange(partial: Partial<UserAppPreferences>) {
    setPrefs((p) => ({ ...p, ...partial }));
  }

  useEffect(() => {
    if (!userId || loading) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    void persist();
  }, [prefs, language, userId, loading]);

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

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-black/5 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-black/5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Quality of Life</span>
        </div>
        {loading ? (
          <div className="px-4 py-8 text-sm text-muted">Loading…</div>
        ) : !userId ? (
          <div className="px-4 py-6">
            <ProAccessNotice nextHref="/pro/settings/preferences" signedIn={access !== 'signed_out'} />
          </div>
        ) : (
          <>
            <div className="divide-y divide-black/5">
              <div className="px-4">
                <ToggleRow
                  title="Dark mode"
                  description="Store your preference."
                  checked={prefs.darkMode}
                  onChange={(next) => {
                    handlePrefChange({ darkMode: next });
                    setDarkMode(next);
                  }}
                />
              </div>
              <div className="px-4">
                <ToggleRow
                  title="Location enabled"
                  description="Allow location-based suggestions and map features."
                  checked={prefs.locationEnabled}
                  onChange={(next) => handlePrefChange({ locationEnabled: next })}
                />
              </div>
              <div className="px-4">
                <SettingsSelectRow
                  title="Language"
                  description="Choose your default language."
                  value={language}
                  options={TOP_LANGUAGES.map((l) => ({ value: l.code, label: l.name }))}
                  onChange={(v) => setLanguage(v)}
                />
              </div>
              <div className="px-4">
                <SettingsSelectRow
                  title="Distance units"
                  description="Choose miles or kilometers."
                  value={prefs.distanceUnits}
                  options={[
                    { value: 'miles', label: 'Miles' },
                    { value: 'km', label: 'Kilometers' },
                  ]}
                  onChange={(v) => handlePrefChange({ distanceUnits: v as 'miles' | 'km' })}
                />
              </div>
              <div className="px-4">
                <SettingsSelectRow
                  title="Default map view"
                  description="Choose the default view when browsing."
                  value={prefs.defaultMapView}
                  options={[
                    { value: 'map', label: 'Map' },
                    { value: 'list', label: 'List' },
                  ]}
                  onChange={(v) => handlePrefChange({ defaultMapView: v as 'map' | 'list' })}
                />
              </div>
            </div>
            {(saved || saving) && (
              <div className="border-t border-black/5 px-4 py-2 text-xs text-muted">
                {saving ? 'Saving…' : 'Saved'}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
