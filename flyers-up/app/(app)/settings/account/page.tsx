'use client';

/**
 * Account Settings Page
 * Allows users to update their profile information
 */

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { changeEmail } from '@/lib/api';
import { TrustRow } from '@/components/ui/TrustRow';
import { loadCustomerProfile, saveCustomerProfile } from '@/lib/profileStore';

export default function AccountSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

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
        // Read-after-write: refresh UI from Supabase source of truth.
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
    setLoading(true);
    setSuccess(null);
    setError(null);

    if (!newEmail || newEmail === email) {
      setError('Please enter a new email address');
      setLoading(false);
      return;
    }

    try {
      const result = await changeEmail(newEmail);
      if (result.success) {
        setSuccess('Email change request sent. Please check your inbox.');
        setEmail(newEmail);
        setNewEmail('');
      } else {
        setError(result.error || 'Failed to change email');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
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

      {/* Email Change */}
      <form onSubmit={handleChangeEmail} className="space-y-4 border-t border-border pt-6">
        <div>
          <h2 className="text-lg font-semibold text-text mb-4">Email Address</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="currentEmail" className="block text-sm font-medium text-muted mb-1">
                Current Email
              </label>
              <input
                type="email"
                id="currentEmail"
                value={email}
                disabled
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface2 text-muted/70"
              />
            </div>

            <div>
              <label htmlFor="newEmail" className="block text-sm font-medium text-muted mb-1">
                New Email
              </label>
              <input
                type="email"
                id="newEmail"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text focus:ring-2 focus:ring-accent/40 focus:border-accent"
                placeholder="Enter new email address"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-accent text-accentContrast rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Sending...' : 'Change Email'}
        </button>
      </form>

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

