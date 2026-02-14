'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import {
  getCurrentUser,
  getServiceCategories,
  getUserBookingPreferences,
  updateUserBookingPreferences,
  type UserBookingPreferences,
} from '@/lib/api';
import { TrustRow } from '@/components/ui/TrustRow';
import { SignInNotice } from '@/components/ui/SignInNotice';
import { ToggleRow } from '@/components/ui/ToggleRow';

export default function CustomerBookingPreferencesSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string; icon: string }>>([]);
  const [prefs, setPrefs] = useState<UserBookingPreferences>({
    preferredServiceSlugs: [],
    favoriteProIds: [],
    priceMin: null,
    priceMax: null,
    timeWindowStart: null,
    timeWindowEnd: null,
    rebookLastPro: false,
  });

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

      const [cats, p] = await Promise.all([getServiceCategories(), getUserBookingPreferences(user.id)]);
      setCategories(cats);
      setPrefs(p);
      setLoading(false);
    };
    void load();
  }, []);

  async function save() {
    if (!userId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    const res = await updateUserBookingPreferences(userId, prefs);
    if (!res.success) setError(res.error || 'Failed to save booking preferences.');
    else setSuccess('Booking preferences saved.');
    setSaving(false);
  }

  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div>
          <Link href="/customer/settings" className="text-sm text-muted hover:text-text">
            ← Back to Settings
          </Link>
          <h1 className="text-2xl font-semibold text-text mt-3">Booking Preferences</h1>
          <p className="text-muted mt-1">How you like to book.</p>
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
          <Label>PREFERRED SERVICE TYPES</Label>
          {loading ? (
            <p className="mt-4 text-sm text-muted/70">Loading…</p>
          ) : !userId ? (
            <SignInNotice nextHref="/customer/settings/booking-preferences" />
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {categories.map((cat) => {
                const active = prefs.preferredServiceSlugs.includes(cat.slug);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() =>
                      setPrefs((p) => ({
                        ...p,
                        preferredServiceSlugs: active
                          ? p.preferredServiceSlugs.filter((s) => s !== cat.slug)
                          : [...p.preferredServiceSlugs, cat.slug],
                      }))
                    }
                    className={`px-3 py-2 rounded-xl border text-sm transition-colors ${
                      active
                        ? 'bg-accent/15 border-accent/40 text-text'
                        : 'bg-surface border-border text-muted hover:bg-surface2'
                    }`}
                  >
                    {cat.icon} {cat.name}
                  </button>
                );
              })}
              {categories.length === 0 ? (
                <p className="text-sm text-muted/70">No categories available.</p>
              ) : null}
            </div>
          )}
        </Card>

        <Card withRail>
          <Label>PREFERRED PROS (FAVORITES)</Label>
          {!userId ? (
            <SignInNotice nextHref="/customer/settings/booking-preferences" />
          ) : prefs.favoriteProIds.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              No favorites yet. Tap the heart on a pro profile to save them here.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {prefs.favoriteProIds.map((proId) => {
                return (
                  <div
                    key={proId}
                    className="flex items-center justify-between p-3 border border-border rounded-lg bg-surface"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-text">Saved pro</p>
                      <p className="text-xs text-muted/70 truncate">{proId}</p>
                      <Link href={`/customer/pros/${encodeURIComponent(proId)}`} className="text-xs text-accent hover:underline">
                        View profile →
                      </Link>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setPrefs((p) => ({ ...p, favoriteProIds: p.favoriteProIds.filter((x) => x !== proId) }))
                      }
                      className="text-sm text-danger hover:opacity-80"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card withRail>
          <Label>PRICE &amp; TIME</Label>
          {!userId ? (
            <SignInNotice nextHref="/customer/settings/booking-preferences" />
          ) : (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 border border-border rounded-lg bg-surface">
                  <h3 className="font-medium text-text">Price range comfort</h3>
                  <p className="text-sm text-muted">Optional: helps us recommend pros in your range.</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={prefs.priceMin ?? ''}
                      onChange={(e) => setPrefs((p) => ({ ...p, priceMin: e.target.value ? Number(e.target.value) : null }))}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                      placeholder="Min"
                      min="0"
                    />
                    <input
                      type="number"
                      value={prefs.priceMax ?? ''}
                      onChange={(e) => setPrefs((p) => ({ ...p, priceMax: e.target.value ? Number(e.target.value) : null }))}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                      placeholder="Max"
                      min="0"
                    />
                  </div>
                </div>
                <div className="p-4 border border-border rounded-lg bg-surface">
                  <h3 className="font-medium text-text">Time window preferences</h3>
                  <p className="text-sm text-muted">Optional: e.g., “9am” to “1pm”.</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={prefs.timeWindowStart ?? ''}
                      onChange={(e) => setPrefs((p) => ({ ...p, timeWindowStart: e.target.value || null }))}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                      placeholder="Start"
                    />
                    <input
                      type="text"
                      value={prefs.timeWindowEnd ?? ''}
                      onChange={(e) => setPrefs((p) => ({ ...p, timeWindowEnd: e.target.value || null }))}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                      placeholder="End"
                    />
                  </div>
                </div>
              </div>

              <ToggleRow
                title="Re-book last pro"
                description="Prefer rebooking the last pro you worked with when possible."
                checked={prefs.rebookLastPro}
                onChange={(next) => setPrefs((p) => ({ ...p, rebookLastPro: next }))}
              />
            </div>
          )}
        </Card>

        <div className="flex justify-end">
          <Button type="button" onClick={() => void save()} disabled={!userId || saving || loading} showArrow={false}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}

