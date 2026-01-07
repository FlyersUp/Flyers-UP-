'use client';

/**
 * Language Settings Page
 * Allows users to select their preferred language
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { updateLanguage } from '@/lib/api';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'ja', name: 'Japanese' },
];

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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Language Settings</h1>
        <p className="text-gray-600">Choose your preferred language</p>
      </div>

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700">
          {success}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSaveLanguage} className="space-y-4">
        <div>
          <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">
            Preferred Language
          </label>
          <select
            id="language"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Saving...' : 'Save Language'}
        </button>
      </form>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          <strong>Note:</strong> Full translation support is coming soon. Currently, this setting is saved for future use.
        </p>
      </div>
    </div>
  );
}

