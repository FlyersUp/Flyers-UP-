'use client';

/**
 * Account Settings Page
 * Profile, email, password, and photo management.
 */

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { changeEmail, changePassword } from '@/lib/api';
import { TrustRow } from '@/components/ui/TrustRow';
import { loadCustomerProfile, saveCustomerProfile } from '@/lib/profileStore';

const MIN_PASSWORD_LENGTH = 8;

export default function AccountSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Email change: inline form visibility + fields
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newEmailConfirm, setNewEmailConfirm] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  // Password change: inline form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setEmail(user.email || '');

      const profile = await loadCustomerProfile(user.id);
      if (profile) {
        setFullName(profile.fullName || '');
        setPhone(profile.phone || '');
        setAvatarUrl(profile.avatarUrl || '');
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);

    try {
      const result = await saveCustomerProfile({
        full_name: fullName,
        phone: phone || undefined,
        avatar_url: avatarUrl || undefined,
      });

      if (result.success) {
        setSuccess('Profile updated successfully');
        if (result.profile) {
          setFullName(result.profile.fullName || '');
          setPhone(result.profile.phone || '');
          setAvatarUrl(result.profile.avatarUrl || '');
        } else {
          await loadProfile();
        }
      } else {
        setError(result.error || 'Failed to update profile');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailLoading(true);
    setSuccess(null);
    setError(null);

    const n = newEmail.trim();
    const c = newEmailConfirm.trim();
    if (!n || n !== c) {
      setError('Emails must match.');
      setEmailLoading(false);
      return;
    }
    if (n === email) {
      setError('Enter a different email address.');
      setEmailLoading(false);
      return;
    }

    try {
      const result = await changeEmail(n);
      if (result.success) {
        setSuccess('Verify the new email from your inbox.');
        setNewEmail('');
        setNewEmailConfirm('');
        setShowEmailForm(false);
      } else {
        const msg = result.error || '';
        if (msg.toLowerCase().includes('re-auth') || msg.toLowerCase().includes('reauthenticate')) {
          setError('For security, please sign out and sign back in, then try again.');
        } else {
          setError(msg || 'Failed to change email');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordLoading(true);
    setSuccess(null);
    setError(null);

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      setPasswordLoading(false);
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setError('Passwords do not match.');
      setPasswordLoading(false);
      return;
    }

    try {
      const result = await changePassword(currentPassword, newPassword);
      if (result.success) {
        setSuccess('Password updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setNewPasswordConfirm('');
      } else {
        setError(result.error || 'Failed to update password');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setPasswordLoading(false);
    }
  }

  function safeExtFromFile(file: File): string {
    const n = (file.name || '').toLowerCase();
    const m = n.match(/\.([a-z0-9]+)$/i);
    const ext = m?.[1] ?? '';
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'heic'].includes(ext)) return ext === 'jpeg' ? 'jpg' : ext;
    if (file.type === 'image/png') return 'png';
    if (file.type === 'image/webp') return 'webp';
    if (file.type === 'image/gif') return 'gif';
    if (file.type === 'image/jpeg') return 'jpg';
    return 'png';
  }

  async function uploadAvatar(userId: string, file: File): Promise<string> {
    const ext = safeExtFromFile(file);
    const safeName = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
    const path = `${userId}/avatar/${safeName}`;
    const { data, error: uploadErr } = await supabase.storage.from('profile-images').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    });
    if (uploadErr || !data?.path) {
      throw new Error(uploadErr?.message || 'Upload failed. Ensure the `profile-images` bucket exists and policies are applied.');
    }
    const pub = supabase.storage.from('profile-images').getPublicUrl(data.path);
    const url = pub.data.publicUrl;
    if (!url) throw new Error('Upload succeeded but could not resolve a public URL.');
    return url;
  }

  async function handleUploadAvatar() {
    setSuccess(null);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('You must be signed in to upload a photo.');
      return;
    }

    const file = avatarInputRef.current?.files?.[0] ?? null;
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const url = await uploadAvatar(user.id, file);
      setAvatarUrl(url);
      // Save immediately so the new photo is reflected everywhere.
      const result = await saveCustomerProfile({ avatar_url: url });
      if (!result.success) {
        setError(result.error || 'Uploaded, but failed to save your profile photo.');
      } else {
        setSuccess('Profile photo updated.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload profile photo.');
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text mb-2">Account Settings</h1>
        <p className="text-muted">Update your personal information</p>
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

      {/* Profile Information */}
      <form onSubmit={handleSaveProfile} className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-text mb-4">Profile Information</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-muted mb-1">
                Full Name
              </label>
              <input
                type="text"
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text focus:ring-2 focus:ring-accent/40 focus:border-accent"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-muted mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text focus:ring-2 focus:ring-accent/40 focus:border-accent"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-accent text-accentContrast rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      {/* Card 1: Email */}
      <div className="rounded-2xl border border-black/5 bg-white shadow-sm p-6">
        <h2 className="text-lg font-semibold text-text mb-1">Email</h2>
        <p className="text-sm text-black/60 mb-4">Your account email address</p>
        <p className="text-sm font-medium text-text">{email || '—'}</p>
        {!showEmailForm ? (
          <button
            type="button"
            onClick={() => setShowEmailForm(true)}
            className="mt-4 px-4 py-2 rounded-xl border border-black/10 bg-surface hover:bg-surface2 text-sm font-medium text-text transition-colors"
          >
            Change email
          </button>
        ) : (
          <form onSubmit={handleChangeEmail} className="mt-4 space-y-4">
            <div>
              <label htmlFor="newEmail" className="block text-sm font-medium text-text mb-1.5">
                New email
              </label>
              <input
                id="newEmail"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border border-black/10 bg-surface text-text placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>
            <div>
              <label htmlFor="newEmailConfirm" className="block text-sm font-medium text-text mb-1.5">
                Confirm new email
              </label>
              <input
                id="newEmailConfirm"
                type="email"
                value={newEmailConfirm}
                onChange={(e) => setNewEmailConfirm(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border border-black/10 bg-surface text-text placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={emailLoading}
                className="px-4 py-2 rounded-xl bg-accent text-accentContrast text-sm font-medium hover:opacity-95 disabled:opacity-50"
              >
                {emailLoading ? 'Sending…' : 'Update email'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEmailForm(false);
                  setNewEmail('');
                  setNewEmailConfirm('');
                  setError(null);
                }}
                className="px-4 py-2 rounded-xl border border-black/10 bg-surface hover:bg-surface2 text-sm font-medium text-text"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Card 2: Password */}
      <div className="rounded-2xl border border-black/5 bg-white shadow-sm p-6">
        <h2 className="text-lg font-semibold text-text mb-1">Password</h2>
        <p className="text-sm text-black/60 mb-4">Change your password. Requires current password.</p>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-text mb-1.5">
              Current password
            </label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 rounded-xl border border-black/10 bg-surface text-text placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-text mb-1.5">
              New password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={MIN_PASSWORD_LENGTH}
              className="w-full px-4 py-3 rounded-xl border border-black/10 bg-surface text-text placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
            <p className="text-xs text-black/60 mt-1">At least 8 characters</p>
          </div>
          <div>
            <label htmlFor="newPasswordConfirm" className="block text-sm font-medium text-text mb-1.5">
              Confirm new password
            </label>
            <input
              id="newPasswordConfirm"
              type="password"
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              placeholder="••••••••"
              required
              minLength={MIN_PASSWORD_LENGTH}
              className="w-full px-4 py-3 rounded-xl border border-black/10 bg-surface text-text placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
          <button
            type="submit"
            disabled={passwordLoading || !currentPassword || newPassword.length < MIN_PASSWORD_LENGTH || newPassword !== newPasswordConfirm}
            className="px-4 py-2 rounded-xl bg-accent text-accentContrast text-sm font-medium hover:opacity-95 disabled:opacity-50"
          >
            {passwordLoading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>

      {/* Profile Photo / Logo */}
      <div className="border-t border-border pt-6">
        <h2 className="text-lg font-semibold text-text mb-4">Profile Photo / Logo</h2>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-surface2 border border-border flex items-center justify-center overflow-hidden">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl text-muted/70">👤</span>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={() => void handleUploadAvatar()} />
              <button
                type="button"
                disabled={loading || uploadingAvatar}
                onClick={() => avatarInputRef.current?.click()}
                className="px-4 py-2 border border-border rounded-lg bg-surface hover:bg-surface2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-text font-medium"
              >
                {uploadingAvatar ? 'Uploading…' : 'Upload photo'}
              </button>
              {avatarUrl ? (
                <button
                  type="button"
                  disabled={loading || uploadingAvatar}
                  onClick={async () => {
                    setSuccess(null);
                    setError(null);
                    setAvatarUrl('');
                    try {
                      const result = await saveCustomerProfile({ avatar_url: null });
                      if (!result.success) setError(result.error || 'Failed to remove profile photo.');
                      else setSuccess('Profile photo removed.');
                    } catch {
                      setError('Failed to remove profile photo.');
                    }
                  }}
                  className="px-3 py-2 text-sm text-muted hover:text-text disabled:opacity-50"
                >
                  Remove
                </button>
              ) : null}
            </div>
            <p className="text-xs text-muted/70 mt-2">
              Uses Supabase Storage (`profile-images`). If uploads fail, apply migration `016_add_profile_image_storage.sql`.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

