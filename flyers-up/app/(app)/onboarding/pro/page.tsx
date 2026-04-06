'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Logo from '@/components/Logo';
import { supabase } from '@/lib/supabaseClient';
import { getOrCreateProfile, routeAfterAuth, upsertProfile, upsertServicePro } from '@/lib/onboarding';
import { getProProfile, updateProProfile } from '@/lib/proProfile';
import { getOccupationsAction } from '@/app/actions/occupations';
import {
  getServicesByOccupationIdAction,
  setProOccupationAndServicesAction,
  getCategoryIdForOccupationSlugAction,
} from '@/app/actions/proOnboarding';
import { setProSpecialtiesAction } from '@/app/actions/proSpecialties';
import { createAddonsBulkAction } from '@/app/actions/addons';
import { updateMyServiceProAction } from '@/app/actions/servicePro';
import { ProOnboardingProgress, type ProOnboardingStep } from '@/components/onboarding/ProOnboardingProgress';
import { SpecialtyTagInput } from '@/components/onboarding/SpecialtyTagInput';
import { AddOnBuilder, type AddOnDraft } from '@/components/onboarding/AddOnBuilder';
import { OccupationServicesChecklist } from '@/components/onboarding/OccupationServicesChecklist';
import {
  defaultBusinessHoursModel,
  parseBusinessHoursModel,
  stringifyBusinessHoursModel,
  validateWeeklyHours,
  type WeeklyHours,
} from '@/lib/utils/businessHours';
import type { OccupationRow } from '@/lib/occupationData';
import type { OccupationServiceRow } from '@/lib/occupationData';

function isInvalidRefreshToken(err: unknown): boolean {
  const msg = (err as { message?: string } | null)?.message ?? '';
  return /invalid refresh token/i.test(msg) || /refresh token not found/i.test(msg);
}

