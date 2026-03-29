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
import { useRouter } from 'next/navigation';
import { getCurrentUser, getActiveAddonsForPro, type ServicePro, type ServiceAddon } from '@/lib/api';
import { createBookingWithPayment } from '@/app/actions/bookings';
import { QuickRulesSheet, hasSeenQuickRules } from '@/components/booking/QuickRulesSheet';
import { DateTime } from 'luxon';
import { DEFAULT_BOOKING_TIMEZONE } from '@/lib/datetime';
import { CustomerProAvailabilityCalendar } from '@/components/booking/CustomerProAvailabilityCalendar';

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
}

export default function BookingForm({ pro, initialSubcategorySlug, serviceSlug, initialAddress, initialNotes, previousBookingId, forceQuickRules }: BookingFormProps) {
  const router = useRouter();
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

  useEffect(() => {
    setFormData((prev) => {
      if (prev.date) return prev;
      const md =
        DateTime.now().setZone(DEFAULT_BOOKING_TIMEZONE).plus({ days: 1 }).toISODate() ?? '';
      return { ...prev, date: md };
    });
  }, []);

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
    const cat = effectiveServiceSlug ?? pro.categorySlug;
    if (!cat) return;
    getActiveAddonsForPro(pro.id, cat).then(setAddons);
  }, [pro.id, pro.categorySlug, effectiveServiceSlug]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

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
      if (subcategories.length > 0 && !formData.subcategoryId) {
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
        Array.from(selectedAddonIds),
        formData.subcategoryId || null,
        previousBookingId || null
      );
      if (!result.success) {
        setError(result.error || 'Failed to create booking. Please try again.');
        return;
      }

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
    if (subcategories.length > 0 && !formData.subcategoryId) {
      setError('Please select a service type');
      return;
    }

    if (forceQuickRules || !hasSeenQuickRules()) {
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

  const minDate =
    DateTime.now().setZone(DEFAULT_BOOKING_TIMEZONE).plus({ days: 1 }).toISODate() ?? '';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Error message */}
      {error && (
        <div className="bg-danger/10 text-text px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Subcategory field - required when pro offers subcategories (all 5 main services) */}
      {subcategories.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-text mb-1">
            Service type *
          </label>
          <div className="space-y-2">
            {subcategories.map((sub) => (
              <label
                key={sub.id}
                className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-surface2/50 transition-colors has-[:checked]:border-accent has-[:checked]:bg-surface2"
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
      {addons.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-text mb-1">
            Add-ons
          </label>
          <p className="text-xs text-muted/70 mb-2">Optional extras to include with your booking</p>
          <div className="space-y-2">
            {addons.map((addon) => (
              <label
                key={addon.id}
                className="flex items-center justify-between gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-surface2/50 transition-colors has-[:checked]:border-accent has-[:checked]:bg-surface2"
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
        <p className="block text-sm font-medium text-text mb-2">Availability *</p>
        <CustomerProAvailabilityCalendar
          proId={pro.id}
          selectedDate={formData.date}
          selectedTime={formData.time}
          onSelectDate={(iso) => setFormData((prev) => ({ ...prev, date: iso }))}
          onSelectTime={(hhmm) => setFormData((prev) => ({ ...prev, time: hhmm }))}
        />
      </div>

      <div>
        <label htmlFor="date" className="block text-sm font-medium text-text mb-1">
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
          className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent/40 focus:border-accent outline-none transition-colors text-text"
        />
      </div>

      <div>
        <label htmlFor="time" className="block text-sm font-medium text-text mb-1">
          Preferred time *
        </label>
        <input
          type="time"
          id="time"
          name="time"
          value={formData.time}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent/40 focus:border-accent outline-none transition-colors text-text"
        />
      </div>

      {/* Address field */}
      <div>
        <label htmlFor="address" className="block text-sm font-medium text-text mb-1">
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
          className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent/40 focus:border-accent outline-none transition-colors text-text placeholder:text-muted/60"
        />
      </div>

      {/* Notes field */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-text mb-1">
          Additional Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Any special instructions or details about the job..."
          rows={4}
          className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent/40 focus:border-accent outline-none transition-colors resize-none text-text placeholder:text-muted/60"
        />
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-accent hover:opacity-95 disabled:opacity-50 text-accentContrast py-3 rounded-lg font-medium transition-opacity"
      >
        {isSubmitting ? 'Submitting...' : 'Request Booking'}
      </button>

      {/* Info text */}
      <p className="text-xs text-muted/70 text-center">
        By submitting, you agree to the service terms. The pro will confirm your booking shortly.
      </p>

      <QuickRulesSheet
        open={quickRulesOpen}
        onContinue={handleQuickRulesContinue}
        onClose={() => setQuickRulesOpen(false)}
      />
    </form>
  );
}
