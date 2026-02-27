'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Logo from '@/components/Logo';
import { supabase } from '@/lib/supabaseClient';
import { getOrCreateProfile, routeAfterAuth, upsertProfile, upsertServicePro } from '@/lib/onboarding';
import {
  getActiveServicesAction,
  getActiveSubcategoriesByServiceSlugAction,
  getCategoryIdForServiceSlugAction,
  setMyProSubcategorySelectionsAction,
} from '@/app/actions/services';
import type { Service, ServiceSubcategory } from '@/lib/db/services';

function isInvalidRefreshToken(err: unknown): boolean {
  const msg = (err as { message?: string } | null)?.message ?? '';
  return /invalid refresh token/i.test(msg) || /refresh token not found/i.test(msg);
}

function ProInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next');

  const safeNext = useMemo(() => (nextParam && nextParam.startsWith('/') ? nextParam : null), [nextParam]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [services, setServices] = useState<Service[]>([]);
  const [subcategories, setSubcategories] = useState<ServiceSubcategory[]>([]);
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [primaryServiceSlug, setPrimaryServiceSlug] = useState('');
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<string[]>([]);
  const [serviceAreaZip, setServiceAreaZip] = useState('');

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { user }, error: userErr } = await supabase.auth.getUser();
        if (userErr) {
          if (isInvalidRefreshToken(userErr)) {
            try {
              await supabase.auth.signOut();
            } catch {
              // ignore
            }
          }
          router.replace(
            safeNext
              ? `/auth?next=${encodeURIComponent(safeNext)}&error=${encodeURIComponent('Your session expired. Please sign in again.')}`
              : `/auth?error=${encodeURIComponent('Your session expired. Please sign in again.')}`
          );
          return;
        }
        if (!user) {
          router.replace(safeNext ? `/auth?next=${encodeURIComponent(safeNext)}` : '/auth');
          return;
        }

        const [profile, svcs] = await Promise.all([
          getOrCreateProfile(user.id, user.email ?? null),
          getActiveServicesAction(),
        ]);

        if (!profile) {
          setError('Could not load your profile. Please try again.');
          return;
        }

        if (profile.role !== 'pro') {
          router.replace(routeAfterAuth(profile, safeNext));
          return;
        }

        setServices(svcs);
        setFirstName(profile.first_name || '');
        setLastName(profile.last_name || '');
        setServiceAreaZip(profile.zip_code || '');
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, [router, safeNext]);

  useEffect(() => {
    if (!primaryServiceSlug) {
      setSubcategories([]);
      setSelectedSubcategoryIds([]);
      return;
    }
    let cancelled = false;
    setSubcategoriesLoading(true);
    getActiveSubcategoriesByServiceSlugAction(primaryServiceSlug)
      .then((subs) => {
        if (!cancelled) {
          setSubcategories(subs);
          setSelectedSubcategoryIds([]);
        }
      })
      .finally(() => {
        if (!cancelled) setSubcategoriesLoading(false);
      });
    return () => { cancelled = true; };
  }, [primaryServiceSlug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr) {
        if (isInvalidRefreshToken(userErr)) {
          try {
            await supabase.auth.signOut();
          } catch {
            // ignore
          }
        }
        router.replace('/auth');
        return;
      }
      if (!user) {
        router.replace('/auth');
        return;
      }

      if (!firstName.trim()) {
        setError('Please enter your first name.');
        return;
      }
      if (!lastName.trim()) {
        setError('Please enter your last name.');
        return;
      }
      if (!primaryServiceSlug) {
        setError('Please select a primary service.');
        return;
      }
      if (selectedSubcategoryIds.length === 0) {
        setError('Please select at least one subcategory.');
        return;
      }
      if (!serviceAreaZip.trim()) {
        setError('Please enter a service area zip.');
        return;
      }

      const profileRes = await upsertProfile({
        id: user.id,
        role: 'pro',
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        zip_code: serviceAreaZip.trim(),
        onboarding_step: null,
        email: user.email ?? null,
      });
      if (!profileRes.success) {
        setError(profileRes.error || 'Could not save your info. Please try again.');
        return;
      }

      const categoryId = await getCategoryIdForServiceSlugAction(primaryServiceSlug);
      if (!categoryId) {
        setError('Could not map service to category. Please try again.');
        return;
      }

      const displayName = businessName.trim() || `${firstName.trim()} ${lastName.trim()}`.trim();
      const proRes = await upsertServicePro({
        user_id: user.id,
        display_name: displayName,
        category_id: categoryId,
        secondary_category_id: null,
        service_area_zip: serviceAreaZip.trim(),
      });
      if (!proRes.success) {
        setError(proRes.error || 'Could not save your pro profile. Please try again.');
        return;
      }

      const subRes = await setMyProSubcategorySelectionsAction(primaryServiceSlug, selectedSubcategoryIds);
      if (!subRes.success) {
        setError(subRes.error || 'Could not save your service selections. Please try again.');
        return;
      }
      // Redirect to Stripe Connect onboarding (required to receive payments)
      // Extract final destination (/pro) from /pro/connect?next=X or /api/...?next=X
      const finalNext = (() => {
        if (!safeNext) return '/pro';
        try {
          const u = new URL(safeNext, 'https://x');
          const inner = u.searchParams.get('next');
          if (inner) return inner;
        } catch {
          // ignore
        }
        return safeNext.startsWith('/api/') ? '/pro' : safeNext;
      })();
      window.location.href = `/pro/connect?next=${encodeURIComponent(finalNext)}`;
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-bg via-surface to-bg text-text flex items-center justify-center">
        <div className="text-sm text-muted">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-bg via-surface to-bg text-text">
      <header className="px-4 py-5">
        <div className="max-w-md mx-auto">
          <Logo size="md" linkToHome />
        </div>
      </header>

      <main className="px-4 pb-10">
        <div className="max-w-md mx-auto">
          <div className="rounded-2xl border border-border bg-surface shadow-sm p-6">
            <>
                <div className="flex gap-2 mb-6">
                  {([1, 2, 3, 4] as const).map((s) => (
                    <div
                      key={s}
                      className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-accent' : 'bg-surface2'}`}
                      aria-hidden
                    />
                  ))}
                </div>
                <h1 className="text-xl font-semibold tracking-tight">
                  {step === 1 && 'Step 1: Identity'}
                  {step === 2 && 'Step 2: Primary category'}
                  {step === 3 && 'Step 3: Service area zip'}
                  {step === 4 && 'Step 4: Review & go live'}
                </h1>
                <p className="text-muted mt-1 text-sm">You can add verification and payouts later.</p>

                {error && (
                  <div className="mt-4 rounded-xl border border-red-100 bg-danger/10 px-4 py-3 text-sm text-text">
                    {error}
                  </div>
                )}

                <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                  {step === 1 && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-muted mb-1" htmlFor="firstName">First name</label>
                          <input
                            id="firstName"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            required
                            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-text"
                            placeholder="Sam"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-muted mb-1" htmlFor="lastName">Last name</label>
                          <input
                            id="lastName"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            required
                            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-text"
                            placeholder="Smith"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted mb-1" htmlFor="businessName">Business name</label>
                        <input
                          id="businessName"
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-text"
                          placeholder="ABC Cleaning (what customers see)"
                        />
                        <p className="mt-1 text-xs text-muted">Optional. If blank, your first and last name will be shown.</p>
                      </div>
                    </div>
                  )}
                  {step === 2 && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-muted mb-1">Primary service</label>
                        <div className="space-y-2 mt-2">
                          {services.map((s) => (
                            <label
                              key={s.id}
                              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                                primaryServiceSlug === s.slug ? 'border-accent bg-accent/5' : 'border-border bg-surface hover:border-accent/50'
                              }`}
                            >
                              <input
                                type="radio"
                                name="primaryService"
                                value={s.slug}
                                checked={primaryServiceSlug === s.slug}
                                onChange={() => setPrimaryServiceSlug(s.slug)}
                                className="mt-1"
                              />
                              <div>
                                <span className="font-medium text-text">{s.name}</span>
                                {s.description && (
                                  <p className="text-sm text-muted mt-0.5">{s.description}</p>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                      {primaryServiceSlug && (
                        <div>
                          <label className="block text-sm font-medium text-muted mb-1">
                            Subcategories (select at least one)
                          </label>
                          {subcategoriesLoading ? (
                            <p className="text-sm text-muted">Loading…</p>
                          ) : (
                            <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
                              {subcategories.map((sub) => (
                                <label
                                  key={sub.id}
                                  className="flex items-center gap-3 p-2 rounded-lg border border-border hover:bg-surface2 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedSubcategoryIds.includes(sub.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedSubcategoryIds((prev) => [...prev, sub.id]);
                                      } else {
                                        setSelectedSubcategoryIds((prev) => prev.filter((id) => id !== sub.id));
                                      }
                                    }}
                                  />
                                  <span className="text-text">{sub.name}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                  {step === 3 && (
                    <div>
                      <label className="block text-sm font-medium text-muted mb-1" htmlFor="zip">Service area zip</label>
                      <input
                        id="zip"
                        value={serviceAreaZip}
                        onChange={(e) => setServiceAreaZip(e.target.value)}
                        required
                        className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-text"
                        placeholder="10001"
                        inputMode="numeric"
                      />
                    </div>
                  )}
                  {step === 4 && (
                    <div className="rounded-xl border border-border bg-surface2 p-4 text-sm text-muted">
                      <p><strong className="text-text">Your name:</strong> {firstName} {lastName}</p>
                      <p><strong className="text-text">Business name:</strong> {businessName.trim() || `${firstName} ${lastName}`.trim()}</p>
                      <p><strong className="text-text">Primary service:</strong> {services.find((s) => s.slug === primaryServiceSlug)?.name ?? '—'}</p>
                      <p><strong className="text-text">Subcategories:</strong> {subcategories.filter((s) => selectedSubcategoryIds.includes(s.id)).map((s) => s.name).join(', ') || '—'}</p>
                      <p><strong className="text-text">Service zip:</strong> {serviceAreaZip}</p>
                    </div>
                  )}
                  <div className="flex gap-3">
                    {step > 1 && (
                      <button
                        type="button"
                        onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3 | 4)}
                        className="rounded-xl border border-border px-4 py-3 text-base font-medium text-text"
                      >
                        Back
                      </button>
                    )}
                    {step < 4 ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (step === 1 && (!firstName.trim() || !lastName.trim())) return;
                          if (step === 2 && (!primaryServiceSlug || selectedSubcategoryIds.length === 0)) return;
                          if (step === 3 && !serviceAreaZip.trim()) return;
                          setStep((s) => (s + 1) as 1 | 2 | 3 | 4);
                        }}
                        disabled={
                          (step === 1 && (!firstName.trim() || !lastName.trim())) ||
                          (step === 2 && (!primaryServiceSlug || selectedSubcategoryIds.length === 0 || subcategoriesLoading)) ||
                          (step === 3 && !serviceAreaZip.trim())
                        }
                        className="flex-1 rounded-xl bg-accent px-4 py-3.5 text-base font-medium text-accentContrast disabled:opacity-50"
                      >
                        Next
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex-1 rounded-xl bg-accent px-4 py-3.5 text-base font-medium text-accentContrast disabled:opacity-50"
                      >
                        {saving ? 'Saving…' : 'Go live'}
                      </button>
                    )}
                  </div>
                </form>
            </>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ProOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-bg via-surface to-bg flex items-center justify-center">
          <div className="text-sm text-muted">Loading…</div>
        </div>
      }
    >
      <ProInner />
    </Suspense>
  );
}


