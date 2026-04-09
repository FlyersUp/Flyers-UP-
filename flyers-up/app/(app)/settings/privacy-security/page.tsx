'use client';

/**
 * Privacy & Security Settings Page
 * Password, account deletion (customers), 2FA placeholder.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { changePassword } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';
import { TrustRow } from '@/components/ui/TrustRow';
import { OFFICIAL_SUPPORT_EMAIL_DISPLAY } from '@/lib/support/official-contact';

const DEACTIVATE_CONFIRM_PHRASE = 'DEACTIVATE MY ACCOUNT';

export default function PrivacySecurityPage() {
  const pathname = usePathname() ?? '';
  const accountDataHref =
    pathname.startsWith('/pro') || pathname.includes('/dashboard/pro')
      ? '/pro/settings/data'
      : '/customer/settings/data';

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [deactivatePhrase, setDeactivatePhrase] = useState('');
  const [deactivateLoading, setDeactivateLoading] = useState(false);
  const [accountKind, setAccountKind] = useState<'loading' | 'customer' | 'pro' | 'admin'>('loading');
  const [accountStatus, setAccountStatus] = useState<string | null>(null);
  const [scheduledDeletionAt, setScheduledDeletionAt] = useState<string | null>(null);
  const [showCloseAccountModal, setShowCloseAccountModal] = useState(false);
  const [closeAccountLoading, setCloseAccountLoading] = useState(false);

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
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, account_status, scheduled_deletion_at')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (profile?.role === 'admin') {
        setAccountKind('admin');
        return;
      }
      const { data: sp } = await supabase.from('service_pros').select('id').eq('user_id', user.id).maybeSingle();
      if (cancelled) return;
      setAccountStatus((profile as { account_status?: string | null })?.account_status ?? 'active');
      setScheduledDeletionAt((profile as { scheduled_deletion_at?: string | null })?.scheduled_deletion_at ?? null);
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

  async function handleDeactivateAccount() {
    setDeactivateLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/account/deactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ confirmPhrase: deactivatePhrase.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
        reasons?: string[];
      };

      if (res.status === 409 && !data.success) {
        setError(data.message || 'Cannot deactivate right now.');
        setDeactivateLoading(false);
        return;
      }

      if (!res.ok || !data.success) {
        setError(data.message || 'Could not deactivate account.');
        setDeactivateLoading(false);
        return;
      }

      window.location.href = '/account/deactivated';
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setDeactivateLoading(false);
    }
  }

  async function handleReactivateFromSettings() {
    setDeactivateLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/account/reactivate', { method: 'POST', credentials: 'include' });
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string };
      if (!res.ok || !data.success) {
        setError(data.message || 'Could not reactivate.');
        setDeactivateLoading(false);
        return;
      }
      setAccountStatus('active');
      setScheduledDeletionAt(null);
      setSuccess('Account reactivated.');
      window.location.reload();
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setDeactivateLoading(false);
    }
  }

  type ProCloseApiResponse = {
    success: boolean;
    status: string;
    blocked_by: { code: string; message: string }[];
    message: string;
  };

  async function handleConfirmCloseProAccount() {
    setCloseAccountLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/pro/account/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      const data = (await res.json().catch(() => ({}))) as ProCloseApiResponse;

      if (res.status === 409 && !data.success) {
        const firstDetail = data.blocked_by?.[0]?.message;
        setError(
          firstDetail ||
            data.message ||
            'You can’t close your account yet because you still have active jobs or payout issues to resolve.'
        );
        setShowCloseAccountModal(false);
        setCloseAccountLoading(false);
        return;
      }

      if (!res.ok || !data.success) {
        setError(data.message || 'Could not close your account. Please try again or contact support.');
        setCloseAccountLoading(false);
        return;
      }

      setShowCloseAccountModal(false);
      window.location.href = '/account/deactivated';
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setCloseAccountLoading(false);
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

      {/* 2FA — informational only until TOTP is implemented */}
      <div id="2fa" className="border-b border-border pb-6 scroll-mt-4">
        <h2 className="text-lg font-semibold text-text mb-4">Two-Factor Authentication</h2>
        <div
          className="rounded-xl border border-dashed border-border bg-surface2/90 p-4 sm:p-5"
          role="region"
          aria-label="Two-factor authentication status"
        >
          <p className="text-sm text-text">
            Two-factor authentication (2FA) is <span className="font-medium">not available</span> on Flyers Up yet. You
            cannot turn it on from this screen.
          </p>
          <p className="mt-3 text-sm text-muted leading-relaxed">
            When we add support—likely with an authenticator app and recovery codes—you&apos;ll enroll here. For now,
            use a strong, unique password and protect access to your email account.
          </p>
          <p
            className="mt-4 inline-flex max-w-full items-center rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text3 select-none"
            aria-live="polite"
          >
            Status: not available yet
          </p>
        </div>
      </div>

      {/* View Data Used */}
      <div id="your-data" className="border-b border-border pb-6 scroll-mt-4">
        <h2 className="text-lg font-semibold text-text mb-4">Your Data</h2>
        <div className="p-4 bg-surface2 border border-border rounded-lg">
          <p className="text-sm text-muted mb-3">
            View a snapshot of your profile, recent bookings, and payment-related fields on those bookings. Download a JSON
            copy for your records.
          </p>
          <Link
            href={accountDataHref}
            className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accentContrast hover:opacity-95 transition-opacity"
          >
            View &amp; download data
          </Link>
        </div>
      </div>

      {/* Deactivate account */}
      <div>
        <h2 className="text-lg font-semibold text-danger mb-4">Danger Zone</h2>

        {accountKind === 'loading' && (
          <div className="p-4 bg-surface2 border border-border rounded-lg text-sm text-muted">Loading…</div>
        )}

        {accountKind === 'pro' && accountStatus === 'deleted' && (
          <div className="p-4 bg-surface2 border border-border rounded-lg text-sm text-text">
            <p className="mb-2">This account has been permanently deleted and anonymized.</p>
            <p className="text-muted text-xs">
              Questions? Contact{' '}
              <a className="text-accent underline" href={`mailto:${OFFICIAL_SUPPORT_EMAIL_DISPLAY}`}>
                {OFFICIAL_SUPPORT_EMAIL_DISPLAY}
              </a>
              .
            </p>
          </div>
        )}

        {accountKind === 'pro' && accountStatus === 'deactivated' && (
          <div className="p-4 bg-surface2 border border-border rounded-lg space-y-3 text-sm text-text">
            <p>Your pro account is deactivated. You are hidden from search and cannot accept new work.</p>
            {scheduledDeletionAt ? (
              <p className="text-muted text-xs">
                Permanent deletion scheduled:{' '}
                <span className="font-medium text-text">
                  {new Date(scheduledDeletionAt).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })}
                </span>
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={deactivateLoading}
                onClick={() => void handleReactivateFromSettings()}
                className="px-4 py-2 rounded-lg bg-[hsl(var(--accent-customer))] text-[hsl(var(--accent-contrast))] text-sm font-semibold disabled:opacity-50"
              >
                Reactivate account
              </button>
              <Link
                href="/account/deactivated"
                className="inline-flex items-center px-4 py-2 rounded-lg border border-border text-sm text-muted hover:bg-surface2"
              >
                Deactivation details
              </Link>
            </div>
          </div>
        )}

        {accountKind === 'pro' && accountStatus === 'active' && (
          <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg space-y-4">
            <p className="text-sm text-text">
              Deactivate your pro account: you disappear from search, stop receiving bookings, and enter a 30-day window
              where you can reactivate. After that, we permanently anonymize your profile while keeping required financial
              records.
            </p>
            <p className="text-xs text-muted">
              Payment, payout, and tax records are retained. For data export questions, contact{' '}
              <a className="text-accent underline" href={`mailto:${OFFICIAL_SUPPORT_EMAIL_DISPLAY}`}>
                {OFFICIAL_SUPPORT_EMAIL_DISPLAY}
              </a>
              .
            </p>
            <button
              type="button"
              onClick={() => setShowCloseAccountModal(true)}
              disabled={closeAccountLoading}
              className="px-4 py-2 bg-red-600 text-accentContrast rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              Deactivate my account
            </button>
          </div>
        )}

        {accountKind === 'pro' && accountStatus === null && (
          <div className="p-4 bg-surface2 border border-border rounded-lg text-sm text-muted">Loading…</div>
        )}

        {accountKind === 'admin' && (
          <div className="p-4 bg-surface2 border border-border rounded-lg text-sm text-text">
            Admin accounts cannot be deactivated through self-serve (by design).
          </div>
        )}

        {accountKind === 'customer' && accountStatus === 'deleted' && (
          <div className="p-4 bg-surface2 border border-border rounded-lg text-sm text-text">
            <p>This account has been permanently deleted.</p>
          </div>
        )}

        {accountKind === 'customer' && accountStatus === 'deactivated' && (
          <div className="p-4 bg-surface2 border border-border rounded-lg space-y-3 text-sm text-text">
            <p>Your account is deactivated. You cannot create new bookings until you reactivate.</p>
            {scheduledDeletionAt ? (
              <p className="text-muted text-xs">
                Permanent deletion scheduled:{' '}
                <span className="font-medium text-text">
                  {new Date(scheduledDeletionAt).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })}
                </span>
              </p>
            ) : null}
            <button
              type="button"
              disabled={deactivateLoading}
              onClick={() => void handleReactivateFromSettings()}
              className="px-4 py-2 rounded-lg bg-[hsl(var(--accent-customer))] text-[hsl(var(--accent-contrast))] text-sm font-semibold disabled:opacity-50"
            >
              Reactivate account
            </button>
          </div>
        )}

        {accountKind === 'customer' && accountStatus === 'active' && (
          <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg space-y-4">
            <p className="text-sm text-text">
              Deactivate your account: your profile is hidden, you cannot book new services, and after 30 days we begin
              permanent anonymization. You can return any time before then by signing in and choosing Reactivate.
            </p>
            <p className="text-xs text-muted">
              Past jobs and payment records stay on file where the law requires; see the{' '}
              <Link href="/privacy" className="text-accent underline">
                Privacy Policy
              </Link>
              .
            </p>
            <label className="flex items-start gap-2 text-sm text-text cursor-pointer">
              <input
                type="checkbox"
                checked={showDeactivateConfirm}
                onChange={(e) => {
                  setShowDeactivateConfirm(e.target.checked);
                  if (!e.target.checked) setDeactivatePhrase('');
                }}
                className="mt-1"
              />
              <span>I understand my account will be hidden and may be permanently anonymized after 30 days.</span>
            </label>
            {showDeactivateConfirm ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-text">
                  Type <span className="font-mono bg-surface px-1 rounded">{DEACTIVATE_CONFIRM_PHRASE}</span> to
                  confirm:
                </p>
                <input
                  type="text"
                  value={deactivatePhrase}
                  onChange={(e) => setDeactivatePhrase(e.target.value)}
                  autoComplete="off"
                  className="w-full max-w-md px-3 py-2 border border-border rounded-lg bg-surface text-text"
                  placeholder={DEACTIVATE_CONFIRM_PHRASE}
                />
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void handleDeactivateAccount()}
                    disabled={
                      deactivateLoading || deactivatePhrase.trim() !== DEACTIVATE_CONFIRM_PHRASE || !showDeactivateConfirm
                    }
                    className="px-4 py-2 bg-red-600 text-accentContrast rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {deactivateLoading ? 'Deactivating…' : 'Deactivate account'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {showCloseAccountModal && accountKind === 'pro' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="close-account-title"
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-lg text-text">
            <h3 id="close-account-title" className="text-lg font-semibold mb-3">
              Deactivate your pro account?
            </h3>
            <ul className="text-sm text-muted space-y-2 list-disc pl-5 mb-6">
              <li>You won’t receive new bookings</li>
              <li>Your profile will be removed from search</li>
              <li>You can reactivate within 30 days; then we permanently anonymize your profile</li>
              <li>Payment and tax records are retained as required</li>
              <li>Deactivation may be blocked if you have open jobs, payouts under review, or disputes</li>
            </ul>
            <div className="flex flex-wrap gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowCloseAccountModal(false)}
                disabled={closeAccountLoading}
                className="px-4 py-2 bg-surface border border-border text-muted rounded-lg hover:bg-surface2 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmCloseProAccount()}
                disabled={closeAccountLoading}
                className="px-4 py-2 bg-red-600 text-accentContrast rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {closeAccountLoading ? 'Deactivating…' : 'Confirm deactivation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
