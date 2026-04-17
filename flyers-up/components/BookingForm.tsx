'use client';

/**
 * Booking Form Component
 * Handles the booking request submission
 * 
 * Uses Supabase for creating bookings.
 * Shows Quick Rules sheet on first booking request.
 * 
 * FUTURE IMPROVEMENTS:
 * - Add form validation library (e.g., react-hook-form + zod)
 * - Add date/time picker component
 * - Add address autocomplete
 */

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCurrentUser, getActiveAddonsForPro, type ServicePro, type ServiceAddon } from '@/lib/api';
import { createBookingWithPayment } from '@/app/actions/bookings';
import { trackGaEvent } from '@/lib/analytics/trackGa';
import { trackProductAnalyticsEvent } from '@/lib/analytics/productEvents';
import { QuickRulesSheet, hasSeenQuickRules } from '@/components/booking/QuickRulesSheet';
import { DEFAULT_BOOKING_TIMEZONE, earliestCustomerBookableDateIso } from '@/lib/datetime';
import { CustomerProAvailabilityCalendar } from '@/components/booking/CustomerProAvailabilityCalendar';
import { ProPackagesPicker } from '@/components/booking/ProPackagesPicker';
import { useLaunchMode } from '@/hooks/useLaunchMode';

interface Subcategory {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  sort_order?: number;
}

interface BookingFormProps {
  pro: ServicePro;
  /** Pre-select subcategory when coming from marketplace (e.g. ?subcategorySlug=30-min-walk) */
  initialSubcategorySlug?: string;
  /** Service context when coming from marketplace (e.g. ?serviceSlug=pet-care) - filters subcategories and add-ons */
  serviceSlug?: string;
  /** Pre-fill address (e.g. from Rebook Same Pro) */
  initialAddress?: string;
  /** Pre-fill notes (e.g. from Rebook Same Pro) */
  initialNotes?: string;
  /** Previous booking ID when rebooking - records rebook_event on success */
  previousBookingId?: string;
  /** Force Quick Rules sheet to show (for testing) */
  forceQuickRules?: boolean;
  /** Pre-select a service package (e.g. from pro profile link) */
  initialPackageId?: string;
  /** From ?recurring=1 — surfaces recurring entry without changing pricing */
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
  const [addons, setAddons] = useState<ServiceAddon[]>([]);
  const [selectedAddonIds, setSelectedAddonIds] = useState<Set<string>>(new Set());
  const [quickRulesOpen, setQuickRulesOpen] = useState(false);
  const pendingSubmitRef = useRef(false);

