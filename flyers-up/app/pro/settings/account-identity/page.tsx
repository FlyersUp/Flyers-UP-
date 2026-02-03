'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import AccountSettingsPage from '@/app/settings/account/page';
import { getCurrentUser, updateServicePro } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';
import { TrustRow } from '@/components/ui/TrustRow';
import { ProAccessNotice } from '@/components/ui/ProAccessNotice';

export default function ProAccountIdentityPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [access, setAccess] = useState<'signed_out' | 'not_pro' | 'pro'>('signed_out');

  const [businessName, setBusinessName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

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
    const res = await updateServicePro(userId, {
      display_name: businessName,
      logo_url: logoUrl || undefined,
    });
    if (!res.success) setError(res.error || 'Failed to save business identity.');
    else setSuccess('Business identity saved.');
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
          <div className="p-4 bg-warning/15 border border-warning/30 rounded-lg text-text">{success}</div>
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
              <Input
                label="Logo URL"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://..."
              />
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

