'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { ServicePackagePublic } from '@/types/service-packages';
import Link from 'next/link';

const DELIVERABLE_SLOTS = 5;

function dollarsToCents(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number.parseFloat(t);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

function emptyForm() {
  return {
    title: '',
    shortDescription: '',
    priceDollars: '',
    durationMinutes: '',
    deliverables: ['', '', '', '', ''] as string[],
    isActive: true,
  };
}

export default function ProPackagesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [packages, setPackages] = useState<ServicePackagePublic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/pro/packages', { credentials: 'include' });
      const j = await res.json();
      if (!res.ok) {
        setError(typeof j.error === 'string' ? j.error : 'Could not load packages');
        setPackages([]);
        return;
      }
      setPackages((j.packages as ServicePackagePublic[]) ?? []);
    } catch {
      setError('Could not load packages');
      setPackages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setCreating(true);
    setForm(emptyForm());
    setError(null);
  };

  const openEdit = (pkg: ServicePackagePublic) => {
    setCreating(false);
    setEditingId(pkg.id);
    const d = [...pkg.deliverables];
    while (d.length < DELIVERABLE_SLOTS) d.push('');
    setForm({
      title: pkg.title,
      shortDescription: pkg.short_description ?? '',
      priceDollars: (pkg.base_price_cents / 100).toFixed(2),
      durationMinutes: pkg.estimated_duration_minutes != null ? String(pkg.estimated_duration_minutes) : '',
      deliverables: d.slice(0, DELIVERABLE_SLOTS),
      isActive: pkg.is_active,
    });
    setError(null);
  };

  const cancelForm = () => {
    setCreating(false);
    setEditingId(null);
    setForm(emptyForm());
    setError(null);
  };

  const buildPayload = () => {
    const cents = dollarsToCents(form.priceDollars);
    if (cents == null) {
      setError('Enter a valid base price greater than zero.');
      return null;
    }
    const deliverables = form.deliverables.map((s) => s.trim()).filter(Boolean);
    if (deliverables.length < 1 || deliverables.length > 5) {
      setError("What's included: add 1–5 non-empty items.");
      return null;
    }
    const durRaw = form.durationMinutes.trim();
    let estimated_duration_minutes: number | null = null;
    if (durRaw) {
      const n = Number.parseInt(durRaw, 10);
      if (!Number.isFinite(n) || n <= 0) {
        setError('Estimated duration must be a positive number of minutes, or leave blank.');
        return null;
      }
      estimated_duration_minutes = n;
    }
    return {
      title: form.title,
      short_description: form.shortDescription.trim() || null,
      base_price_cents: cents,
      estimated_duration_minutes,
      deliverables,
      is_active: form.isActive,
    };
  };

  const handleSave = async () => {
    const payload = buildPayload();
    if (!payload) return;
    setSaving(true);
    setError(null);
    try {
      if (creating) {
        const res = await fetch('/api/pro/packages', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const j = await res.json();
        if (!res.ok) {
          setError(typeof j.error === 'string' ? j.error : 'Save failed');
          return;
        }
        cancelForm();
        await load();
        return;
      }
      if (editingId) {
        const res = await fetch(`/api/pro/packages/${encodeURIComponent(editingId)}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const j = await res.json();
        if (!res.ok) {
          setError(typeof j.error === 'string' ? j.error : 'Save failed');
          return;
        }
        cancelForm();
        await load();
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (pkg: ServicePackagePublic) => {
    setError(null);
    const res = await fetch(`/api/pro/packages/${encodeURIComponent(pkg.id)}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !pkg.is_active }),
    });
    const j = await res.json();
    if (!res.ok) {
      setError(typeof j.error === 'string' ? j.error : 'Update failed');
      return;
    }
    if (j.package) {
      setPackages((prev) => prev.map((p) => (p.id === pkg.id ? (j.package as ServicePackagePublic) : p)));
    } else {
      await load();
    }
  };

  const handleDelete = async (pkg: ServicePackagePublic) => {
    if (!window.confirm(`Delete package “${pkg.title}”? This cannot be undone.`)) return;
    setError(null);
    const res = await fetch(`/api/pro/packages/${encodeURIComponent(pkg.id)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    const j = await res.json();
    if (!res.ok) {
      setError(typeof j.error === 'string' ? j.error : 'Delete failed');
      return;
    }
    if (editingId === pkg.id) cancelForm();
    await load();
  };

  const move = async (pkg: ServicePackagePublic, direction: 'up' | 'down') => {
    setError(null);
    const res = await fetch(`/api/pro/packages/${encodeURIComponent(pkg.id)}/move`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction }),
    });
    const j = await res.json();
    if (!res.ok) {
      setError(typeof j.error === 'string' ? j.error : 'Reorder failed');
      return;
    }
    if (j.packages && Array.isArray(j.packages)) {
      setPackages(j.packages as ServicePackagePublic[]);
    } else {
      await load();
    }
  };

  return (
    <AppLayout mode="pro">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Label>PRO</Label>
            <h1 className="text-2xl font-semibold text-text mt-1">Packages</h1>
            <p className="text-sm text-text2 mt-1">
              Simple pre-built offers customers can pick when they book.{' '}
              <Link href="/pro/settings/pricing-availability" className="text-accent underline-offset-2 hover:underline">
                Pricing &amp; services
              </Link>
            </p>
          </div>
          {!creating && !editingId && (
            <Button type="button" variant="primary" showArrow={false} onClick={openCreate}>
              Create package
            </Button>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-text">{error}</div>
        )}

        {(creating || editingId) && (
          <Card padding="lg" className="mb-6">
            <h2 className="text-lg font-semibold text-text mb-4">{creating ? 'Create package' : 'Edit package'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Title *</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Standard lawn cut"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Short description</label>
                <textarea
                  value={form.shortDescription}
                  onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg text-text bg-surface text-sm"
                  placeholder="What makes this package a good fit"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Base price (USD) *</label>
                  <Input
                    inputMode="decimal"
                    value={form.priceDollars}
                    onChange={(e) => setForm((f) => ({ ...f, priceDollars: e.target.value }))}
                    placeholder="99.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Estimated duration (minutes)</label>
                  <Input
                    inputMode="numeric"
                    value={form.durationMinutes}
                    onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-text mb-2">What&apos;s included * (1–5 items)</p>
                <div className="space-y-2">
                  {form.deliverables.map((line, i) => (
                    <Input
                      key={i}
                      value={line}
                      onChange={(e) =>
                        setForm((f) => {
                          const next = [...f.deliverables];
                          next[i] = e.target.value;
                          return { ...f, deliverables: next };
                        })
                      }
                      placeholder={`Deliverable ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="rounded border-border"
                />
                Active (visible to customers when your profile is available)
              </label>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button type="button" variant="primary" showArrow={false} disabled={saving} onClick={() => void handleSave()}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
                <Button type="button" variant="ghost" showArrow={false} disabled={saving} onClick={cancelForm}>
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}

        {loading ? (
          <p className="text-sm text-text2">Loading…</p>
        ) : packages.length === 0 && !creating ? (
          <Card padding="lg">
            <p className="text-text font-medium">No packages yet</p>
            <p className="text-sm text-text2 mt-2">
              Create a package so customers can choose a clear scope when they request you.
            </p>
            <div className="mt-4">
              <Button type="button" variant="secondary" showArrow={false} onClick={openCreate}>
                Create package
              </Button>
            </div>
          </Card>
        ) : (
          <ul className="space-y-3">
            {packages.map((pkg) => (
              <li key={pkg.id}>
                <Card padding="md">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-text">{pkg.title}</p>
                        {!pkg.is_active && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-surface2 border border-border text-text2">
                            Inactive
                          </span>
                        )}
                      </div>
                      {pkg.short_description && (
                        <p className="text-sm text-text2 mt-1">{pkg.short_description}</p>
                      )}
                      <p className="text-sm text-text mt-2">
                        ${(pkg.base_price_cents / 100).toFixed(2)}
                        {pkg.estimated_duration_minutes != null && (
                          <span className="text-text2"> · Est. {pkg.estimated_duration_minutes} min</span>
                        )}
                      </p>
                      {pkg.deliverables.length > 0 && (
                        <ul className="mt-2 text-sm text-text2 list-disc list-inside">
                          {pkg.deliverables.map((d, i) => (
                            <li key={i}>{d}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 sm:items-end">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="text-xs px-2 py-1 border border-border rounded-lg text-text2 hover:bg-hover"
                          onClick={() => void move(pkg, 'up')}
                          aria-label="Move up"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="text-xs px-2 py-1 border border-border rounded-lg text-text2 hover:bg-hover"
                          onClick={() => void move(pkg, 'down')}
                          aria-label="Move down"
                        >
                          ↓
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="secondary" showArrow={false} onClick={() => openEdit(pkg)}>
                          Edit
                        </Button>
                        <Button type="button" variant="ghost" showArrow={false} onClick={() => void toggleActive(pkg)}>
                          {pkg.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button type="button" variant="ghost" showArrow={false} onClick={() => void handleDelete(pkg)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppLayout>
  );
}