  // Form state
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    address: initialAddress ?? '',
    notes: initialNotes ?? '',
    subcategoryId: '' as string,
  });
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(initialPackageId?.trim() || null);
  /** Pro calendar IANA zone from availability APIs — keeps min date aligned with server slot logic. */
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
          // Pre-select from URL when coming from marketplace (e.g. pet-care 30-min-walk)
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

  useEffect(() => {
    const cat = effectiveServiceSlug ?? pro.categorySlug;
    if (!cat) return;
    if (launchMode) {
      setAddons([]);
      return;
    }
    getActiveAddonsForPro(pro.id, cat).then(setAddons);
  }, [pro.id, pro.categorySlug, effectiveServiceSlug, launchMode]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const minDate = earliestCustomerBookableDateIso(sameDayEnabled, bookingWallTimezone);

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

    // Validate before showing rules sheet
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
            onClick={() => trackProductAnalyticsEvent('recurring_booking_started', { pro_id: pro.id, surface: 'booking_form_banner' })}
            className="inline-block mt-2 text-sm font-semibold text-[#4A69BD] dark:text-[#7BA3E8] hover:underline"
          >
            Open recurring setup
          </Link>
        </div>
      ) : null}

      {/* Error message */}
      {error && (
        <div className="rounded-2xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}

      {!launchMode ? (
        <div className="space-y-3 rounded-[20px] border border-[#E8EAED] bg-white p-5 shadow-[0_4px_24px_rgba(74,105,189,0.06)] dark:border-white/10 dark:bg-[#1a1d24] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
          <ProPackagesPicker
            proId={pro.id}
            selectedPackageId={selectedPackageId}
            onSelectPackageId={setSelectedPackageId}
          />
          {selectedPackageId ? (
            <p className="text-xs text-muted/90 rounded-lg bg-surface2/60 border border-border/60 px-3 py-2">
              Service type is hidden because this package defines what you&apos;re booking. Clear the package if you prefer
              to choose a specific service type instead.
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

      {/* Subcategory / service type — not needed when a package defines scope */}
      {subcategories.length > 0 && !selectedPackageId && (
        <div>
          <label className="mb-1 block text-sm font-semibold text-[#2d3436] dark:text-white">
            Service type *
          </label>
          <div className="space-y-2">
            {subcategories.map((sub) => (
              <label
                key={sub.id}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white p-3 transition-colors hover:border-[#4A69BD]/25 hover:bg-[#F5F6F8]/80 has-[:checked]:border-[#4A69BD] has-[:checked]:bg-[#4A69BD]/8 dark:border-white/12 dark:bg-[#14161c] dark:hover:bg-white/5 dark:has-[:checked]:border-[#4A69BD] dark:has-[:checked]:bg-[#4A69BD]/15"
              >
                <input
                  type="radio"
                  name="subcategoryId"
                  value={sub.id}
                  checked={formData.subcategoryId === sub.id}
                  onChange={() => setFormData((prev) => ({ ...prev, subcategoryId: sub.id }))}
                  className="w-4 h-4 text-accent border-border focus:ring-accent"
                />
                <span className="text-text font-medium">{sub.name}</span>
                {sub.description && (
                  <span className="text-sm text-muted">— {sub.description}</span>
                )}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Add-ons - optional extras the pro offers */}
      {!launchMode && addons.length > 0 && (
        <div>
          <label className="mb-1 block text-sm font-semibold text-[#2d3436] dark:text-white">
            Add-ons
          </label>
          <p className="mb-2 text-xs text-[#6B7280] dark:text-white/55">Optional extras to include with your booking</p>
          <div className="space-y-2">
            {addons.map((addon) => (
              <label
                key={addon.id}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] bg-white p-3 transition-colors hover:border-[#4A69BD]/25 hover:bg-[#F5F6F8]/80 has-[:checked]:border-[#4A69BD] has-[:checked]:bg-[#4A69BD]/8 dark:border-white/12 dark:bg-[#14161c] dark:hover:bg-white/5 dark:has-[:checked]:border-[#4A69BD] dark:has-[:checked]:bg-[#4A69BD]/15"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedAddonIds.has(addon.id)}
                    onChange={() => {
                      const next = new Set(selectedAddonIds);
                      if (next.has(addon.id)) next.delete(addon.id);
                      else next.add(addon.id);
                      setSelectedAddonIds(next);
                    }}
                    className="w-4 h-4 text-accent border-border focus:ring-accent rounded"
                  />
                  <span className="text-text font-medium">{addon.title}</span>
                </div>
                <span className="text-sm font-medium text-text">
                  +${((addon.priceCents ?? 0) / 100).toFixed(2)}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 block text-sm font-semibold text-[#2d3436] dark:text-white">Availability *</p>
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

      {/* Address field */}
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

      {/* Notes field */}
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

      {/* Submit button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-full bg-[#FFB347] py-3.5 text-base font-bold text-[#2d3436] shadow-[0_6px_20px_rgba(255,179,71,0.45)] transition-all hover:brightness-[1.02] active:scale-[0.98] disabled:opacity-50 dark:text-[#1a1a1a]"
      >
        {isSubmitting ? 'Submitting...' : 'Request Booking'}
      </button>

      {/* Info text */}
      <p className="text-center text-xs text-[#6B7280] dark:text-white/55">
        By submitting, you agree to the service terms. The pro will confirm your booking shortly.
      </p>

      {!launchMode ? (
        <QuickRulesSheet
          open={quickRulesOpen}
          onContinue={handleQuickRulesContinue}
          onClose={() => setQuickRulesOpen(false)}
        />
      ) : null}
    </form>
  );
}
