'use client';

/**
 * Language Settings Page
 * Allows users to select their preferred language
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { updateLanguage } from '@/lib/api';
import { TrustRow } from '@/components/ui/TrustRow';
import { TOP_LANGUAGES } from '@/lib/languages';

export default function LanguageSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadLanguagePreference();
  }, []);

  async function loadLanguagePreference() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('language_preference')
        .eq('id', user.id)
        .single();

      if (profile?.language_preference) {
        setSelectedLanguage(profile.language_preference);
      }
    } catch (err) {
      console.error('Error loading language preference:', err);
    }
  }

  async function handleSaveLanguage(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;

    setLoading(true);
    setSuccess(null);
    setError(null);

    try {
      const result = await updateLanguage(userId, selectedLanguage);
      if (result.success) {
        setSuccess('Language preference updated successfully');
      } else {
        setError(result.error || 'Failed to update language preference');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text mb-2">Language Settings</h1>
        <p className="text-muted">Choose your preferred language</p>
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

      <form onSubmit={handleSaveLanguage} className="space-y-4">
        <div>
          <label htmlFor="language" className="block text-sm font-medium text-muted mb-2">
            Preferred Language
          </label>
          <select
            id="language"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          >
            {TOP_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-accent text-accentContrast rounded-lg hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {loading ? 'Saving...' : 'Save Language'}
        </button>
      </form>

      <div className="mt-6 p-4 bg-surface2 border border-border rounded-lg">
        <p className="text-sm text-muted">
          <strong>Note:</strong> Full translation support is coming soon. Currently, this setting is saved for future use.
        </p>
      </div>
    </div>
  );
}

