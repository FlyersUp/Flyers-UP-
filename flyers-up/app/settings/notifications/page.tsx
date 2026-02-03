'use client';

/**
 * Notification Settings Page
 * Allows users to control notification preferences
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getNotificationSettings, updateNotificationSettings } from '@/lib/api';
import type { NotificationSettings } from '@/lib/api';
import { TrustRow } from '@/components/ui/TrustRow';

export default function NotificationSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [settings, setSettings] = useState<NotificationSettings>({
    new_booking: true,
    job_status_updates: true,
    messages: true,
    marketing_emails: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      const data = await getNotificationSettings(user.id);
      if (data) {
        setSettings(data);
      }
    } catch (err) {
      console.error('Error loading notification settings:', err);
    } finally {
      setLoadingData(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;

    setLoading(true);
    setSuccess(null);
    setError(null);

    try {
      const result = await updateNotificationSettings(userId, settings);
      if (result.success) {
        setSuccess('Notification settings updated successfully');
      } else {
        setError(result.error || 'Failed to update notification settings');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  function handleToggle(key: keyof NotificationSettings) {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  if (loadingData) {
    return (
      <div className="space-y-6">
        <div className="text-muted/70">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text mb-2">Notification Settings</h1>
        <p className="text-muted">Control how and when you receive notifications</p>
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

      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-surface">
            <div>
              <h3 className="font-medium text-text">New Booking Notifications</h3>
              <p className="text-sm text-muted">Get notified when you receive a new booking request</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.new_booking}
                onChange={() => handleToggle('new_booking')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface2 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-border after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-surface">
            <div>
              <h3 className="font-medium text-text">Job Status Updates</h3>
              <p className="text-sm text-muted">Receive updates when booking status changes</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.job_status_updates}
                onChange={() => handleToggle('job_status_updates')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface2 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-border after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-surface">
            <div>
              <h3 className="font-medium text-text">Messages</h3>
              <p className="text-sm text-muted">Get notified when you receive new messages</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.messages}
                onChange={() => handleToggle('messages')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface2 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-border after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-surface">
            <div>
              <h3 className="font-medium text-text">Marketing Emails</h3>
              <p className="text-sm text-muted">Receive promotional emails and updates</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.marketing_emails}
                onChange={() => handleToggle('marketing_emails')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface2 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-border after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-accent text-accentContrast rounded-lg hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}

