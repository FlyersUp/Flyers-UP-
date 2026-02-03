'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { deleteUserAddress, getCurrentUser, listUserAddresses, upsertUserAddress, type UserAddress } from '@/lib/api';
import { TrustRow } from '@/components/ui/TrustRow';

export default function CustomerAddressesSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    label: 'home',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    entryNotes: '',
    isDefault: false,
  });

  const isEditing = useMemo(() => editingId !== null, [editingId]);

  async function refresh() {
    setError(null);
    setSuccess(null);
    const user = await getCurrentUser();
    if (!user) {
      setUserId(null);
      setAddresses([]);
      setLoading(false);
      return;
    }
    setUserId(user.id);
    const list = await listUserAddresses(user.id);
    setAddresses(list);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startCreate() {
    setEditingId('new');
    setForm({
      label: 'home',
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      entryNotes: '',
      isDefault: addresses.length === 0, // first address defaults
    });
  }

  function startEdit(addr: UserAddress) {
    setEditingId(addr.id);
    setForm({
      label: addr.label,
      line1: addr.line1,
      line2: addr.line2 || '',
      city: addr.city || '',
      state: addr.state || '',
      postalCode: addr.postalCode || '',
      entryNotes: addr.entryNotes || '',
      isDefault: addr.isDefault,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setError(null);
    setSuccess(null);
  }

  async function save() {
    if (!userId) {
      setError('Not signed in.');
      return;
    }
    if (!form.line1.trim()) {
      setError('Address line 1 is required.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await upsertUserAddress(userId, {
        id: editingId === 'new' ? undefined : (editingId as string),
        label: form.label,
        line1: form.line1.trim(),
        line2: form.line2.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        postalCode: form.postalCode.trim() || null,
        entryNotes: form.entryNotes.trim() || null,
        isDefault: form.isDefault,
      });
      if (!res.success) {
        setError(res.error || 'Failed to save address.');
        return;
      }
      setSuccess('Address saved.');
      setEditingId(null);
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function remove(addr: UserAddress) {
    if (!userId) return;
    if (!confirm('Delete this address?')) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await deleteUserAddress(userId, addr.id);
      if (!res.success) {
        setError(res.error || 'Failed to delete address.');
        return;
      }
      setSuccess('Address deleted.');
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div>
          <Link href="/customer/settings" className="text-sm text-muted hover:text-text">
            ← Back to Settings
          </Link>
          <h1 className="text-2xl font-semibold text-text mt-3">Addresses</h1>
          <p className="text-muted mt-1">Where services happen.</p>
          <div className="mt-3">
            <TrustRow />
          </div>
        </div>

        {error && <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg text-text">{error}</div>}
        {success && <div className="p-4 bg-success/15 border border-success/30 rounded-lg text-text">{success}</div>}

        <Card withRail>
          <div className="flex items-center justify-between">
            <Label>YOUR SAVED LOCATIONS</Label>
            <Button type="button" variant="secondary" showArrow={false} onClick={startCreate} disabled={!userId || saving}>
              Add Address
            </Button>
          </div>

          {loading ? (
            <p className="mt-4 text-sm text-muted/70">Loading…</p>
          ) : !userId ? (
            <p className="mt-4 text-sm text-muted">Sign in to manage addresses.</p>
          ) : addresses.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No saved addresses yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {addresses.map((a) => (
                <div key={a.id} className="p-4 border border-border rounded-lg bg-surface">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-text capitalize">{a.label}</p>
                        {a.isDefault ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-success/15 text-text border border-success/30">
                            Default
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm text-text mt-1">{a.line1}</p>
                      {a.line2 ? <p className="text-sm text-text">{a.line2}</p> : null}
                      <p className="text-sm text-muted mt-1">
                        {[a.city, a.state, a.postalCode].filter(Boolean).join(', ') || '—'}
                      </p>
                      {a.entryNotes ? (
                        <p className="text-xs text-muted/70 mt-2">Entry notes: {a.entryNotes}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="ghost" showArrow={false} onClick={() => startEdit(a)} disabled={saving}>
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        showArrow={false}
                        onClick={() => void remove(a)}
                        className="text-red-600 hover:text-text"
                        disabled={saving}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {isEditing && (
          <Card withRail>
            <Label>{editingId === 'new' ? 'ADD ADDRESS' : 'EDIT ADDRESS'}</Label>
            <div className="mt-4 space-y-3">
              <Input
                label="Label"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="home / work / other"
              />
              <Input
                label="Address line 1"
                value={form.line1}
                onChange={(e) => setForm((f) => ({ ...f, line1: e.target.value }))}
                placeholder="123 Main St"
              />
              <Input
                label="Address line 2"
                value={form.line2}
                onChange={(e) => setForm((f) => ({ ...f, line2: e.target.value }))}
                placeholder="Apt / Suite"
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="City"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                />
                <Input
                  label="State"
                  value={form.state}
                  onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                />
                <Input
                  label="Postal code"
                  value={form.postalCode}
                  onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))}
                />
              </div>
              <Input
                label="Entry notes (gate code, pets, parking)"
                value={form.entryNotes}
                onChange={(e) => setForm((f) => ({ ...f, entryNotes: e.target.value }))}
                placeholder="e.g., gate code 1234, dog friendly"
              />

              <label className="flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                />
                Make this my default address
              </label>

              <div className="flex gap-3 justify-end">
                <Button type="button" variant="secondary" showArrow={false} onClick={cancelEdit} disabled={saving}>
                  Cancel
                </Button>
                <Button type="button" showArrow={false} onClick={() => void save()} disabled={saving || !userId}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

