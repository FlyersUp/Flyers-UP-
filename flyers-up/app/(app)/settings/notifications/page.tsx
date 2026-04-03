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
import { Switch } from '@/components/ui/Switch';

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
        <div className="p-4 bg-surface2 border border-[var(--surface-border)] border-l-[3px] border-l-accent rounded-lg text-text">
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
            <Switch
              checked={settings.new_booking}
              onCheckedChange={() => handleToggle('new_booking')}
              aria-label="New booking notifications"
            />
          </div>

          <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-surface">
            <div>
              <h3 className="font-medium text-text">Job Status Updates</h3>
              <p className="text-sm text-muted">Receive updates when booking status changes</p>
            </div>
            <Switch
              checked={settings.job_status_updates}
              onCheckedChange={() => handleToggle('job_status_updates')}
              aria-label="Job status update notifications"
            />
          </div>

          <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-surface">
            <div>
              <h3 className="font-medium text-text">Messages</h3>
              <p className="text-sm text-muted">Get notified when you receive new messages</p>
            </div>
            <Switch
              checked={settings.messages}
              onCheckedChange={() => handleToggle('messages')}
              aria-label="Message notifications"
            />
          </div>

          <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-surface">
            <div>
              <h3 className="font-medium text-text">Marketing Emails</h3>
              <p className="text-sm text-muted">Receive promotional emails and updates</p>
            </div>
            <Switch
              checked={settings.marketing_emails}
              onCheckedChange={() => handleToggle('marketing_emails')}
              aria-label="Marketing email notifications"
            />
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

