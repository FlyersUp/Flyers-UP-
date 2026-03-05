'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layouts/AppLayout';
import { getCurrentUser, getMyServicePro } from '@/lib/api';
import { getProProfile, updateProProfile } from '@/lib/proProfile';
import { updateMyServiceProAction } from '@/app/actions/servicePro';
import { ProAccessNotice } from '@/components/ui/ProAccessNotice';
import { supabase } from '@/lib/supabaseClient';
import { PricingModelSelector, type PricingModel } from '@/components/pricing/PricingModelSelector';
import {
  RatesForm,
  type RatesFormValues,
} from '@/components/pricing/RatesForm';
import {
  TravelRulesForm,
  type TravelRulesFormValues,
} from '@/components/pricing/TravelRulesForm';
import { WeeklyAvailabilityEditor } from '@/components/pricing/WeeklyAvailabilityEditor';
import { SaveBar } from '@/components/pricing/SaveBar';
import {
  parseBusinessHoursModel,
  stringifyBusinessHoursModel,
  validateWeeklyHours,
  defaultBusinessHoursModel,
  type WeeklyHours,
} from '@/lib/utils/businessHours';

function safeNum(s: string): number | null {
  const v = s.trim();
  if (v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function ProPricingAvailabilitySettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [access, setAccess] = useState<'signed_out' | 'not_pro' | 'pro'>('signed_out');

  const [pricingModel, setPricingModel] = useState<PricingModel>('flat');
  const [rates, setRates] = useState<RatesFormValues>({
    startingPrice: '',
    minJobPrice: '',
    whatIncluded: '',
    hourlyRate: '',
    minHours: '',
    overtimeRate: '',
  });
  const [travelRules, setTravelRules] = useState<TravelRulesFormValues>({
    travelFeeEnabled: false,
    travelFeeBase: '',
    travelFreeWithinMiles: '',
    serviceRadiusMiles: '',
    travelExtraPerMile: '',
  });
  const [weekly, setWeekly] = useState<WeeklyHours>(defaultBusinessHoursModel().weekly);
  const [sameDayBookings, setSameDayBookings] = useState(false);
  const [emergencyAvailable, setEmergencyAvailable] = useState(false);
  const [depositPercent, setDepositPercent] = useState(50);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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

      const [prof, proData] = await Promise.all([
        getProProfile(user.id),
        getMyServicePro(user.id),
      ]);

      const model = (prof?.pricing_model as PricingModel | undefined) ?? (prof?.hourly_rate && prof.hourly_rate > 0 ? 'hourly' : 'flat');
      setPricingModel(model);

      const sp = prof?.starting_price ?? prof?.starting_rate;
      const hr = prof?.hourly_rate;
      setRates({
        startingPrice: sp != null ? String(sp) : '',
        minJobPrice: prof?.min_job_price != null ? String(prof.min_job_price) : '',
        whatIncluded: prof?.what_included ?? '',
        hourlyRate: hr != null ? String(hr) : '',
        minHours: prof?.min_hours != null ? String(prof.min_hours) : '',
        overtimeRate: prof?.overtime_rate != null ? String(prof.overtime_rate) : '',
      });

      const sr = prof?.service_radius_miles ?? proData?.serviceRadius;
      setTravelRules({
        travelFeeEnabled: Boolean(prof?.travel_fee_enabled),
        travelFeeBase: prof?.travel_fee_base != null ? String(prof.travel_fee_base) : '',
        travelFreeWithinMiles: prof?.travel_free_within_miles != null ? String(prof.travel_free_within_miles) : '',
        serviceRadiusMiles: sr != null ? String(sr) : '',
        travelExtraPerMile: prof?.travel_extra_per_mile != null ? String(prof.travel_extra_per_mile) : '',
      });

      setWeekly(parseBusinessHoursModel(proData?.businessHours ?? '').weekly);
      setSameDayBookings(Boolean(prof?.same_day_bookings));
      setEmergencyAvailable(Boolean(prof?.emergency_available));
      setDepositPercent(prof?.deposit_percent_default ?? 50);

      setLoading(false);
    };
    void load();
  }, []);

  async function save() {
    if (!userId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    setFieldErrors({});

    const model = pricingModel;
    const hasFlat = model === 'flat' || model === 'hybrid';
    const hasHourly = model === 'hourly' || model === 'hybrid';

    if (hasFlat) {
      const sp = safeNum(rates.startingPrice);
      if (sp === null || sp <= 0) {
        setFieldErrors((e) => ({ ...e, startingPrice: 'Starting price is required and must be > 0.' }));
        setSaving(false);
        return;
      }
    }
    if (hasHourly) {
      const hr = safeNum(rates.hourlyRate);
      if (hr === null || hr <= 0) {
        setFieldErrors((e) => ({ ...e, hourlyRate: 'Hourly rate is required and must be > 0.' }));
        setSaving(false);
        return;
      }
    }

    const sr = safeNum(travelRules.serviceRadiusMiles);
    if (sr === null || sr <= 0) {
      setFieldErrors((e) => ({ ...e, serviceRadiusMiles: 'Service radius is required and must be > 0.' }));
      setSaving(false);
      return;
    }

    const scheduleErr = validateWeeklyHours(weekly);
    if (scheduleErr) {
      setError(scheduleErr);
      setSaving(false);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const accessToken = session?.access_token ?? undefined;
    if (!accessToken) {
      setError('Your session expired. Please sign in again.');
      setSaving(false);
      return;
    }

    const dp = Math.max(20, Math.min(80, Math.round(depositPercent)));
    const profilePayload = {
      pricing_model: model,
      starting_price: hasFlat ? safeNum(rates.startingPrice) ?? undefined : null,
      min_job_price: safeNum(rates.minJobPrice) ?? undefined,
      what_included: rates.whatIncluded.trim() || undefined,
      hourly_rate: hasHourly ? safeNum(rates.hourlyRate) ?? undefined : null,
      min_hours: safeNum(rates.minHours) ?? undefined,
      overtime_rate: safeNum(rates.overtimeRate) ?? undefined,
      travel_fee_enabled: travelRules.travelFeeEnabled,
      travel_fee_base: safeNum(travelRules.travelFeeBase) ?? undefined,
      travel_free_within_miles: safeNum(travelRules.travelFreeWithinMiles) ?? undefined,
      service_radius_miles: sr,
      travel_extra_per_mile: safeNum(travelRules.travelExtraPerMile) ?? undefined,
      same_day_bookings: sameDayBookings,
      emergency_available: emergencyAvailable,
      deposit_percent_default: dp,
      deposit_percent_min: 20,
      deposit_percent_max: 80,
      starting_rate: hasFlat ? safeNum(rates.startingPrice) ?? undefined : null,
      rate_unit: 'hour' as const,
    };

    const [profileRes, serviceRes] = await Promise.all([
      updateProProfile(userId, profilePayload),
      updateMyServiceProAction(
        {
          service_radius: sr,
          business_hours: stringifyBusinessHoursModel({ version: 1, weekly }),
          same_day_available: sameDayBookings,
        },
        accessToken
      ),
    ]);

    if (!profileRes.success) {
      setError(profileRes.error ?? 'Failed to save pricing.');
      setSaving(false);
      return;
    }
    if (!serviceRes.success) {
      setError(serviceRes.error ?? 'Failed to save availability.');
      setSaving(false);
      return;
    }

    setSuccess('Saved');
    router.refresh();
    setSaving(false);
  }

  const canEdit = !loading && Boolean(userId);

  return (
    <AppLayout mode="pro">
      <div className="min-h-screen bg-[#FAF8F6]">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          <div>
            <Link href="/pro/settings" className="text-sm text-black/60 hover:text-black">
              ← Back to Settings
            </Link>
            <h1 className="text-2xl font-semibold text-black mt-3">Pricing &amp; Availability</h1>
            <p className="text-sm text-black/60 mt-1">
              Set how you charge, travel rules, and when you&apos;re available.
            </p>
          </div>

          {loading ? (
            <p className="text-sm text-black/60">Loading…</p>
          ) : !userId ? (
            <ProAccessNotice nextHref="/pro/settings/pricing-availability" signedIn={access !== 'signed_out'} />
          ) : (
            <div className="space-y-6">
              {/* Section A: Pricing Model */}
              <section className="rounded-2xl border border-black/5 bg-white shadow-sm p-5">
                <h2 className="text-sm font-medium text-black mb-3">How you charge</h2>
                <PricingModelSelector value={pricingModel} onChange={setPricingModel} disabled={!canEdit} />
              </section>

              {/* Section B: Rates */}
              <section className="rounded-2xl border border-black/5 bg-white shadow-sm p-5">
                <h2 className="text-sm font-medium text-black mb-3">Rates</h2>
                <RatesForm
                  model={pricingModel}
                  values={rates}
                  onChange={setRates}
                  disabled={!canEdit}
                  errors={fieldErrors}
                />
              </section>

              {/* Section C: Deposit */}
              <section className="rounded-2xl border border-black/5 bg-white shadow-sm p-5">
                <h2 className="text-sm font-medium text-black mb-3">Deposit</h2>
                <p className="text-sm text-black/60 mb-3">
                  Customers pay this deposit to lock your time. Remainder is due after you mark the job complete.
                </p>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={20}
                    max={80}
                    value={depositPercent}
                    onChange={(e) => setDepositPercent(Number(e.target.value))}
                    disabled={!canEdit}
                    className="flex-1 h-2 rounded-full"
                  />
                  <span className="text-sm font-medium text-black w-12">{depositPercent}%</span>
                </div>
              </section>

              {/* Section D: Travel & Service Area */}
              <section className="rounded-2xl border border-black/5 bg-white shadow-sm p-5">
                <h2 className="text-sm font-medium text-black mb-3">Travel &amp; Service Area</h2>
                <TravelRulesForm
                  values={travelRules}
                  onChange={setTravelRules}
                  disabled={!canEdit}
                  errors={fieldErrors}
                />
              </section>

              {/* Section E: Availability */}
              <section className="rounded-2xl border border-black/5 bg-white shadow-sm p-5">
                <h2 className="text-sm font-medium text-black mb-3">Availability</h2>
                <WeeklyAvailabilityEditor
                  weekly={weekly}
                  onChange={setWeekly}
                  sameDayBookings={sameDayBookings}
                  onSameDayBookingsChange={setSameDayBookings}
                  emergencyAvailable={emergencyAvailable}
                  onEmergencyAvailableChange={setEmergencyAvailable}
                  disabled={!canEdit}
                />
              </section>

              {/* Section F: Save */}
              <section>
                <SaveBar
                  onSave={() => void save()}
                  saving={saving}
                  disabled={!canEdit}
                  success={success}
                  error={error}
                />
              </section>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
