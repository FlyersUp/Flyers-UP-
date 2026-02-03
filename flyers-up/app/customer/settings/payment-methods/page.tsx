'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { PlacardHeader } from '@/components/ui/PlacardHeader';
import { TrustRow } from '@/components/ui/TrustRow';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SignInNotice } from '@/components/ui/SignInNotice';
import {
  deleteUserPaymentMethod,
  getCurrentUser,
  listUserPaymentMethods,
  setDefaultUserPaymentMethod,
  upsertUserPaymentMethod,
  type UserPaymentMethod,
} from '@/lib/api';

export default function CustomerPaymentMethodsSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [methods, setMethods] = useState<UserPaymentMethod[]>([]);

  const [type, setType] = useState<'card' | 'apple_pay' | 'google_pay'>('card');
  const [label, setLabel] = useState('');
  const [brand, setBrand] = useState('');
  const [last4, setLast4] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const user = await getCurrentUser();
      if (!user) {
        setUserId(null);
        setLoading(false);
        return;
      }
      setUserId(user.id);
      const list = await listUserPaymentMethods(user.id);
      setMethods(list);
      setLoading(false);
    };
    void load();
  }, []);

  async function refresh() {
    if (!userId) return;
    const list = await listUserPaymentMethods(userId);
    setMethods(list);
  }

  async function addMethod() {
    if (!userId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    const l4 = last4.trim();
    if (type === 'card' && (l4.length < 4 || l4.length > 4)) {
      setError('Last 4 must be exactly 4 characters.');
      setSaving(false);
      return;
    }

    const res = await upsertUserPaymentMethod(userId, {
      type,
      label: label.trim(),
      brand: brand.trim(),
      last4: l4,
    });

    if (!res.success) setError(res.error || 'Failed to add payment method.');
    else {
      setSuccess('Payment method added.');
      setLabel('');
      setBrand('');
      setLast4('');
      await refresh();
    }
    setSaving(false);
  }

  async function makeDefault(id: string) {
    if (!userId) return;
    setSaving(true);
    setError(null);
    const res = await setDefaultUserPaymentMethod(userId, id);
    if (!res.success) setError(res.error || 'Failed to set default payment method.');
    await refresh();
    setSaving(false);
  }

  async function remove(id: string) {
    if (!userId) return;
    setSaving(true);
    setError(null);
    const res = await deleteUserPaymentMethod(userId, id);
    if (!res.success) setError(res.error || 'Failed to remove payment method.');
    await refresh();
    setSaving(false);
  }

  return (
    <AppLayout mode="customer">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div>
          <Link href="/customer/settings" className="text-sm text-muted hover:text-text">
            ← Back to Settings
          </Link>
          <div className="mt-3">
            <PlacardHeader title="Payment Methods" subtitle="Add, remove, and pick a default." tone="primary" />
          </div>
          <div className="mt-3">
            <TrustRow />
          </div>
        </div>

        <Card withRail>
          <Label>HOW I PAY</Label>
          {error && <div className="mt-4 p-4 bg-danger/10 border border-danger/30 rounded-lg text-text">{error}</div>}
          {success && (
            <div className="mt-4 p-4 bg-success/15 border border-success/30 rounded-lg text-text">{success}</div>
          )}

          {loading ? (
            <p className="mt-4 text-sm text-muted/70">Loading…</p>
          ) : !userId ? (
            <SignInNotice nextHref="/customer/settings/payment-methods" />
          ) : (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 border border-border rounded-lg bg-surface">
                <h3 className="font-medium text-text">Payment type</h3>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                  className="mt-3 w-full px-3 py-2 border border-border rounded-lg bg-surface text-text"
                    disabled={saving}
                  >
                    <option value="card">Card</option>
                    <option value="apple_pay">Apple Pay</option>
                    <option value="google_pay">Google Pay</option>
                  </select>
                </div>
                <Input label="Label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g., Personal" />
                <Input label="Brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g., Visa" />
                <Input label="Last 4" value={last4} onChange={(e) => setLast4(e.target.value)} placeholder="1234" maxLength={4} />
              </div>

              <div className="flex justify-end">
                <Button type="button" onClick={() => void addMethod()} disabled={saving} showArrow={false}>
                  {saving ? 'Saving…' : 'Add Payment Method'}
                </Button>
              </div>

              <div className="space-y-2">
                {methods.length === 0 ? (
                  <div className="p-4 border border-border rounded-lg bg-surface text-sm text-muted">
                    No saved payment methods yet.
                  </div>
                ) : (
                  methods.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between gap-3 p-4 border border-border rounded-lg bg-surface"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-text">
                          {m.label || 'Payment method'} {m.isDefault ? <span className="text-xs text-success">• Default</span> : null}
                        </div>
                        <div className="text-sm text-muted">
                          {m.type === 'card' ? `${m.brand || 'Card'} •••• ${m.last4 || '0000'}` : m.type.replace('_', ' ')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!m.isDefault && (
                          <button
                            type="button"
                            className="text-sm text-warning hover:underline"
                            onClick={() => void makeDefault(m.id)}
                            disabled={saving}
                          >
                            Make default
                          </button>
                        )}
                        <button
                          type="button"
                          className="text-sm text-muted hover:text-text"
                          onClick={() => void remove(m.id)}
                          disabled={saving}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 border border-border rounded-lg bg-surface">
                <h3 className="font-medium text-text">Billing history</h3>
                <p className="text-sm text-muted">Coming next.</p>
              </div>

              <div className="p-4 border border-border rounded-lg bg-surface">
                <h3 className="font-medium text-text">Refund history</h3>
                <p className="text-sm text-muted">Coming next.</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}