function safeNum(s: string): number | null {
  const v = s.trim();
  if (v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function ProInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next');
  const safeNext = useMemo(() => (nextParam && nextParam.startsWith('/') ? nextParam : null), [nextParam]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<ProOnboardingStep>(1);

  const [occupations, setOccupations] = useState<OccupationRow[]>([]);
  const [services, setServices] = useState<OccupationServiceRow[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [occupationSearch, setOccupationSearch] = useState('');
  const [selectedOccupationSlug, setSelectedOccupationSlug] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [specialtyLabels, setSpecialtyLabels] = useState<string[]>([]);
  const [addonDrafts, setAddonDrafts] = useState<AddOnDraft[]>([]);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [intro, setIntro] = useState('');

  const [serviceAreaZip, setServiceAreaZip] = useState('');
  const [serviceRadiusMiles, setServiceRadiusMiles] = useState('25');
  const [travelFeeEnabled, setTravelFeeEnabled] = useState(false);
  const [travelFeeBase, setTravelFeeBase] = useState('');

  const [weekly, setWeekly] = useState<WeeklyHours>(defaultBusinessHoursModel().weekly);
  const [sameDayBookings, setSameDayBookings] = useState(false);

  const [startingPrice, setStartingPrice] = useState('');
  const [minJobPrice, setMinJobPrice] = useState('');
  const [depositPercent, setDepositPercent] = useState(50);

  const selectedOccupation = selectedOccupationSlug ? occupations.find((o) => o.slug === selectedOccupationSlug) : null;
  const selectedOccupationId = selectedOccupation?.id ?? null;

  const filteredOccupations = useMemo(() => {
    const q = occupationSearch.trim().toLowerCase();
    if (!q) return occupations;
    return occupations.filter((o) => o.name.toLowerCase().includes(q) || (o.description?.toLowerCase().includes(q) ?? false));
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
          router.replace(safeNext ? `/auth?next=${encodeURIComponent(safeNext)}&error=${encodeURIComponent('Your session expired. Please sign in again.')}` : `/auth?error=${encodeURIComponent('Your session expired. Please sign in again.')}`);
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

  async function handleLaunch() {
    await saveAll('/pro');
  }

  async function handleSetUpPayoutNow() {
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
    await saveAll(`/pro/connect?next=${encodeURIComponent(finalNext)}`);
  }

  async function saveAll(destination: string) {
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
        setSaving(false);
        return;
      }
      if (!selectedOccupationId || !selectedOccupationSlug) {
        setError('Please select an occupation.');
        setSaving(false);
        return;
      }
      if (selectedServiceIds.length === 0) {
        setError('Select at least one service to continue.');
        setSaving(false);
        return;
      }
      if (!serviceAreaZip.trim()) {
        setError('Please enter a service area zip code.');
        setSaving(false);
        return;
      }

      const sr = safeNum(serviceRadiusMiles);
      if (sr === null || sr <= 0) {
        setError('Service radius must be greater than 0 miles.');
        setSaving(false);
        return;
      }

      const scheduleErr = validateWeeklyHours(weekly);
      if (scheduleErr) {
        setError(scheduleErr);
        setSaving(false);
        return;
      }

      const sp = safeNum(startingPrice);
      if (sp === null || sp <= 0) {
        setError('Starting price is required and must be greater than 0.');
        setSaving(false);
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
        setSaving(false);
        return;
      }

      const categoryId = await getCategoryIdForOccupationSlugAction(selectedOccupationSlug);
      if (!categoryId) {
        setError('Could not map occupation to category. Please try again.');
        setSaving(false);
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
        setSaving(false);
        return;
      }

      const svcRes = await setProOccupationAndServicesAction(selectedOccupationId, selectedServiceIds);
      if (!svcRes.success) {
        setError(svcRes.error || 'Could not save your service selections. Please try again.');
        setSaving(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? undefined;

      if (specialtyLabels.length > 0) {
        const specRes = await setProSpecialtiesAction(specialtyLabels, token);
        if (!specRes.success) {
          setError(specRes.error || 'Could not save specialties. Please try again.');
          setSaving(false);
          return;
        }
      }

      const activeAddons = addonDrafts.filter((a) => a.title.trim() && a.isActive !== false);
      if (activeAddons.length > 0) {
        const addonPayload = activeAddons.map((a) => ({
          title: a.title.trim(),
          priceDollars: parseFloat(a.priceDollars) || 0,
          description: a.description || undefined,
          isActive: true,
        }));
        const addonRes = await createAddonsBulkAction(addonPayload, selectedOccupationSlug, token);
        if (!addonRes.success) {
          setError(addonRes.error || 'Could not save add-ons. Please try again.');
          setSaving(false);
          return;
        }
      }

      const dp = Math.max(20, Math.min(80, Math.round(depositPercent)));
      const profilePayload = {
        starting_price: sp,
        min_job_price: safeNum(minJobPrice) ?? undefined,
        service_radius_miles: sr,
        travel_fee_enabled: travelFeeEnabled,
        travel_fee_base: travelFeeEnabled ? safeNum(travelFeeBase) ?? undefined : null,
        same_day_bookings: sameDayBookings,
        deposit_percent_default: dp,
        deposit_percent_min: 20,
        deposit_percent_max: 80,
      };
      const profRes = await updateProProfile(user.id, profilePayload);
      if (!profRes.success) {
        setError(profRes.error || 'Could not save pricing. Please try again.');
        setSaving(false);
        return;
      }

      await updateMyServiceProAction(
        {
          service_radius: sr,
          business_hours: stringifyBusinessHoursModel({ version: 1, weekly }),
          same_day_available: sameDayBookings,
        },
        token
      );

      const { data: proRow } = await supabase.from('service_pros').select('id').eq('user_id', user.id).maybeSingle();
      if (proRow?.id && intro.trim()) {
        await supabase.from('service_pros').update({ bio: intro.trim() }).eq('id', proRow.id);
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
  const canProceedServiceArea = !!serviceAreaZip.trim();
  const canProceedAvailability = true;
  const canProceedPricing = (safeNum(startingPrice) ?? 0) > 0;
  const canProceedProfile = !!firstName.trim() && !!lastName.trim();
  const canProceedLaunch = canProceedProfile && canProceedServiceArea && canProceedPricing;

  function goNext() {
    if (step === 2 && !canProceedOccupation) return;
    if (step === 3 && !canProceedServices) return;
    if (step === 4 && !canProceedServiceArea) return;
    if (step === 6 && !canProceedPricing) return;
    setStep((s) => Math.min(10, s + 1) as ProOnboardingStep);
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
          <ProOnboardingProgress currentStep={step} />

          <div className="rounded-2xl border border-border bg-surface shadow-sm p-6 sm:p-8">
            {/* Step 1 — Welcome */}
            {step === 1 && (
              <>
                <h1 className="text-2xl font-semibold tracking-tight">Build your service business</h1>
                <p className="text-muted mt-2">
                  Flyers Up is different. Take control of your schedule, protect your time with clear pricing, and build repeat customers—not algorithm dependence.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-text">
                  <li className="flex items-start gap-2">
                    <span className="text-accent">✓</span>
                    <span>Set your minimums and travel fees—no hidden math</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent">✓</span>
                    <span>Customers can rebook you directly</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent">✓</span>
                    <span>Structured bookings before chat—less back-and-forth</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent">✓</span>
                    <span>Clear rules. No surprises.</span>
                  </li>
                </ul>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="mt-6 w-full rounded-xl bg-accent px-4 py-4 text-base font-medium text-accentContrast hover:opacity-95 active:scale-[0.98] transition-all"
                >
                  Build my Pro profile
                </button>
              </>
            )}

            {/* Step 2 — Occupation */}
            {step === 2 && (
              <>
                <h1 className="text-2xl font-semibold tracking-tight">Choose your occupation</h1>
                <p className="text-muted mt-2">Select the occupation that best describes what you do.</p>
                {error && (
                  <div className="mt-4 rounded-xl border border-red-100 bg-danger/10 px-4 py-3 text-sm text-text">{error}</div>
                )}
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
                        className={`w-full text-left rounded-2xl border-2 p-5 sm:p-6 transition-all duration-200 active:scale-[0.99] ${
                          selectedOccupationSlug === occ.slug
                            ? 'border-accent bg-accent/20 shadow-md ring-2 ring-accent/30'
                            : 'border-border bg-surface hover:border-accent/50 hover:bg-surface2 active:bg-surface2'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          {occ.icon && <span className="text-3xl sm:text-4xl leading-none shrink-0">{occ.icon}</span>}
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-lg text-text">{occ.name}</div>
                            {occ.description && <div className="text-muted mt-1 text-sm">{occ.description}</div>}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  {filteredOccupations.length === 0 && (
                    <p className="text-sm text-muted py-4 text-center">No occupations match your search.</p>
                  )}
                </div>
                <div className="flex gap-3 mt-8 pt-6 border-t border-border">
                  <button type="button" onClick={() => setStep(1)} className="rounded-xl border border-border px-4 py-3 text-base font-medium text-text hover:bg-surface2">
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={!canProceedOccupation}
                    className="flex-1 rounded-xl bg-accent px-4 py-4 text-base font-medium text-accentContrast hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue
                  </button>
                </div>
              </>
            )}

            {/* Step 3 — Services + Add-ons */}
            {step === 3 && (
              <>
                <h1 className="text-2xl font-semibold tracking-tight">Choose services you offer</h1>
                <p className="text-muted mt-2">Pick the services customers can book. Add optional extras they can choose during booking.</p>
                {error && (
                  <div className="mt-4 rounded-xl border border-red-100 bg-danger/10 px-4 py-3 text-sm text-text">{error}</div>
                )}
                <div className="mt-6 space-y-6">
                  {selectedOccupation && (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-surface2/50 border border-border">
                      {selectedOccupation.icon && <span className="text-2xl">{selectedOccupation.icon}</span>}
                      <span className="font-medium text-text">{selectedOccupation.name}</span>
                    </div>
                  )}
                  {!selectedOccupation ? (
                    <p className="text-sm text-muted">Select an occupation first.</p>
                  ) : (
                    <OccupationServicesChecklist
                      services={services}
                      selectedIds={selectedServiceIds}
                      onChangeSelectedIds={setSelectedServiceIds}
                      loading={servicesLoading}
                    />
                  )}
                  {selectedOccupation && (
                    <div>
                      <p className="text-sm font-medium text-muted mb-2">Optional add-ons</p>
                      <AddOnBuilder addons={addonDrafts} onChange={setAddonDrafts} compact />
                    </div>
                  )}
                </div>
                <div className="flex gap-3 mt-8 pt-6 border-t border-border">
                  <button type="button" onClick={() => setStep(2)} className="rounded-xl border border-border px-4 py-3 text-base font-medium text-text hover:bg-surface2">
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={!canProceedServices}
                    className="flex-1 rounded-xl bg-accent px-4 py-4 text-base font-medium text-accentContrast hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue
                  </button>
                </div>
              </>
            )}

            {/* Step 4 — Service Area + Travel */}
            {step === 4 && (
              <>
                <h1 className="text-2xl font-semibold tracking-tight">Service area + travel</h1>
                <p className="text-muted mt-2">Set the area you actually want to serve. Add travel pricing for longer trips.</p>
                {error && (
                  <div className="mt-4 rounded-xl border border-red-100 bg-danger/10 px-4 py-3 text-sm text-text">{error}</div>
                )}
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-muted mb-1">Service area ZIP code</label>
                    <input
                      value={serviceAreaZip}
                      onChange={(e) => setServiceAreaZip(e.target.value)}
                      placeholder="e.g., 10001"
                      inputMode="numeric"
                      className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-text"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted mb-1">Travel radius (miles)</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={serviceRadiusMiles}
                      onChange={(e) => setServiceRadiusMiles(e.target.value)}
                      className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-text"
                    />
                  </div>
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-border cursor-pointer hover:bg-surface2">
                    <input
                      type="checkbox"
                      checked={travelFeeEnabled}
                      onChange={(e) => setTravelFeeEnabled(e.target.checked)}
                      className="rounded border-border size-5"
                    />
                    <span className="text-text">Charge travel fee for longer trips</span>
                  </label>
                  {travelFeeEnabled && (
                    <div>
                      <label className="block text-sm font-medium text-muted mb-1">Base travel fee ($)</label>
                      <input
                        type="number"
                        min={0}
                        value={travelFeeBase}
                        onChange={(e) => setTravelFeeBase(e.target.value)}
                        placeholder="e.g., 25"
                        className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-text"
                      />
                    </div>
                  )}
                </div>
                <div className="flex gap-3 mt-8 pt-6 border-t border-border">
                  <button type="button" onClick={() => setStep(3)} className="rounded-xl border border-border px-4 py-3 text-base font-medium text-text hover:bg-surface2">
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={!canProceedServiceArea}
                    className="flex-1 rounded-xl bg-accent px-4 py-4 text-base font-medium text-accentContrast hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Set my service area
                  </button>
                </div>
              </>
            )}

            {/* Step 5 — Availability */}
            {step === 5 && (
              <>
                <h1 className="text-2xl font-semibold tracking-tight">When you&apos;re available</h1>
                <p className="text-muted mt-2">Set your weekly schedule. Customers will only see times you&apos;re open.</p>
                {error && (
                  <div className="mt-4 rounded-xl border border-red-100 bg-danger/10 px-4 py-3 text-sm text-text">{error}</div>
                )}
                <div className="mt-6 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const).map((d) => {
                      const day = weekly[d];
                      const labels: Record<string, string> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
                      return (
                        <div key={d} className="rounded-xl border border-border p-3">
                          <label className="flex items-center gap-2 mb-2">
                            <input
                              type="checkbox"
                              checked={day.enabled}
                              onChange={(e) => setWeekly((w) => ({ ...w, [d]: { ...w[d], enabled: e.target.checked } }))}
                              className="rounded size-4"
                            />
                            <span className="text-sm font-medium">{labels[d]}</span>
                          </label>
                          {day.enabled && (
                            <div className="flex gap-2 text-xs">
                              <input
                                type="time"
                                value={day.start}
                                onChange={(e) => setWeekly((w) => ({ ...w, [d]: { ...w[d], start: e.target.value } }))}
                                className="flex-1 rounded border border-border px-2 py-1"
                              />
                              <input
                                type="time"
                                value={day.end}
                                onChange={(e) => setWeekly((w) => ({ ...w, [d]: { ...w[d], end: e.target.value } }))}
                                className="flex-1 rounded border border-border px-2 py-1"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-border cursor-pointer hover:bg-surface2">
                    <input type="checkbox" checked={sameDayBookings} onChange={(e) => setSameDayBookings(e.target.checked)} className="rounded size-5" />
                    <span className="text-text">Allow same-day bookings</span>
                  </label>
                </div>
                <div className="flex gap-3 mt-8 pt-6 border-t border-border">
                  <button type="button" onClick={() => setStep(4)} className="rounded-xl border border-border px-4 py-3 text-base font-medium text-text hover:bg-surface2">
                    Back
                  </button>
                  <button type="button" onClick={goNext} className="flex-1 rounded-xl bg-accent px-4 py-4 text-base font-medium text-accentContrast hover:opacity-95">
                    Continue
                  </button>
                </div>
              </>
            )}

            {/* Step 6 — Pricing */}
            {step === 6 && (
              <>
                <h1 className="text-2xl font-semibold tracking-tight">Protect your time with pricing</h1>
                <p className="text-muted mt-2">Set your minimum and starting price. Preview what you take home.</p>
                {error && (
                  <div className="mt-4 rounded-xl border border-red-100 bg-danger/10 px-4 py-3 text-sm text-text">{error}</div>
                )}
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-muted mb-1">Starting price ($)</label>
                    <input
                      type="number"
                      min={1}
                      value={startingPrice}
                      onChange={(e) => setStartingPrice(e.target.value)}
                      placeholder="e.g., 75"
                      className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-text"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted mb-1">Minimum job price ($) — optional</label>
                    <input
                      type="number"
                      min={0}
                      value={minJobPrice}
                      onChange={(e) => setMinJobPrice(e.target.value)}
                      placeholder="Protect your time"
                      className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-text"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted mb-1">Deposit (% of total)</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={20}
                        max={80}
                        value={depositPercent}
                        onChange={(e) => setDepositPercent(Number(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium w-12">{depositPercent}%</span>
                    </div>
                  </div>
                  {(safeNum(startingPrice) ?? 0) > 0 && (
                    <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
                      <p className="text-sm font-medium text-text">Earnings preview</p>
                      <p className="text-2xl font-bold text-accent mt-1">${(safeNum(startingPrice) ?? 0)}</p>
                      <p className="text-xs text-muted mt-1">You keep what you earn. Platform fee applies to customer payment.</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 mt-8 pt-6 border-t border-border">
                  <button type="button" onClick={() => setStep(5)} className="rounded-xl border border-border px-4 py-3 text-base font-medium text-text hover:bg-surface2">
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={!canProceedPricing}
                    className="flex-1 rounded-xl bg-accent px-4 py-4 text-base font-medium text-accentContrast hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue
                  </button>
                </div>
              </>
            )}

            {/* Step 7 — Profile / Trust */}
            {step === 7 && (
              <>
                <h1 className="text-2xl font-semibold tracking-tight">Your storefront</h1>
                <p className="text-muted mt-2">Help customers trust you. Add a business name and intro. Specialties and photos can be added later.</p>
                {error && (
                  <div className="mt-4 rounded-xl border border-red-100 bg-danger/10 px-4 py-3 text-sm text-text">{error}</div>
                )}
                <div className="mt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-muted mb-1">First name</label>
                      <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Sam" className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted mb-1">Last name</label>
                      <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Smith" className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted mb-1">Business name (optional)</label>
                    <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="ABC Cleaning" className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted mb-1">Short intro (optional)</label>
                    <textarea value={intro} onChange={(e) => setIntro(e.target.value)} placeholder="A few sentences about your experience and what you offer..." rows={3} className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text" />
                  </div>
                  {selectedOccupation && (
                    <div>
                      <label className="block text-sm font-medium text-muted mb-2">Specialties (optional)</label>
                      <SpecialtyTagInput value={specialtyLabels} onChange={setSpecialtyLabels} occupationSlug={selectedOccupationSlug} />
                    </div>
                  )}
                </div>
                <div className="flex gap-3 mt-8 pt-6 border-t border-border">
                  <button type="button" onClick={() => setStep(6)} className="rounded-xl border border-border px-4 py-3 text-base font-medium text-text hover:bg-surface2">
                    Back
                  </button>
                  <button type="button" onClick={goNext} className="flex-1 rounded-xl bg-accent px-4 py-4 text-base font-medium text-accentContrast hover:opacity-95">
                    Continue
                  </button>
                </div>
              </>
            )}

            {/* Step 8 — Payout */}
            {step === 8 && (
              <>
                <h1 className="text-2xl font-semibold tracking-tight">Payout setup</h1>
                <p className="text-muted mt-2">Connect your bank account to receive payments. We use Stripe—secure and trusted by millions.</p>
                <div className="mt-6 space-y-4">
                  <div className="rounded-xl border border-border bg-surface2/30 p-4">
                    <p className="text-sm text-text">• Secure connection via Stripe Connect</p>
                    <p className="text-sm text-text mt-1">• You get paid after each completed job</p>
                    <p className="text-sm text-text mt-1">• You can complete this step now or later</p>
                  </div>
                </div>
                <div className="flex gap-3 mt-8 pt-6 border-t border-border">
                  <button type="button" onClick={() => setStep(7)} className="rounded-xl border border-border px-4 py-3 text-base font-medium text-text hover:bg-surface2">
                    Back
                  </button>
                  <button type="button" onClick={goNext} className="flex-1 rounded-xl bg-accent px-4 py-4 text-base font-medium text-accentContrast hover:opacity-95">
                    I&apos;ll do this later
                  </button>
                  <button type="button" onClick={handleSetUpPayoutNow} disabled={saving} className="rounded-xl border-2 border-accent px-4 py-3 text-base font-medium text-accent hover:bg-accent/10">
                    Set up payouts now
                  </button>
                </div>
              </>
            )}

            {/* Step 9 — Policies */}
            {step === 9 && (
              <>
                <h1 className="text-2xl font-semibold tracking-tight">Clear rules. No surprises.</h1>
                <p className="text-muted mt-2">Here&apos;s how Flyers Up handles fairness.</p>
                <div className="mt-6 space-y-4">
                  <div className="rounded-xl border border-border p-4">
                    <p className="font-medium text-text">Cancellations</p>
                    <p className="text-sm text-muted mt-1">Customer cancels 24+ hours before: full deposit refund. Under 6 hours: deposit non-refundable.</p>
                  </div>
                  <div className="rounded-xl border border-border p-4">
                    <p className="font-medium text-text">No-shows & lateness</p>
                    <p className="text-sm text-muted mt-1">Evidence-friendly. Customer no-show: you keep the deposit. Pro no-show: full refund + strike.</p>
                  </div>
                  <div className="rounded-xl border border-border p-4">
                    <p className="font-medium text-text">Payout timing</p>
                    <p className="text-sm text-muted mt-1">After job completion and customer payment, payouts typically arrive within 2–3 business days.</p>
                  </div>
                </div>
                <div className="flex gap-3 mt-8 pt-6 border-t border-border">
                  <button type="button" onClick={() => setStep(8)} className="rounded-xl border border-border px-4 py-3 text-base font-medium text-text hover:bg-surface2">
                    Back
                  </button>
                  <button type="button" onClick={goNext} className="flex-1 rounded-xl bg-accent px-4 py-4 text-base font-medium text-accentContrast hover:opacity-95">
                    Continue
                  </button>
                </div>
              </>
            )}

            {/* Step 10 — Launch */}
            {step === 10 && (
              <>
                <h1 className="text-2xl font-semibold tracking-tight">You&apos;re ready</h1>
                <p className="text-muted mt-2">Launch your profile and start accepting bookings.</p>
                {error && (
                  <div className="mt-4 rounded-xl border border-red-100 bg-danger/10 px-4 py-3 text-sm text-text">{error}</div>
                )}
                <div className="mt-6 space-y-4">
                  <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-2">
                    <p className="text-sm font-medium text-text">✓ Services added</p>
                    <p className="text-sm font-medium text-text">✓ Pricing set</p>
                    <p className="text-sm font-medium text-text">✓ Service area set</p>
                    <p className="text-sm font-medium text-text">✓ Availability set</p>
                    <p className="text-sm text-muted">Payout: complete when ready</p>
                  </div>
                  <p className="text-sm text-muted">Customers will find you by occupation and service area. Add photos and credentials in your profile after launch.</p>
                </div>
                <div className="flex flex-col gap-3 mt-8 pt-6 border-t border-border">
                  <button
                    type="button"
                    onClick={handleLaunch}
                    disabled={!canProceedLaunch || saving}
                    className="w-full rounded-xl bg-accent px-4 py-4 text-base font-medium text-accentContrast hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving…' : 'Launch my profile'}
                  </button>
                  <button type="button" onClick={() => setStep(9)} className="w-full rounded-xl border border-border px-4 py-3 text-base font-medium text-text hover:bg-surface2">
                    Back
                  </button>
                </div>
              </>
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
