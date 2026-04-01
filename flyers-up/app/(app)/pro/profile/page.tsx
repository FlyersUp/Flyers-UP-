'use client';

/**
 * Pro Profile Page
 * Dedicated profile page for service professionals
 * Allows pros to view and edit their profile information
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import PageLayout from '@/components/PageLayout';
import { getCurrentUser, getMyServicePro, getServiceCategories, getProServiceTypes, getProSpecialties, getProAddons, type ServiceCategory } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';
import { updateMyServiceProAction } from '@/app/actions/servicePro';
import { WeeklySchedulePicker } from '@/components/ui/WeeklySchedulePicker';
import {
  defaultBusinessHoursModel,
  parseBusinessHoursModel,
  stringifyBusinessHoursModel,
  summarizeBusinessHours,
  validateWeeklyHours,
} from '@/lib/utils/businessHours';
import { warnLegacyServicesNotInOccupationServices } from '@/lib/proProfileCanonical';
import { DARK_MODE_END_USER_ENABLED } from '@/lib/themeFeatureFlags';

interface ProProfileData {
  displayName: string;
  bio: string;
  categoryId: string;
  categorySlug: string;
  startingPrice: string;
  location: string;
  serviceRadius: string;
  yearsExperience: string;
  verifiedCredentials: string[];
  darkMode: boolean;
  jobsCompleted: number;
  averageRating: number;
}

export default function ProProfilePage() {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  
  const [formData, setFormData] = useState<ProProfileData>({
    displayName: '',
    bio: '',
    categoryId: '',
    categorySlug: '',
    startingPrice: '',
    location: '',
    serviceRadius: '',
    yearsExperience: '',
    verifiedCredentials: [],
    darkMode: false,
    jobsCompleted: 0,
    averageRating: 0,
  });
  /** Signup occupation (occupations table) — canonical display label. */
  const [primaryOccupationLabel, setPrimaryOccupationLabel] = useState<string | null>(null);
  /** For specialty presets (occupation slug). */
  const [occupationSlug, setOccupationSlug] = useState<string>('');
  const [businessHoursModel, setBusinessHoursModel] = useState(() => defaultBusinessHoursModel());
  const [showInactiveCategoryBanner, setShowInactiveCategoryBanner] = useState(false);
  const [serviceTypes, setServiceTypes] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [specialties, setSpecialties] = useState<Array<{ id: string; label: string }>>([]);
  const [addons, setAddons] = useState<Array<{ id: string; title: string; priceCents: number; isActive: boolean }>>([]);
  /** Public book flow uses service_pros.id */
  const [serviceProId, setServiceProId] = useState<string | null>(null);
  /** Embedded customer booking page — owner preview only */
  const [previewAsCustomer, setPreviewAsCustomer] = useState(false);

  useEffect(() => {
    void loadProfile();
  }, []);

  useEffect(() => {
    if (previewAsCustomer) setIsEditing(false);
  }, [previewAsCustomer]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const user = await getCurrentUser();
      if (!user || user.role !== 'pro') {
        router.push(`/signin?role=pro&next=${encodeURIComponent(pathname || '/pro/profile')}`);
        return;
      }

      const [proData, cats] = await Promise.all([getMyServicePro(user.id), getServiceCategories()]);
      setCategories(cats);
      
      // Load extended profile data from localStorage
      const extendedDataStr = localStorage.getItem('proProfile_extended');
      const extendedData = extendedDataStr ? JSON.parse(extendedDataStr) : {};
      
      const { data: proFullData } = await supabase
        .from('service_pros')
        .select('rating, review_count, location')
        .eq('user_id', user.id)
        .single();
      
      if (proData) {
        setServiceProId(proData.id);
        const category = cats.find((c: { id: string }) => c.id === proData.categoryId);
        const hasInactiveCategory = proData.categoryId && !category;
        setShowInactiveCategoryBanner(!!hasInactiveCategory);
        setBusinessHoursModel(parseBusinessHoursModel(proData.businessHours || ''));
        const [svcTypes, specs, addonsList] = await Promise.all([
          getProServiceTypes(user.id),
          getProSpecialties(user.id),
          getProAddons(user.id),
        ]);
        setServiceTypes(svcTypes.map((s) => ({ id: s.id, name: s.name, slug: s.slug })));
        setSpecialties(specs);
        setAddons(addonsList.map((a) => ({ id: a.id, title: a.title, priceCents: a.priceCents, isActive: a.isActive })));

        warnLegacyServicesNotInOccupationServices(
          proData.servicesOffered || [],
          new Set(svcTypes.map((s) => s.slug))
        );
        if (
          process.env.NODE_ENV === 'development' &&
          (proData.servicesOffered?.length ?? 0) > 0 &&
          svcTypes.length === 0
        ) {
          console.warn(
            '[ProProfile] Legacy services_offered is populated but no occupation-linked services (pro_services) are selected.'
          );
        }

        const occLabel =
          proData.primaryOccupationName?.trim() || category?.name || null;
        const occSlug = proData.primaryOccupationSlug?.trim() || category?.slug || '';
        setPrimaryOccupationLabel(occLabel);
        setOccupationSlug(occSlug);

        setFormData({
          displayName: proData.displayName || '',
          bio: proData.bio || '',
          categoryId: hasInactiveCategory ? '' : (proData.categoryId || ''),
          categorySlug: category?.slug || '',
          startingPrice: proData.startingPrice?.toString() || '0',
          location: proFullData?.location || extendedData.location || '',
          serviceRadius: proData.serviceRadius?.toString() || '',
          yearsExperience: (proData.yearsExperience != null ? String(proData.yearsExperience) : (extendedData.yearsExperience?.toString() || '0')),
          verifiedCredentials:
            (proData.verifiedCredentials && proData.verifiedCredentials.length > 0)
              ? proData.verifiedCredentials
              : (extendedData.verifiedCredentials || []),
          darkMode: localStorage.getItem('darkMode') === 'true',
          jobsCompleted: proFullData?.review_count || 0,
          averageRating: proFullData?.rating || 0,
        });
      } else {
        setServiceProId(null);
        setPrimaryOccupationLabel(null);
        setOccupationSlug('');
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const user = await getCurrentUser();
      if (!user || user.role !== 'pro') {
        setError('Unauthorized');
        return;
      }

      const displayName = formData.displayName.trim();
      if (!displayName) {
        setError('Display name is required.');
        return;
      }

      // Validate bio length (500 words max)
      const wordCount = formData.bio.trim().split(/\s+/).filter(Boolean).length;
      if (wordCount > 500) {
        setError('Bio must be 500 words or less.');
        return;
      }

      // Update service pro (only fields that exist in DB)
      const scheduleErr = validateWeeklyHours(businessHoursModel.weekly);
      if (scheduleErr) {
        setError(scheduleErr);
        return;
      }

      const yearsExpStr = formData.yearsExperience.trim();
      const yearsExpNum = yearsExpStr === '' ? null : Number(yearsExpStr);
      if (yearsExpNum !== null && (Number.isNaN(yearsExpNum) || yearsExpNum < 0)) {
        setError('Years experience must be a positive number.');
        return;
      }

      const startingPriceStr = formData.startingPrice.trim();
      const startingPriceNum = startingPriceStr === '' ? null : Number(startingPriceStr);
      if (startingPriceNum !== null && (Number.isNaN(startingPriceNum) || startingPriceNum < 0)) {
        setError('Starting price must be a positive number.');
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token ?? undefined;

      const result = await updateMyServiceProAction({
        display_name: displayName,
        bio: formData.bio,
        category_id: formData.categoryId || undefined,
        starting_price: startingPriceNum ?? undefined,
        location: formData.location.trim() || undefined,
        service_radius: formData.serviceRadius ? parseInt(formData.serviceRadius) : undefined,
        business_hours: stringifyBusinessHoursModel(businessHoursModel),
        years_experience: yearsExpNum ?? undefined,
        certifications: formData.verifiedCredentials,
      }, accessToken);

      if (!result.success) {
        setError(result.error || 'Failed to update profile.');
        return;
      }

      // Legacy best-effort: keep localStorage in sync for older pages still reading it.
      try {
        const ext = {
          yearsExperience: Number(formData.yearsExperience || 0),
          verifiedCredentials: formData.verifiedCredentials,
        };
        localStorage.setItem('proProfile_extended', JSON.stringify(ext));
      } catch {}

      // Save dark mode preference (legacy key; only when dark mode is shipped)
      if (DARK_MODE_END_USER_ENABLED) {
        localStorage.setItem('darkMode', formData.darkMode.toString());
      }

      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      
      // Reload profile to get updated data
      await loadProfile();
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  };

  const toggleCredential = (credential: string) => {
    if (formData.verifiedCredentials.includes(credential)) {
      setFormData({
        ...formData,
        verifiedCredentials: formData.verifiedCredentials.filter(c => c !== credential),
      });
    } else {
      setFormData({
        ...formData,
        verifiedCredentials: [...formData.verifiedCredentials, credential],
      });
    }
  };

  const availableCredentials = [
    'Identity verified (when available)',
    'License uploaded (if applicable)',
    'Insurance uploaded (if applicable)',
    'Bonded (self-reported)',
    'Certified (self-reported)',
    'BBB accredited (self-reported)',
  ];

  if (loading) {
    return (
      <PageLayout showBackButton backButtonHref="/dashboard/pro">
        <div className="text-center py-12">
          <p className="text-muted/70">Loading profile...</p>
        </div>
      </PageLayout>
    );
  }

  const bioWordCount = formData.bio.trim().split(/\s+/).filter(Boolean).length;

  const bookPreviewSrc = serviceProId
    ? `/book/${encodeURIComponent(serviceProId)}?customerPreview=1`
    : null;

  return (
    <PageLayout showBackButton backButtonHref="/dashboard/pro">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text">My Profile</h1>
            <p className="text-muted">Manage your professional profile</p>
          </div>
          {bookPreviewSrc && (
            <div className="flex items-center justify-end gap-2 shrink-0">
              <span className="text-sm font-medium text-text" id="preview-customer-label">
                Preview as customer
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={previewAsCustomer}
                aria-labelledby="preview-customer-label"
                onClick={() => setPreviewAsCustomer((v) => !v)}
                className={`relative inline-flex h-7 w-12 shrink-0 rounded-full border border-border transition-colors ${
                  previewAsCustomer ? 'bg-accent' : 'bg-surface2'
                }`}
              >
                <span
                  className={`pointer-events-none absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    previewAsCustomer ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )}
        </div>

        {previewAsCustomer && bookPreviewSrc && (
          <div className="mb-4 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-surface2/80 px-4 py-3 text-sm">
              <p className="text-text">
                <span className="font-semibold text-accent">Preview mode</span>
                <span className="text-muted"> — This is what customers see on your booking page. Editing is disabled until you exit preview.</span>
              </p>
              <button
                type="button"
                onClick={() => setPreviewAsCustomer(false)}
                className="shrink-0 px-3 py-1.5 rounded-lg border border-border text-sm font-medium text-text hover:bg-surface transition-colors"
              >
                Exit preview
              </button>
            </div>
            <div className="rounded-xl border border-border overflow-hidden bg-surface min-h-[70vh]">
              <iframe
                title="Customer booking preview"
                src={bookPreviewSrc}
                className="w-full min-h-[70vh] border-0 bg-bg"
              />
            </div>
          </div>
        )}

        {!previewAsCustomer && (
          <>
        {/* Owner actions — same card language as dashboard */}
        <div className="bg-surface rounded-xl border border-border p-4 mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-4 py-2.5 bg-accent hover:opacity-95 text-accentContrast rounded-lg font-semibold transition-opacity text-center sm:text-left"
            >
              Edit Profile
            </button>
            <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium" aria-label="Profile management">
              <Link href="/onboarding/pro" className="text-accent hover:underline">
                Manage services
              </Link>
              <Link href="/pro/specialties" className="text-accent hover:underline">
                Manage specialties
              </Link>
              <Link href="/pro/settings/pricing-availability" className="text-accent hover:underline">
                Edit pricing
              </Link>
              <Link href="/pro/profile#availability" className="text-accent hover:underline">
                Manage availability
              </Link>
            </nav>
          </div>
        </div>

        {(primaryOccupationLabel || showInactiveCategoryBanner) && (
          <div className="mb-6 rounded-2xl border border-black/10 dark:border-white/10 bg-[var(--surface-solid)] shadow-sm shadow-black/5 px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Primary occupation</p>
            {showInactiveCategoryBanner ? (
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                Update your occupation below — your previous category is unavailable.
              </p>
            ) : (
              <p className="mt-1 text-lg font-semibold text-text">{primaryOccupationLabel}</p>
            )}
            <p className="mt-2 text-xs text-muted">
              Services offered are limited to this occupation. Use Manage services to change which services you provide.
            </p>
          </div>
        )}

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 p-3 bg-surface2 border border-[var(--surface-border)] border-l-[3px] border-l-accent rounded-lg text-text text-sm">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-danger/10 border border-danger/30 rounded-lg text-text text-sm">
            {error}
          </div>
        )}

        {/* Profile Content */}
        <div className="space-y-6">
          {/* Stats Section */}
          <div className="bg-surface rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold text-text mb-4">Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted/70">Jobs Completed</p>
                <p className="text-2xl font-bold text-text">{formData.jobsCompleted}</p>
              </div>
              <div>
                <p className="text-sm text-muted/70">Average Rating</p>
                <p className="text-2xl font-bold text-accent">⭐ {formData.averageRating.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-sm text-muted/70">Years Experience</p>
                {isEditing ? (
                  <input
                    type="number"
                    value={formData.yearsExperience}
                    onChange={(e) => setFormData({ ...formData, yearsExperience: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-2xl font-bold"
                    min="0"
                  />
                ) : (
                  <p className="text-2xl font-bold text-text">{formData.yearsExperience || '0'}</p>
                )}
              </div>
              {DARK_MODE_END_USER_ENABLED ? (
                <div>
                  <p className="text-sm text-muted/70">Dark Mode</p>
                  {isEditing ? (
                    <label className="flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        checked={formData.darkMode}
                        onChange={(e) => setFormData({ ...formData, darkMode: e.target.checked })}
                        className="w-5 h-5 rounded border-border text-accent focus:ring-accent/40"
                      />
                      <span className="text-sm text-text">Enable</span>
                    </label>
                  ) : (
                    <p className="text-2xl font-bold text-text">{formData.darkMode ? '🌙 On' : '☀️ Off'}</p>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          {/* Basic Information */}
          <div className="bg-surface rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold text-text mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Display Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent/40 focus:border-accent"
                  />
                ) : (
                  <p className="text-text">{formData.displayName || 'Not set'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1">Primary occupation</label>
                {showInactiveCategoryBanner ? (
                  <>
                    <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
                      This occupation is temporarily unavailable during platform updates. Please select a new linked category.
                    </div>
                    {isEditing ? (
                      <select
                        value={formData.categoryId}
                        onChange={(e) => {
                          const selected = categories.find((c) => c.id === e.target.value);
                          setFormData({
                            ...formData,
                            categoryId: e.target.value,
                            categorySlug: selected?.slug || '',
                          });
                          if (e.target.value) setShowInactiveCategoryBanner(false);
                        }}
                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent/40 focus:border-accent"
                      >
                        <option value="">Select category</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-text">{primaryOccupationLabel || 'Not set'}</p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-text font-medium">{primaryOccupationLabel || formData.categorySlug || 'Not set'}</p>
                    {isEditing && (
                      <p className="text-xs text-muted mt-2">
                        Locked after signup. To change which services you offer within this occupation, use{' '}
                        <Link href="/onboarding/pro" className="text-accent hover:underline">
                          Manage services
                        </Link>
                        .
                      </p>
                    )}
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1">Starting Price ($)</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={formData.startingPrice}
                    onChange={(e) => setFormData({ ...formData, startingPrice: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent/40 focus:border-accent"
                    min="0"
                    step="0.01"
                  />
                ) : (
                  <p className="text-text">${formData.startingPrice || '0'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="bg-surface rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text">Bio</h2>
              <span className="text-sm text-muted/70">{bioWordCount} / 500 words</span>
            </div>
            {isEditing ? (
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent/40 focus:border-accent min-h-[150px]"
                placeholder="Tell customers about your experience and services..."
                maxLength={3000}
              />
            ) : (
              <p className="text-text whitespace-pre-wrap">{formData.bio || 'No bio added yet.'}</p>
            )}
          </div>

          {/* Verified Credentials */}
          <div className="bg-surface rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold text-text mb-4">Verified Credentials</h2>
            <div className="flex flex-wrap gap-3">
              {availableCredentials.map(cred => (
                <label
                  key={cred}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                    formData.verifiedCredentials.includes(cred)
                      ? "relative bg-badgeFill border-accent/40 text-text pl-6 before:content-[''] before:absolute before:left-3 before:top-1/2 before:-translate-y-1/2 before:h-2 before:w-2 before:rounded-full before:bg-accent/80"
                      : 'bg-surface2 border-border text-text hover:bg-surface2'
                  } ${!isEditing ? 'cursor-default' : ''}`}
                >
                  {isEditing && (
                    <input
                      type="checkbox"
                      checked={formData.verifiedCredentials.includes(cred)}
                      onChange={() => toggleCredential(cred)}
                      className="w-4 h-4 rounded border-border text-accent focus:ring-accent/40"
                    />
                  )}
                  {!isEditing && formData.verifiedCredentials.includes(cred) && (
                    <span className="text-accent">✓</span>
                  )}
                  <span>{cred}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Services offered = occupation-linked pro_services only */}
          <div className="bg-surface rounded-xl border border-border p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-text">Services offered</h2>
                <p className="text-xs text-muted mt-1 max-w-xl">
                  These are the services you selected for your occupation during signup. They are not the same as specialties.
                </p>
              </div>
              <Link
                href="/onboarding/pro"
                className="inline-flex items-center justify-center min-h-11 px-4 rounded-xl text-sm font-semibold border border-black/10 dark:border-white/10 bg-[var(--surface-solid)] text-accent hover:bg-surface2 shrink-0"
              >
                Manage services
              </Link>
            </div>
            {serviceTypes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {serviceTypes.map((s) => (
                  <span
                    key={s.id}
                    className="px-3 py-2 min-h-11 inline-flex items-center rounded-xl bg-[var(--surface-solid)] border border-black/10 dark:border-white/10 text-sm font-medium text-text shadow-sm"
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">No services added yet.</p>
            )}
          </div>

          {/* Specialties — differentiators within occupation */}
          <div className="bg-surface rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-text">Specialties</h2>
              <Link href="/pro/specialties" className="text-sm font-medium text-accent hover:underline min-h-11 inline-flex items-center">
                Manage
              </Link>
            </div>
            <p className="text-sm text-muted mb-4 max-w-2xl">
              Optional strengths and expertise within your occupation — not your service list. Add up to 8 specialties that highlight what you’re especially good at. These help customers understand your strengths and find you more easily.
            </p>
            {specialties.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {specialties.map((s) => (
                  <span
                    key={s.id}
                    className="px-3 py-2 rounded-xl bg-[var(--surface-solid)] border border-black/10 dark:border-white/10 text-sm font-medium text-text shadow-sm"
                  >
                    {s.label}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">No specialties yet.</p>
            )}
          </div>

          {/* Add-ons */}
          <div className="bg-surface rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text">Add-ons</h2>
              <Link href="/pro/addons" className="text-sm text-accent hover:underline">
                Manage
              </Link>
            </div>
            {addons.length > 0 ? (
              <div className="space-y-2">
                {addons.map((a) => (
                  <div key={a.id} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                    <span className="text-text">{a.title}</span>
                    <span className="text-sm text-muted">
                      ${(a.priceCents / 100).toFixed(2)}
                      {!a.isActive && ' (inactive)'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">No add-ons yet. Add optional extras customers can choose during booking.</p>
            )}
          </div>

          {/* Service Area */}
          <div className="bg-surface rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold text-text mb-4">Service Area</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Location</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent/40 focus:border-accent"
                    placeholder="City, State"
                  />
                ) : (
                  <p className="text-text">{formData.location || 'Not set'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Service Radius (miles)</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={formData.serviceRadius}
                    onChange={(e) => setFormData({ ...formData, serviceRadius: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent/40 focus:border-accent"
                    min="0"
                    placeholder="e.g., 25"
                  />
                ) : (
                  <p className="text-text">{formData.serviceRadius ? `${formData.serviceRadius} miles` : 'Not set'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Availability */}
          <div id="availability" className="bg-surface rounded-xl border border-border p-6 scroll-mt-24">
            <h2 className="text-lg font-semibold text-text mb-4">Availability</h2>
            <div className="space-y-4">
              <div>
                {isEditing ? (
                  <WeeklySchedulePicker
                    value={businessHoursModel.weekly}
                    onChange={(next) => setBusinessHoursModel((prev) => ({ ...prev, weekly: next }))}
                  />
                ) : (
                  <p className="text-text">{summarizeBusinessHours(businessHoursModel)}</p>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setIsEditing(false);
                  loadProfile(); // Reset form
                }}
                className="px-6 py-2 border border-border rounded-lg text-text hover:bg-surface2 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-accent hover:bg-accent text-accentContrast rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
        </>
        )}
      </div>
    </PageLayout>
  );
}

