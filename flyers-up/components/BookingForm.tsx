'use client';

/**
 * Booking Form Component
 * Handles the booking request submission
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCurrentUser, type ServicePro } from '@/lib/api';
import { createBookingWithPayment } from '@/app/actions/bookings';
import { trackGaEvent } from '@/lib/analytics/trackGa';
import { trackProductAnalyticsEvent } from '@/lib/analytics/productEvents';
import { QuickRulesSheet, hasSeenQuickRules } from '@/components/booking/QuickRulesSheet';
import { DEFAULT_BOOKING_TIMEZONE, earliestCustomerBookableDateIso } from '@/lib/datetime';
import { CustomerProAvailabilityCalendar } from '@/components/booking/CustomerProAvailabilityCalendar';
import { ProPackagesPicker } from '@/components/booking/ProPackagesPicker';
import { useLaunchMode } from '@/hooks/useLaunchMode';
import type { ServicePackagePublic } from '@/types/service-packages';
import { BookingRequestPriceSummary } from '@/components/booking/BookingRequestPriceSummary';
import { computeMarketplaceFees, resolveMarketplacePricingVersionForBooking } from '@/lib/pricing/fees';
import { getFeeProfileForOccupationSlug } from '@/lib/pricing/category-config';
import { applyMinimumBookingSubtotal } from '@/lib/pricing/config';

interface Subcategory {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  sort_order?: number;
}

type BookingOptionAddon = {
  id: string;
  title: string;
  description: string | null;
  price_cents: number;
  service_subcategory_id: string | null;
};

interface BookingFormProps {
  pro: ServicePro;
  initialSubcategorySlug?: string;
  serviceSlug?: string;
  initialAddress?: string;
  initialNotes?: string;
  previousBookingId?: string;
  forceQuickRules?: boolean;
  initialPackageId?: string;
  recurringFromUrl?: boolean;
}

export default function BookingForm({
  pro,
  initialSubcategorySlug,
  serviceSlug,
  initialAddress,
  initialNotes,
  previousBookingId,
  forceQuickRules,
  initialPackageId,
  recurringFromUrl = false,
}: BookingFormProps) {
  const router = useRouter();
  const launchMode = useLaunchMode();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [bookingAddons, setBookingAddons] = useState<BookingOptionAddon[]>([]);
  const [bookingPackages, setBookingPackages] = useState<ServicePackagePublic[]>([]);
  const [occupationSlugForFees, setOccupationSlugForFees] = useState<string | null>(null);
  const [bookingOptionsLoading, setBookingOptionsLoading] = useState(() => !launchMode);
  const [customerUserId, setCustomerUserId] = useState<string | null>(null);
  const [selectedAddonIds, setSelectedAddonIds] = useState<Set<string>>(new Set());
  const [quickRulesOpen, setQuickRulesOpen] = useState(false);
  const pendingSubmitRef = useRef(false);

  const [formData, setFormData] = useState({
    date: '',
    time: '',
    address: initialAddress ?? '',
    notes: initialNotes ?? '',
    subcategoryId: '' as string,
  });
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(initialPackageId?.trim() || null);
  const [bookingWallTimezone, setBookingWallTimezone] = useState(DEFAULT_BOOKING_TIMEZONE);

  const sameDayEnabled = Boolean(pro.sameDayAvailable);

  useEffect(() => {
    setFormData((prev) => {
      const min = earliestCustomerBookableDateIso(sameDayEnabled, bookingWallTimezone);
      if (!min) return prev;
      if (!prev.date) {
        return { ...prev, date: min };
      }
      if (prev.date < min) {
        return { ...prev, date: min };
      }
      return prev;
    });
  }, [sameDayEnabled, pro.id, bookingWallTimezone]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      address: initialAddress ?? prev.address,
      notes: initialNotes ?? prev.notes,
    }));
  }, [initialAddress, initialNotes]);

  const effectiveServiceSlug = serviceSlug ?? pro.categorySlug;

  useEffect(() => {
    const params = new URLSearchParams();
    if (effectiveServiceSlug) params.set('serviceSlug', effectiveServiceSlug);
    if (initialSubcategorySlug) params.set('subcategorySlug', initialSubcategorySlug);
    const qs = params.toString();
    fetch(`/api/pro/${encodeURIComponent(pro.id)}/subcategories${qs ? `?${qs}` : ''}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok && Array.isArray(data.subcategories)) {
          const subs = data.subcategories as Subcategory[];
          setSubcategories(subs);
          if (initialSubcategorySlug && subs.length > 0) {
            const match = subs.find((s) => s.slug === initialSubcategorySlug);
            if (match) {
              setFormData((prev) => ({ ...prev, subcategoryId: match.id }));
            }
          }
        }
      })
      .catch(() => {});
  }, [pro.id, initialSubcategorySlug, effectiveServiceSlug]);

  useEffect(() => {
    if (launchMode) {
      setSelectedPackageId(null);
    }
  }, [launchMode]);

  useEffect(() => {
    if (!launchMode || subcategories.length !== 1) return;
    setFormData((prev) =>
      prev.subcategoryId ? prev : { ...prev, subcategoryId: subcategories[0]!.id }
    );
  }, [launchMode, subcategories]);

  const selectedPackage = useMemo(
    () => bookingPackages.find((p) => p.id === selectedPackageId) ?? null,
    [bookingPackages, selectedPackageId]
  );

  const effectiveSubcategoryIdForOptions =
    formData.subcategoryId ||
    (selectedPackage?.service_subcategory_id?.trim() ? selectedPackage.service_subcategory_id : '');

  useEffect(() => {
    if (launchMode) {
      setBookingAddons([]);
      setBookingPackages([]);
      setOccupationSlugForFees(null);
      setBookingOptionsLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setBookingOptionsLoading(true);
      try {
        const params = new URLSearchParams();
        if (effectiveServiceSlug) params.set('serviceSlug', effectiveServiceSlug);
        if (effectiveSubcategoryIdForOptions) params.set('subcategoryId', effectiveSubcategoryIdForOptions);
        const qs = params.toString();
        const res = await fetch(
          `/api/pros/${encodeURIComponent(pro.id)}/booking-options${qs ? `?${qs}` : ''}`,
          { credentials: 'include' }
        );
        const j = await res.json();
        if (cancelled) return;
        if (res.ok && j.ok) {
          setBookingAddons(Array.isArray(j.addons) ? j.addons : []);
          setBookingPackages(Array.isArray(j.packages) ? j.packages : []);
          setOccupationSlugForFees(typeof j.occupationSlug === 'string' ? j.occupationSlug : null);
        } else {
          setBookingAddons([]);
          setBookingPackages([]);
        }
      } catch {
        if (!cancelled) {
          setBookingAddons([]);
          setBookingPackages([]);
        }
      } finally {
        if (!cancelled) setBookingOptionsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [pro.id, effectiveServiceSlug, effectiveSubcategoryIdForOptions, launchMode]);

  useEffect(() => {
    const allowed = new Set(bookingAddons.map((a) => a.id));
    setSelectedAddonIds((prev) => {
      const next = new Set([...prev].filter((id) => allowed.has(id)));
      return next.size === prev.size && [...prev].every((id) => next.has(id)) ? prev : next;
    });
  }, [bookingAddons]);

  useEffect(() => {
    let mounted = true;
    void getCurrentUser().then((u) => {
      if (mounted) setCustomerUserId(u?.id ?? null);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const minDate = earliestCustomerBookableDateIso(sameDayEnabled, bookingWallTimezone);

  const selectedSubcategoryName = subcategories.find((s) => s.id === formData.subcategoryId)?.name ?? 'Service';

  const addonLinesForSummary = useMemo(() => {
    return [...selectedAddonIds]
      .map((id) => {
        const a = bookingAddons.find((x) => x.id === id);
        return a ? { id: a.id, title: a.title, priceCents: a.price_cents } : null;
      })
      .filter(Boolean) as { id: string; title: string; priceCents: number }[];
  }, [selectedAddonIds, bookingAddons]);

  const primaryPricingLine = useMemo(() => {
    if (selectedPackage) {
      return { label: `Package · ${selectedPackage.title}`, cents: selectedPackage.base_price_cents };
    }
    return {
      label: `Service · ${selectedSubcategoryName}`,
      cents: Math.round(Number(pro.startingPrice ?? 0) * 100),
    };
  }, [selectedPackage, selectedSubcategoryName, pro.startingPrice]);

  const quickRulesReview = useMemo(() => {
    if (launchMode) return null;
    const rawBase = Math.max(0, primaryPricingLine.cents);
    const addonsSum = addonLinesForSummary.reduce((s, a) => s + a.priceCents, 0);
    const rawSubtotal = rawBase + addonsSum;
    const minApply = applyMinimumBookingSubtotal({
      rawSubtotalCents: rawSubtotal,
      occupationSlug: occupationSlugForFees,
    });
    if (!minApply.ok) {
      return <p className="text-sm text-red-800">{minApply.error}</p>;
    }
    const fees = computeMarketplaceFees(
      minApply.enforcedSubtotalCents,
      resolveMarketplacePricingVersionForBooking({ customerId: customerUserId }),
      getFeeProfileForOccupationSlug(occupationSlugForFees)
    );
    const fmt = (c: number) =>
      (Math.max(0, c) / 100).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    return (
      <div className="space-y-3 text-sm text-[#111] dark:text-[#F5F7FA]">
        <p className="text-xs font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
          Request summary
        </p>
        <div className="flex justify-between gap-2">
          <span className="text-black/70 dark:text-white/70 shrink min-w-0">{primaryPricingLine.label}</span>
          <span className="font-semibold tabular-nums shrink-0">{fmt(rawBase)}</span>
        </div>
        {addonLinesForSummary.length > 0 ? (
          <ul className="space-y-1 border-t border-black/10 dark:border-white/10 pt-2">
            {addonLinesForSummary.map((a) => (
              <li key={a.id} className="flex justify-between gap-2">
                <span className="text-black/70 dark:text-white/70">Add-on · {a.title}</span>
                <span className="tabular-nums">+{fmt(a.priceCents)}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="border-t border-black/10 dark:border-white/10 pt-2 space-y-1">
          <div className="flex justify-between">
            <span className="text-black/70 dark:text-white/70">Subtotal (pro)</span>
            <span className="font-semibold tabular-nums">{fmt(minApply.enforcedSubtotalCents)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-black/60 dark:text-white/55">Marketplace fees</span>
            <span className="tabular-nums">{fmt(fees.totalFeeCents)}</span>
          </div>
          <div className="flex justify-between font-bold pt-1">
            <span>Your total</span>
            <span className="text-[#4A69BD] dark:text-[#7BA3E8] tabular-nums">{fmt(fees.totalCustomerCents)}</span>
          </div>
          <div className="flex justify-between text-xs text-black/60 dark:text-white/55">
            <span>Pro earnings (estimate)</span>
            <span className="tabular-nums font-medium">{fmt(fees.proEarningsCents)}</span>
          </div>
        </div>
      </div>
    );
  }, [
    launchMode,
    primaryPricingLine,
    addonLinesForSummary,
    occupationSlugForFees,
    customerUserId,
  ]);

  const doSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const user = await getCurrentUser();
      if (!user) {
        router.push(`/auth?role=customer&next=${encodeURIComponent(`/book/${pro.id}`)}`);
        return;
      }

      if (!formData.date || !formData.time || !formData.address) {
        setError('Please fill in all required fields');
        setIsSubmitting(false);
        return;
      }
      if (minDate && formData.date < minDate) {
        setError(
          sameDayEnabled
            ? 'That date is no longer valid. Choose today or a future date.'
            : 'Same-day booking is not available for this pro. Choose a date from tomorrow onward.'
        );
        setIsSubmitting(false);
        return;
      }
      const pkgId = launchMode ? null : selectedPackageId;
      if (subcategories.length > 0 && !pkgId && !formData.subcategoryId) {
        setError('Please select a service type');
        setIsSubmitting(false);
        return;
      }

      const result = await createBookingWithPayment(
        pro.id,
        formData.date,
        formData.time,
        formData.address,
        formData.notes,
        launchMode ? [] : Array.from(selectedAddonIds),
        pkgId ? null : formData.subcategoryId || null,
        previousBookingId || null,
        pkgId
      );
      if (!result.success) {
        setError(result.error || 'Failed to create booking. Please try again.');
        return;
      }

      if (previousBookingId?.trim()) {
        trackProductAnalyticsEvent('repeat_booking_started', {
          from_booking_id: previousBookingId.trim(),
          pro_id: pro.id,
        });
      }

      trackGaEvent('job_posted');

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('booking_success', 'true');
      }

      router.push('/customer');
    } catch (err) {
      setError('Failed to create booking. Please try again.');
      console.error('Booking error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.date || !formData.time || !formData.address) {
      setError('Please fill in all required fields');
      return;
    }
    if (minDate && formData.date < minDate) {
      setError(
        sameDayEnabled
          ? 'That date is no longer valid. Choose today or a future date.'
          : 'Same-day booking is not available for this pro. Choose a date from tomorrow onward.'
      );
      return;
    }
    const pkgIdPre = launchMode ? null : selectedPackageId;
    if (subcategories.length > 0 && !pkgIdPre && !formData.subcategoryId) {
      setError('Please select a service type');
      return;
    }

    if (!launchMode && (forceQuickRules || !hasSeenQuickRules())) {
      pendingSubmitRef.current = true;
      setQuickRulesOpen(true);
      return;
    }

    await doSubmit();
  };

  const handleQuickRulesContinue = () => {
    if (pendingSubmitRef.current) {
      pendingSubmitRef.current = false;
      void doSubmit();
    }
  };

  const hasSubcategorySelection = Boolean(
    formData.subcategoryId || selectedPackage?.service_subcategory_id?.trim()
  );
  const showAddonsSection =
    !launchMode &&
    bookingAddons.length > 0 &&
    (subcategories.length === 0 || hasSubcategorySelection);

  return (
    <form onSubmit={handleSubmit} className="min-w-0 max-w-full space-y-6 pb-2">
      {!launchMode && recurringFromUrl ? (
        <div className="rounded-2xl border border-sky-200/50 bg-sky-50/80 dark:border-sky-800/40 dark:bg-sky-950/25 px-4 py-3 text-sm text-[#1e3a5f] dark:text-sky-100/90">
          <p className="font-medium">Interested in a regular schedule?</p>
          <p className="text-xs mt-1 text-[#4b5563] dark:text-sky-100/75 leading-relaxed">
            Submit this visit first, or start a dedicated recurring plan when it fits your needs.
          </p>
          <Link
            href={`/customer/recurring/new?proId=${encodeURIComponent(pro.id)}`}
            onClick={() =>
              trackProductAnalyticsEvent('recurring_booking_started', { pro_id: pro.id, surface: 'booking_form_banner' })
            }
            className="inline-block mt-2 text-sm font-semibold text-[#4A69BD] dark:text-[#7BA3E8] hover:underline"
          >
            Open recurring setup
          </Link>
        </div>
      ) : null}

      {error && (
        <div className="rounded-2xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}

      {subcategories.length > 0 && !selectedPackageId && (
        <div className="space-y-3 rounded-[20px] border border-[#E8EAED] bg-white p-5 shadow-[0_4px_24px_rgba(74,105,189,0.06)] dark:border-white/10 dark:bg-[#1a1d24] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
          <label className="block text-sm font-semibold text-[#2d3436] dark:text-white">Service type *</label>
          <div className="space-y-2">
            {subcategories.map((sub) => (
              <label
                key={sub.id}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E5E7EB] bg-white p-3 transition-colors hover:border-[#4A69BD]/25 hover:bg-[#F5F6F8]/80 has-[:checked]:border-[#4A69BD] has-[:checked]:bg-[#4A69BD]/8 dark:border-white/12 dark:bg-[#14161c] dark:hover:bg-white/5 dark:has-[:checked]:border-[#4A69BD] dark:has-[:checked]:bg-[#4A69BD]/15"
              >
                <input
                  type="radio"
                  name="subcategoryId"
                  value={sub.id}
                  checked={formData.subcategoryId === sub.id}
                  onChange={() => {
                    setSelectedPackageId(null);
                    setFormData((prev) => ({ ...prev, subcategoryId: sub.id }));
                  }}
                  className="mt-1 w-4 h-4 shrink-0 text-accent border-border focus:ring-accent"
                />
                <span className="min-w-0">
                  <span className="text-text font-medium">{sub.name}</span>
                  {sub.description ? (
                    <span className="block text-sm text-muted mt-0.5 leading-snug">{sub.description}</span>
                  ) : null}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {showAddonsSection ? (
        <div className="space-y-3 rounded-[20px] border border-[#E8EAED] bg-white p-5 shadow-[0_4px_24px_rgba(74,105,189,0.06)] dark:border-white/10 dark:bg-[#1a1d24] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
          <label className="block text-sm font-semibold text-[#2d3436] dark:text-white">Add-ons</label>
          <p className="text-xs text-[#6B7280] dark:text-white/55">Pick any extras — totals update instantly below.</p>
          <div className="space-y-2">
            {bookingAddons.map((addon) => (
              <label
                key={addon.id}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E5E7EB] bg-white p-3 transition-colors hover:border-[#4A69BD]/25 hover:bg-[#F5F6F8]/80 has-[:checked]:border-[#4A69BD] has-[:checked]:bg-[#4A69BD]/8 dark:border-white/12 dark:bg-[#14161c] dark:hover:bg-white/5 dark:has-[:checked]:border-[#4A69BD] dark:has-[:checked]:bg-[#4A69BD]/15"
              >
                <input
                  type="checkbox"
                  checked={selectedAddonIds.has(addon.id)}
                  onChange={() => {
                    const next = new Set(selectedAddonIds);
                    if (next.has(addon.id)) next.delete(addon.id);
                    else next.add(addon.id);
                    setSelectedAddonIds(next);
                  }}
                  className="mt-1 w-4 h-4 shrink-0 text-accent border-border focus:ring-accent rounded"
                />
                <span className="min-w-0 flex-1">
                  <span className="text-text font-medium">{addon.title}</span>
                  {addon.description ? (
                    <span className="block text-sm text-muted mt-0.5 leading-snug">{addon.description}</span>
                  ) : null}
                </span>
                <span className="text-sm font-semibold text-[#4A69BD] dark:text-[#7BA3E8] shrink-0 tabular-nums">
                  +${(addon.price_cents / 100).toFixed(2)}
                </span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {!launchMode && (bookingOptionsLoading || bookingPackages.length > 0) ? (
        <div className="space-y-3 rounded-[20px] border border-[#E8EAED] bg-white p-5 shadow-[0_4px_24px_rgba(74,105,189,0.06)] dark:border-white/10 dark:bg-[#1a1d24] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
          <ProPackagesPicker
              proId={pro.id}
              selectedPackageId={selectedPackageId}
              onSelectPackageId={(id) => {
                setSelectedPackageId(id);
                if (id) {
                  const p = bookingPackages.find((x) => x.id === id);
                  if (p?.service_subcategory_id && subcategories.some((s) => s.id === p.service_subcategory_id)) {
                    setFormData((prev) => ({ ...prev, subcategoryId: p.service_subcategory_id! }));
                  }
                }
              }}
              externalPackages={bookingPackages}
              externalLoading={bookingOptionsLoading}
            />
          {selectedPackageId ? (
            <p className="text-xs text-muted/90 rounded-lg bg-surface2/60 border border-border/60 px-3 py-2">
              This package sets your scope and price. Clear it above if you prefer to choose a single service type
              instead.
            </p>
          ) : null}
          {selectedPackageId ? (
            <Link
              href={`/customer/recurring/new?proId=${encodeURIComponent(pro.id)}&packageId=${encodeURIComponent(selectedPackageId)}`}
              className="inline-block text-sm font-medium text-[hsl(var(--accent-customer))] hover:underline"
            >
              Request a recurring schedule with this package
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-3 rounded-[20px] border border-[#E8EAED] bg-white p-5 shadow-[0_4px_24px_rgba(74,105,189,0.06)] dark:border-white/10 dark:bg-[#1a1d24] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
        <p className="block text-sm font-semibold text-[#2d3436] dark:text-white">Availability *</p>
        <CustomerProAvailabilityCalendar
          proId={pro.id}
          selectedDate={formData.date}
          selectedTime={formData.time}
          onSelectDate={(iso) => setFormData((prev) => ({ ...prev, date: iso }))}
          onSelectTime={(hhmm) => setFormData((prev) => ({ ...prev, time: hhmm }))}
          minimumDateIso={minDate}
          onCalendarTimezone={setBookingWallTimezone}
          sameDayBookingEnabled={sameDayEnabled}
        />
      </div>

      <div>
        <label htmlFor="date" className="mb-1 block text-sm font-semibold text-[#2d3436] dark:text-white">
          Date *
        </label>
        <input
          type="date"
          id="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          min={minDate}
          required
          className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-[#2d3436] outline-none transition-colors focus:border-[#4A69BD] focus:ring-2 focus:ring-[#4A69BD]/25 dark:border-white/12 dark:bg-[#14161c] dark:text-white"
        />
      </div>

      <div>
        <label htmlFor="time" className="mb-1 block text-sm font-semibold text-[#2d3436] dark:text-white">
          Preferred time *
        </label>
        <input
          type="time"
          id="time"
          name="time"
          value={formData.time}
          onChange={handleChange}
          required
          className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-[#2d3436] outline-none transition-colors focus:border-[#4A69BD] focus:ring-2 focus:ring-[#4A69BD]/25 dark:border-white/12 dark:bg-[#14161c] dark:text-white"
        />
      </div>

      <div>
        <label htmlFor="address" className="mb-1 block text-sm font-semibold text-[#2d3436] dark:text-white">
          Service Address *
        </label>
        <input
          type="text"
          id="address"
          name="address"
          value={formData.address}
          onChange={handleChange}
          placeholder="Enter your full address"
          required
          className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-[#2d3436] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#4A69BD] focus:ring-2 focus:ring-[#4A69BD]/25 dark:border-white/12 dark:bg-[#14161c] dark:text-white dark:placeholder:text-white/40"
        />
      </div>

      <div>
        <label htmlFor="notes" className="mb-1 block text-sm font-semibold text-[#2d3436] dark:text-white">
          Additional Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Any special instructions or details about the job..."
          rows={4}
          className="w-full resize-none rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-[#2d3436] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#4A69BD] focus:ring-2 focus:ring-[#4A69BD]/25 dark:border-white/12 dark:bg-[#14161c] dark:text-white dark:placeholder:text-white/40"
        />
      </div>

      {!launchMode && (formData.subcategoryId || selectedPackageId) ? (
        <BookingRequestPriceSummary
          occupationSlug={occupationSlugForFees}
          customerUserId={customerUserId}
          primaryLine={primaryPricingLine}
          addonLines={addonLinesForSummary}
        />
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-full bg-[#FFB347] py-3.5 text-base font-bold text-[#2d3436] shadow-[0_6px_20px_rgba(255,179,71,0.45)] transition-all hover:brightness-[1.02] active:scale-[0.98] disabled:opacity-50 dark:text-[#1a1a1a]"
      >
        {isSubmitting ? 'Submitting...' : 'Request Booking'}
      </button>

      <p className="text-center text-xs text-[#6B7280] dark:text-white/55">
        By submitting, you agree to the service terms. The pro will confirm your booking shortly.
      </p>

      {!launchMode ? (
        <QuickRulesSheet
          open={quickRulesOpen}
          onContinue={handleQuickRulesContinue}
          onClose={() => setQuickRulesOpen(false)}
          bookingReview={quickRulesReview}
        />
      ) : null}
    </form>
  );
}
