'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Logo from '@/components/Logo';
import { supabase } from '@/lib/supabaseClient';
import { getOrCreateProfile, routeAfterAuth, upsertProfile, upsertServicePro } from '@/lib/onboarding';
import { getOccupationsAction } from '@/app/actions/occupations';
import {
  getServicesByOccupationIdAction,
  setProOccupationAndServicesAction,
  getCategoryIdForOccupationSlugAction,
} from '@/app/actions/proOnboarding';
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress';
import type { OccupationRow } from '@/lib/occupationData';
import type { OccupationServiceRow } from '@/lib/occupationData';

function isInvalidRefreshToken(err: unknown): boolean {
  const msg = (err as { message?: string } | null)?.message ?? '';
  return /invalid refresh token/i.test(msg) || /refresh token not found/i.test(msg);
}

type Step = 2 | 3 | 4; // Role=1 done on role page; Pro flow: Occupation(2), Services(3), Setup(4)

function ProInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next');

  const safeNext = useMemo(() => (nextParam && nextParam.startsWith('/') ? nextParam : null), [nextParam]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState<Step>(2);
  const [occupations, setOccupations] = useState<OccupationRow[]>([]);
  const [services, setServices] = useState<OccupationServiceRow[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [occupationSearch, setOccupationSearch] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [selectedOccupationSlug, setSelectedOccupationSlug] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [serviceAreaZip, setServiceAreaZip] = useState('');

  const selectedOccupation = selectedOccupationSlug ? occupations.find((o) => o.slug === selectedOccupationSlug) : null;
  const selectedOccupationId = selectedOccupation?.id ?? null;

  const filteredOccupations = useMemo(() => {
    const q = occupationSearch.trim().toLowerCase();
    if (!q) return occupations;
    return occupations.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        (o.description?.toLowerCase().includes(q) ?? false)
    );
  }, [occupations, occupationSearch]);

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
              /* ignore */
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

        const [profile, occs] = await Promise.all([
          getOrCreateProfile(user.id, user.email ?? null),
          getOccupationsAction(),
        ]);

        if (!profile) {
          setError('Could not load your profile. Please try again.');
          return;
        }

        if (profile.role !== 'pro') {
          router.replace(routeAfterAuth(profile, safeNext));
          return;
        }

        setOccupations(occs);
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
    if (!selectedOccupationId) {
      setServices([]);
      setSelectedServiceIds([]);
      return;
    }
    let cancelled = false;
    setServicesLoading(true);
    getServicesByOccupationIdAction(selectedOccupationId)
      .then((svcs) => {
        if (!cancelled) {
          setServices(svcs);
          setSelectedServiceIds([]);
        }
      })
      .finally(() => {
        if (!cancelled) setServicesLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedOccupationId]);

  async function handleContinueForNow() {
    await saveAndRedirect('/pro');
  }

  async function handleSetUpNow() {
    const finalNext = (() => {
      if (!safeNext) return '/pro';
      try {
        const u = new URL(safeNext, 'https://x');
        const inner = u.searchParams.get('next');
        if (inner) return inner;
      } catch {
        /* ignore */
      }
      return safeNext.startsWith('/api/') ? '/pro' : safeNext;
    })();
    await saveAndRedirect(`/pro/connect?next=${encodeURIComponent(finalNext)}`);
  }

  async function saveAndRedirect(destination: string) {
    setSaving(true);
    setError(null);
    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) {
        router.replace('/auth');
        return;
      }

      if (!firstName.trim() || !lastName.trim()) {
        setError('Please enter your first and last name.');
        return;
      }
      if (!selectedOccupationId || !selectedOccupationSlug) {
        setError('Please select an occupation.');
        return;
      }
      if (selectedServiceIds.length === 0) {
        setError('Select at least one service to continue.');
        return;
      }
      if (!serviceAreaZip.trim()) {
        setError('Please enter a service area zip code.');
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

      const categoryId = await getCategoryIdForOccupationSlugAction(selectedOccupationSlug);
      if (!categoryId) {
        setError('Could not map occupation to category. Please try again.');
        return;
      }

      const displayName = businessName.trim() || `${firstName.trim()} ${lastName.trim()}`.trim();
      const proRes = await upsertServicePro({
        user_id: user.id,
        display_name: displayName,
        category_id: categoryId,
        secondary_category_id: null,
        service_area_zip: serviceAreaZip.trim(),
        occupation_id: selectedOccupationId,
      });
      if (!proRes.success) {
        setError(proRes.error || 'Could not save your pro profile. Please try again.');
        return;
      }

      const svcRes = await setProOccupationAndServicesAction(selectedOccupationId, selectedServiceIds);
      if (!svcRes.success) {
        setError(svcRes.error || 'Could not save your service selections. Please try again.');
        return;
      }

      window.location.href = destination;
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const canProceedOccupation = !!selectedOccupationSlug;
  const canProceedServices = selectedServiceIds.length > 0 && !servicesLoading;
  const canProceedSetup =
    !!firstName.trim() && !!lastName.trim() && !!serviceAreaZip.trim();

  function goNext() {
    if (step === 2 && !canProceedOccupation) return;
    if (step === 3 && !canProceedServices) return;
    setStep((s) => Math.min(4, s + 1) as Step);
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
        <div className="max-w-lg mx-auto">
          <Logo size="md" linkToHome />
        </div>
      </header>

      <main className="px-4 pb-12">
        <div className="max-w-lg mx-auto">
          <OnboardingProgress currentStep={step} />

          <div className="rounded-2xl border border-border bg-surface shadow-sm p-6 sm:p-8">
            <h1 className="text-2xl font-semibold tracking-tight">
              {step === 2 && 'Choose your occupation'}
              {step === 3 && 'Select your services'}
              {step === 4 && 'Almost there'}
            </h1>
            <p className="text-muted mt-2">
              {step === 2 && 'Select the occupation that best describes what you do.'}
              {step === 3 && 'Pick the services you offer. You can add more later.'}
              {step === 4 && 'Verification and payouts can be completed later.'}
            </p>

            {error && (
              <div className="mt-4 rounded-xl border border-red-100 bg-danger/10 px-4 py-3 text-sm text-text">
                {error}
              </div>
            )}

            {/* Step 2: Occupation */}
            {step === 2 && (
              <div className="mt-6 space-y-4">
                <input
                  type="search"
                  value={occupationSearch}
                  onChange={(e) => setOccupationSearch(e.target.value)}
                  placeholder="Search occupations…"
                  className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-text placeholder:text-muted"
                  aria-label="Search occupations"
                />
                <div className="space-y-3">
                  {filteredOccupations.map((occ) => (
                    <button
                      key={occ.id}
                      type="button"
                      onClick={() => setSelectedOccupationSlug(occ.slug)}
                      className={`w-full text-left rounded-2xl border-2 p-5 sm:p-6 transition-all duration-200 ${
                        selectedOccupationSlug === occ.slug
                          ? 'border-accent bg-accent/10 shadow-sm'
                          : 'border-border bg-surface hover:border-accent/50 hover:bg-surface2'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {occ.icon && (
                          <span className="text-3xl sm:text-4xl leading-none shrink-0">{occ.icon}</span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-lg text-text">{occ.name}</div>
                          {occ.description && (
                            <div className="text-muted mt-1 text-sm">{occ.description}</div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                {filteredOccupations.length === 0 && (
                  <p className="text-sm text-muted py-4 text-center">No occupations match your search.</p>
                )}
              </div>
            )}

            {/* Step 3: Services */}
            {step === 3 && (
              <div className="mt-6">
                {!selectedOccupation ? (
                  <p className="text-sm text-muted">Select an occupation first.</p>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-4 p-4 rounded-xl bg-surface2/50 border border-border">
                      {selectedOccupation.icon && (
                        <span className="text-2xl">{selectedOccupation.icon}</span>
                      )}
                      <span className="font-medium text-text">{selectedOccupation.name}</span>
                    </div>
                    <label className="block text-sm font-medium text-muted mb-3">
                      Select the services you offer (at least one)
                    </label>
                    {servicesLoading ? (
                      <p className="text-sm text-muted py-6">Loading services…</p>
                    ) : services.length === 0 ? (
                      <div className="rounded-xl border border-border bg-surface2/30 p-8 text-center">
                        <p className="text-muted">No services added yet for this occupation.</p>
                        <p className="text-xs text-muted mt-1">Check back later or contact support.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {services.map((svc) => (
                          <label
                            key={svc.id}
                            className="flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-surface2 cursor-pointer transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent/5"
                          >
                            <input
                              type="checkbox"
                              checked={selectedServiceIds.includes(svc.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedServiceIds((prev) => [...prev, svc.id]);
                                } else {
                                  setSelectedServiceIds((prev) => prev.filter((id) => id !== svc.id));
                                }
                              }}
                              className="rounded border-border size-5 shrink-0"
                            />
                            <div>
                              <span className="text-text font-medium">{svc.name}</span>
                              {svc.description && (
                                <span className="text-muted text-sm block mt-0.5">{svc.description}</span>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Step 4: Setup (Verification + Payouts) */}
            {step === 4 && (
              <div className="mt-6 space-y-6">
                <div className="rounded-xl border border-border bg-surface2/30 p-4 space-y-4">
                  <p className="text-sm font-medium text-text">Basic info</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1" htmlFor="firstName">
                        First name
                      </label>
                      <input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text"
                        placeholder="Sam"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1" htmlFor="lastName">
                        Last name
                      </label>
                      <input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text"
                        placeholder="Smith"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1" htmlFor="businessName">
                      Business name (optional)
                    </label>
                    <input
                      id="businessName"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text"
                      placeholder="ABC Cleaning"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1" htmlFor="zip">
                      Service area zip code
                    </label>
                    <input
                      id="zip"
                      value={serviceAreaZip}
                      onChange={(e) => setServiceAreaZip(e.target.value)}
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text"
                      placeholder="10001"
                      inputMode="numeric"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-sm font-medium text-text">Complete these when you&apos;re ready</p>

                  <div className="rounded-2xl border-2 border-border bg-surface p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                      <span className="text-2xl">✓</span>
                      <div>
                        <h3 className="font-semibold text-text">Verification</h3>
                        <p className="text-sm text-muted mt-1">
                          May be required for trust features or eligibility. Complete when prompted.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border-2 border-border bg-surface p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                      <span className="text-2xl">💳</span>
                      <div>
                        <h3 className="font-semibold text-text">Payout setup</h3>
                        <p className="text-sm text-muted mt-1">
                          Required before receiving payouts. Connect your bank account when you&apos;re ready.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleContinueForNow}
                    disabled={!canProceedSetup || saving}
                    className="w-full rounded-xl border-2 border-accent bg-accent px-4 py-4 text-base font-medium text-accentContrast hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  >
                    {saving ? 'Saving…' : 'Continue for now'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSetUpNow}
                    disabled={!canProceedSetup || saving}
                    className="w-full rounded-xl border-2 border-border bg-surface px-4 py-4 text-base font-medium text-text hover:bg-surface2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Set up payouts now
                  </button>
                </div>
              </div>
            )}

            {/* Navigation: Back + Next (steps 2 & 3 only) */}
            {(step === 2 || step === 3) && (
              <div className="flex gap-3 mt-8 pt-6 border-t border-border">
                {step > 2 && (
                  <button
                    type="button"
                    onClick={() => setStep((s) => Math.max(2, s - 1) as Step)}
                    className="rounded-xl border border-border px-4 py-3 text-base font-medium text-text hover:bg-surface2"
                  >
                    Back
                  </button>
                )}
                <div className="flex-1 space-y-1">
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={
                      (step === 2 && !canProceedOccupation) ||
                      (step === 3 && !canProceedServices)
                    }
                    className="w-full rounded-xl bg-accent px-4 py-4 text-base font-medium text-accentContrast hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  >
                    Next
                  </button>
                  {step === 3 && !canProceedServices && selectedOccupation && (
                    <p className="text-xs text-muted text-center mt-1">
                      Select at least one service to continue.
                    </p>
                  )}
                </div>
              </div>
            )}
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
