'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import AccountSettingsPage from '@/app/(app)/settings/account/page';
import { getCurrentUser } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';
import { TrustRow } from '@/components/ui/TrustRow';
import { ProAccessNotice } from '@/components/ui/ProAccessNotice';
import { updateMyServiceProAction } from '@/app/actions/servicePro';

export default function ProAccountIdentityPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [access, setAccess] = useState<'signed_out' | 'not_pro' | 'pro'>('signed_out');

  const [businessName, setBusinessName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

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

  async function uploadLogo(userId: string, file: File): Promise<string> {
    const ext = safeExtFromFile(file);
    const safeName = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
    const path = `${userId}/logo/${safeName}`;
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

      const { data } = await supabase
        .from('service_pros')
        .select('display_name, logo_url')
        .eq('user_id', user.id)
        .single();
      if (data) {
        setBusinessName(data.display_name || '');
        setLogoUrl(data.logo_url || '');
      }

      setLoading(false);
    };
    void load();
  }, []);

  async function save() {
    if (!userId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const res = await updateMyServiceProAction({
      display_name: businessName,
      logo_url: logoUrl || undefined,
    }, session?.access_token ?? undefined);
    if (!res.success) {
      setError(res.error || 'Failed to save business identity.');
      setSaving(false);
      return;
    }

    // Read-after-write: confirm from Supabase.
    const { data, error: e } = await supabase
      .from('service_pros')
      .select('display_name, logo_url')
      .eq('user_id', userId)
      .single();
    if (e) setError(e.message || 'Saved, but failed to reload.');
    else {
      setBusinessName(data?.display_name || '');
      setLogoUrl(data?.logo_url || '');
      setSuccess('Business identity saved.');
    }
    setSaving(false);
  }

  return (
    <AppLayout mode="pro">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div>
          <Link href="/pro/settings" className="text-sm text-muted hover:text-text">
            ← Back to Settings
          </Link>
          <h1 className="text-2xl font-semibold text-text mt-3">Account &amp; Identity</h1>
          <p className="text-muted mt-1">Who you are on the platform and how you log in.</p>
          <div className="mt-3">
            <TrustRow />
          </div>
        </div>

        {error && <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg text-text">{error}</div>}
        {success && (
          <div className="p-4 bg-surface2 border border-[var(--surface-border)] border-l-[3px] border-l-accent rounded-lg text-text">
            {success}
          </div>
        )}

        <Card withRail>
          <Label>WHO AM I ON THE PLATFORM?</Label>
          {loading ? (
            <p className="mt-4 text-sm text-muted/70">Loading…</p>
          ) : !userId ? (
            <ProAccessNotice nextHref="/pro/settings/account-identity" signedIn={access !== 'signed_out'} />
          ) : (
            <div className="mt-4 space-y-3">
              <Input
                label="Business name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Your business name"
              />
              <div className="rounded-xl border border-border bg-surface p-4">
                <div className="text-sm font-medium text-text">Business logo</div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-14 w-14 rounded-xl overflow-hidden border border-border bg-surface2 flex items-center justify-center">
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt="Business logo" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xl text-muted/70">🏷️</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0] ?? null;
                        if (!f || !userId) return;
                        setError(null);
                        setUploadingLogo(true);
                        try {
                          const url = await uploadLogo(userId, f);
                          setLogoUrl(url);
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Failed to upload logo.');
                        } finally {
                          setUploadingLogo(false);
                          e.target.value = '';
                        }
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={uploadingLogo || saving}
                        onClick={() => logoInputRef.current?.click()}
                        showArrow={false}
                        className="px-3 py-2 rounded-lg text-sm"
                      >
                        {uploadingLogo ? 'Uploading…' : 'Upload logo'}
                      </Button>
                      {logoUrl ? (
                        <button
                          type="button"
                          className="text-sm text-muted hover:text-text"
                          onClick={() => setLogoUrl('')}
                          disabled={uploadingLogo || saving}
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-2 text-xs text-muted/70">
                      Uses Supabase Storage (`profile-images`). If uploads fail, apply migration `016_add_profile_image_storage.sql`.
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted">
                Full name, phone, email, password/login methods, and profile photo live below and are shared across the platform.
              </p>
            </div>
          )}
        </Card>

        {/* Shared identity controls (works for both customer + pro) */}
        <AccountSettingsPage />

        <div className="flex justify-end">
          <Button type="button" onClick={() => void save()} disabled={!userId || saving || loading} showArrow={false}>
            {saving ? 'Saving…' : 'Save Business Identity'}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}

