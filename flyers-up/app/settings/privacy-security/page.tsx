'use client';

/**
 * Privacy & Security Settings Page
 * Allows users to manage password, 2FA, and account security
 */

import { useState } from 'react';
import { changePassword, deactivateAccount } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';
import { TrustRow } from '@/components/ui/TrustRow';

export default function PrivacySecurityPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      const result = await changePassword(oldPassword, newPassword);
      if (result.success) {
        setSuccess('Password changed successfully');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(result.error || 'Failed to change password');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeactivateAccount() {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const result = await deactivateAccount(user.id);
      if (result.success) {
        setSuccess('Account deactivation request submitted. You will receive a confirmation email.');
        setShowDeactivateConfirm(false);
      } else {
        setError(result.error || 'Failed to deactivate account');
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
        <h1 className="text-2xl font-bold text-text mb-2">Privacy & Security</h1>
        <p className="text-muted">Manage your account security and privacy settings</p>
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

      {/* Change Password */}
      <form onSubmit={handleChangePassword} className="space-y-4 border-b border-border pb-6">
        <div>
          <h2 className="text-lg font-semibold text-text mb-4">Change Password</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="oldPassword" className="block text-sm font-medium text-muted mb-1">
                Current Password
              </label>
              <input
                type="password"
                id="oldPassword"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text focus:ring-2 focus:ring-accent/40 focus:border-accent"
                placeholder="Enter current password"
              />
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-muted mb-1">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text focus:ring-2 focus:ring-accent/40 focus:border-accent"
                placeholder="Enter new password (min. 6 characters)"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-muted mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text focus:ring-2 focus:ring-accent/40 focus:border-accent"
                placeholder="Confirm new password"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-accent text-accentContrast rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Changing...' : 'Change Password'}
        </button>
      </form>

      {/* 2FA (Coming Soon) */}
      <div className="border-b border-border pb-6">
        <h2 className="text-lg font-semibold text-text mb-4">Two-Factor Authentication</h2>
        <div className="p-4 bg-surface2 border border-border rounded-lg">
          <p className="text-sm text-muted mb-2">
            Two-factor authentication adds an extra layer of security to your account.
          </p>
          <button
            type="button"
            disabled
            className="px-4 py-2 bg-surface border border-border text-muted rounded-lg cursor-not-allowed"
          >
            Coming Soon
          </button>
        </div>
      </div>

      {/* View Data Used */}
      <div className="border-b border-border pb-6">
        <h2 className="text-lg font-semibold text-text mb-4">Your Data</h2>
        <div className="p-4 bg-surface2 border border-border rounded-lg">
          <p className="text-sm text-muted mb-2">
            View and download your account data (coming soon).
          </p>
          <button
            type="button"
            disabled
            className="px-4 py-2 bg-surface border border-border text-muted rounded-lg cursor-not-allowed"
          >
            View Data
          </button>
        </div>
      </div>

      {/* Deactivate Account */}
      <div>
        <h2 className="text-lg font-semibold text-danger mb-4">Danger Zone</h2>
        <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg">
          <p className="text-sm text-text mb-4">
            Deactivating your account will disable your profile and prevent you from accessing the platform.
            You can reactivate your account by signing in again within 30 days.
          </p>
          
          {!showDeactivateConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeactivateConfirm(true)}
              className="px-4 py-2 bg-red-600 text-accentContrast rounded-lg hover:bg-red-700 transition-colors"
            >
              Deactivate Account
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-text">
                Are you sure you want to deactivate your account?
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleDeactivateAccount}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-accentContrast rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Processing...' : 'Yes, Deactivate'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeactivateConfirm(false)}
                  disabled={loading}
                  className="px-4 py-2 bg-surface border border-border text-muted rounded-lg hover:bg-surface2 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

