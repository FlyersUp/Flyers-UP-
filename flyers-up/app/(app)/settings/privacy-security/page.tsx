'use client';

/**
 * Privacy & Security Settings Page
 * Password, account deletion (customers), 2FA placeholder.
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { changePassword } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';
import { TrustRow } from '@/components/ui/TrustRow';

const DELETE_CONFIRM_PHRASE = 'DELETE MY ACCOUNT';

export default function PrivacySecurityPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState('');
  const [accountKind, setAccountKind] = useState<'loading' | 'customer' | 'pro' | 'admin'>('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) {
        if (!cancelled) setAccountKind('customer');
        return;
      }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (cancelled) return;
      if (profile?.role === 'admin') {
        setAccountKind('admin');
        return;
      }
      const { data: sp } = await supabase.from('service_pros').select('id').eq('user_id', user.id).maybeSingle();
      if (cancelled) return;
      setAccountKind(sp ? 'pro' : 'customer');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteAccount() {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ confirmPhrase: deletePhrase.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };

      if (!res.ok) {
        setError(data.error || 'Could not delete account');
        setLoading(false);
        return;
      }

      await supabase.auth.signOut();
      window.location.href = '/';
    } catch {
      setError('An unexpected error occurred');
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
        <div className="p-4 bg-surface2 border border-[var(--surface-border)] border-l-[3px] border-l-accent rounded-lg text-text">
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
      <div id="2fa" className="border-b border-border pb-6 scroll-mt-4">
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
      <div id="your-data" className="border-b border-border pb-6 scroll-mt-4">
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

      {/* Delete account */}
      <div>
        <h2 className="text-lg font-semibold text-danger mb-4">Danger Zone</h2>

        {accountKind === 'loading' && (
          <div className="p-4 bg-surface2 border border-border rounded-lg text-sm text-muted">Loading…</div>
        )}

        {accountKind === 'pro' && (
          <div className="p-4 bg-surface2 border border-border rounded-lg text-sm text-text">
            <p className="mb-2">
              Service pro accounts can’t be deleted in the app (payments, Connect, and tax records). To close your
              account, email{' '}
              <a className="text-accent underline" href="mailto:support@flyersup.app">
                support@flyersup.app
              </a>
              .
            </p>
          </div>
        )}

        {accountKind === 'admin' && (
          <div className="p-4 bg-surface2 border border-border rounded-lg text-sm text-text">
            Admin accounts can’t be deleted through this screen.
          </div>
        )}

        {accountKind === 'customer' && (
          <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg space-y-4">
            <p className="text-sm text-text">
              Permanently delete your account and sign-in access. Past jobs stay on file for payment and dispute
              records, but your name, email, and address on those jobs are removed. This cannot be undone.
            </p>
            <p className="text-xs text-muted">
              More on data use and retention:{' '}
              <Link href="/privacy" className="text-accent underline">
                Privacy Policy
              </Link>
              .
            </p>

            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(true);
                  setDeletePhrase('');
                }}
                className="px-4 py-2 bg-red-600 text-accentContrast rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete my account
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-text">
                  Type <span className="font-mono bg-surface px-1 rounded">{DELETE_CONFIRM_PHRASE}</span> to confirm:
                </p>
                <input
                  type="text"
                  value={deletePhrase}
                  onChange={(e) => setDeletePhrase(e.target.value)}
                  autoComplete="off"
                  className="w-full max-w-md px-3 py-2 border border-border rounded-lg bg-surface text-text"
                  placeholder={DELETE_CONFIRM_PHRASE}
                />
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={loading || deletePhrase.trim() !== DELETE_CONFIRM_PHRASE}
                    className="px-4 py-2 bg-red-600 text-accentContrast rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Deleting…' : 'Permanently delete account'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeletePhrase('');
                    }}
                    disabled={loading}
                    className="px-4 py-2 bg-surface border border-border text-muted rounded-lg hover:bg-surface2 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
