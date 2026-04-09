'use client';

/**
 * My Business Page (Pro Only)
 * Comprehensive business management page with multiple sections:
 * - Edit Business Profile
 * - Set your Schedule
 * - Manage Service (Add or update service types and Pricing)
 * - Track income and tips
 * - Customer Reviews
 */

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { getMyServicePro, getServiceCategories, getProEarnings, getProJobs, getProSafetyComplianceSettings, type ServiceCategory, type Booking } from '@/lib/api';
import { updateMyServiceProAction } from '@/app/actions/servicePro';
import { getProfilePhotoUrl } from '@/lib/proProfile';
import { BusinessProfileBuilder } from '@/components/business/BusinessProfileBuilder';
import {
  getActiveSubcategoriesByServiceSlugAction,
  getMyProSubcategorySelectionsAction,
  setMyProSubcategorySelectionsAction,
} from '@/app/actions/services';
import type { ServiceSubcategory } from '@/lib/db/services';
import { useProEarningsRealtime } from '@/hooks';
import { formatMoney } from '@/lib/utils/money';
import { TrustRow } from '@/components/ui/TrustRow';
import { WeeklySchedulePicker } from '@/components/ui/WeeklySchedulePicker';
import { Switch } from '@/components/ui/Switch';
import {
  parseBusinessHoursModel,
  stringifyBusinessHoursModel,
  validateWeeklyHours,
  defaultBusinessHoursModel,
} from '@/lib/utils/businessHours';
import { MIN_SAME_DAY_LEAD_MINUTES } from '@/lib/availability/lead-time';

type TabType = 'profile' | 'schedule' | 'services' | 'income' | 'reviews';

export default function BusinessSettingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'customer' | 'pro' | null>(null);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [available, setAvailable] = useState(false);
  const [startingPrice, setStartingPrice] = useState('');
  const [minJobPrice, setMinJobPrice] = useState('');
  const [serviceRadius, setServiceRadius] = useState('');
  const [location, setLocation] = useState('');
  const [businessHoursModel, setBusinessHoursModel] = useState(() => defaultBusinessHoursModel());
  const [beforeAfterPhotos, setBeforeAfterPhotos] = useState<string[]>([]);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [insuranceUploaded, setInsuranceUploaded] = useState(false);
  const [identityVerified, setIdentityVerified] = useState(false);
  const [backgroundChecked, setBackgroundChecked] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Service management
  const [serviceTypes, setServiceTypes] = useState<Array<{ name: string; price: string; id?: string }>>([]);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editServiceForm, setEditServiceForm] = useState({ name: '', price: '' });

  // Subcategories (from primary service only)
  const [subcategories, setSubcategories] = useState<ServiceSubcategory[]>([]);
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(false);
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<string[]>([]);
  const [subcategoriesSaving, setSubcategoriesSaving] = useState(false);

  const [sameDayAvailable, setSameDayAvailable] = useState(false);
  const [minNoticeHours, setMinNoticeHours] = useState('1');
  const [bookingPrefsSaving, setBookingPrefsSaving] = useState(false);

  // Earnings
  const { earnings, loading: earningsLoading } = useProEarningsRealtime(userId);

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const categorySlug = selectedCategory?.slug ?? '';
  const primaryCategoryInactive = Boolean(selectedCategory && selectedCategory.is_active_phase1 === false);
  const activeCategories = categories.filter((c) => c.is_active_phase1 !== false);

  useEffect(() => {
    if (!categorySlug || !userId) {
      setSubcategories([]);
      setSelectedSubcategoryIds([]);
      return;
    }
    let cancelled = false;
    setSubcategoriesLoading(true);
    Promise.all([
      getActiveSubcategoriesByServiceSlugAction(categorySlug),
      getMyProSubcategorySelectionsAction(),
    ])
      .then(([subs, selections]) => {
        if (cancelled) return;
        setSubcategories(subs);
        const forThisService = selections.find((s) => s.service_slug === categorySlug);
        setSelectedSubcategoryIds(forThisService?.subcategory_ids ?? []);
      })
      .finally(() => {
        if (!cancelled) setSubcategoriesLoading(false);
      });
    return () => { cancelled = true; };
  }, [categorySlug, userId]);

  async function checkAuthAndLoad() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push(`/auth?next=${encodeURIComponent(pathname || '/pro/settings/business')}`);
        return;
      }

      setUserId(user.id);

      // Check user role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || profile.role !== 'pro') {
        setUserRole('customer');
        setLoadingData(false);
        return;
      }

      setUserRole('pro');

      // Load categories (include hidden so we can detect inactive primary e.g. photography → trainer-tutor)
      const cats = await getServiceCategories({ includeHidden: true });
      setCategories(cats);

      // Load business data
      const [proData, profilePhoto, safetySettings] = await Promise.all([
        getMyServicePro(user.id),
        getProfilePhotoUrl(user.id),
        getProSafetyComplianceSettings(user.id),
      ]);

      if (proData) {
        setDisplayName(proData.displayName);
        setBio(proData.bio || '');
        setCategoryId(proData.categoryId);
        setAvailable(Boolean(proData.available));
        setStartingPrice(proData.startingPrice.toString());
        setMinJobPrice(proData.minJobPrice != null ? String(proData.minJobPrice) : '');
        setServiceRadius(proData.serviceRadius?.toString() || '');
        setLocation(proData.location || '');
        setBusinessHoursModel(parseBusinessHoursModel(proData.businessHours || ''));
        setBeforeAfterPhotos(proData.beforeAfterPhotos || []);
        setSameDayAvailable(Boolean(proData.sameDayAvailable));
        const lm = proData.leadTimeMinutes;
        setMinNoticeHours(
          Number.isFinite(lm) && lm >= 0
            ? lm === 0
              ? '0'
              : String(Math.round((lm / 60) * 10) / 10).replace(/\.0$/, '')
            : '1'
        );

        // Load service types from Supabase; fall back to localStorage for older sessions.
        if (proData.serviceTypes && proData.serviceTypes.length > 0) {
          setServiceTypes(
            proData.serviceTypes.map((s, i) => ({
              ...s,
              id: s.id ?? `svc-${i}-${String(s.name).replace(/\s/g, '-')}`,
            }))
          );
        } else {
          const servicesStr = localStorage.getItem('proServiceTypes');
          if (servicesStr) {
            setServiceTypes(JSON.parse(servicesStr));
          } else {
            // Default service type
            setServiceTypes([
              {
                name: proData.categoryName || 'General Service',
                price: proData.startingPrice.toString(),
                id: `svc-0-${String(proData.categoryName || 'General').replace(/\s/g, '-')}`,
              },
            ]);
          }
        }
      }

      setProfilePhotoUrl(profilePhoto ?? '');
      setInsuranceUploaded(Boolean(safetySettings?.insuranceDocPath));
      if (proData) {
        setIdentityVerified(proData.identityVerified);
        setBackgroundChecked(proData.backgroundChecked);
      }

      // Load bookings for reviews
      const jobs = await getProJobs(user.id);
      setBookings(jobs);
    } catch (err) {
      console.error('Error loading business data:', err);
    } finally {
      setLoadingData(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;

    setLoading(true);
    setSuccess(null);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token ?? undefined;
      if (!accessToken) {
        setError('Your session expired. Please sign in again.');
        router.push(`/auth?next=${encodeURIComponent(pathname || '/pro/settings/business')}`);
        return;
      }

      const result = await updateMyServiceProAction({
        display_name: displayName,
        bio: bio || undefined,
        category_id: categoryId || undefined,
        available,
        starting_price: startingPrice ? parseFloat(startingPrice) : undefined,
        min_job_price: minJobPrice ? parseFloat(minJobPrice) : null,
        service_radius: serviceRadius ? parseInt(serviceRadius) : undefined,
        location: location || undefined,
        business_hours: stringifyBusinessHoursModel(businessHoursModel),
        before_after_photos: beforeAfterPhotos.length > 0 ? beforeAfterPhotos : undefined,
      }, accessToken);

      if (result.success) {
        // Verify by re-fetching from source of truth before showing success.
        // Read-after-write: re-fetch from Supabase source of truth.
        const proData = await getMyServicePro(userId);
        if (!proData) {
          // Try to surface the underlying Supabase error instead of a generic message.
          const { data: debugRow, error: debugErr } = await supabase
            .from('service_pros')
            .select('user_id, display_name, category_id')
            .eq('user_id', userId)
            .maybeSingle();

          if (debugErr) {
            setError(`Saved, but could not reload your profile: ${debugErr.message}`);
          } else if (!debugRow) {
            setError('Saved, but reload found no service_pros row for your account. Please sign out/in and try again.');
          } else {
            setError('Saved, but could not reload your profile. Please refresh and try again.');
          }
          return;
        }

        setDisplayName(proData.displayName);
        setBio(proData.bio || '');
        setCategoryId(proData.categoryId);
        setAvailable(Boolean(proData.available));
        setStartingPrice(proData.startingPrice.toString());
        setMinJobPrice(proData.minJobPrice != null ? String(proData.minJobPrice) : '');
        setServiceRadius(proData.serviceRadius?.toString() || '');
        setLocation(proData.location || '');
        setBusinessHoursModel(parseBusinessHoursModel(proData.businessHours || ''));
        setBeforeAfterPhotos(proData.beforeAfterPhotos || []);
        setSameDayAvailable(Boolean(proData.sameDayAvailable));
        const lmSaved = proData.leadTimeMinutes;
        setMinNoticeHours(
          Number.isFinite(lmSaved) && lmSaved >= 0
            ? lmSaved === 0
              ? '0'
              : String(Math.round((lmSaved / 60) * 10) / 10).replace(/\.0$/, '')
            : '1'
        );
        setSuccess('Business profile saved.');
        setToast('Saved!');
        setTimeout(() => setToast(null), 3000);
      } else {
        setError(result.error || 'Failed to update business profile');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveBookingPreferences() {
    if (!userId) return;
    const h = parseFloat(minNoticeHours);
    if (!Number.isFinite(h) || h < 0 || h > 168) {
      setError('Minimum notice must be between 0 and 168 hours.');
      return;
    }
    const leadMinutes = Math.round(h * 60);

    setBookingPrefsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token ?? undefined;
      if (!accessToken) {
        setError('Your session expired. Please sign in again.');
        router.push(`/auth?next=${encodeURIComponent(pathname || '/pro/settings/business')}`);
        return;
      }
      const res = await updateMyServiceProAction(
        {
          same_day_available: sameDayAvailable,
          lead_time_minutes: leadMinutes,
        },
        accessToken
      );
      if (!res.success) {
        setError(res.error || 'Failed to save booking preferences.');
        return;
      }
      const proData = await getMyServicePro(userId);
      if (!proData) {
        setError('Saved, but could not reload your settings. Please refresh.');
        return;
      }
      setSameDayAvailable(Boolean(proData.sameDayAvailable));
      const lm = proData.leadTimeMinutes;
      setMinNoticeHours(
        Number.isFinite(lm) && lm >= 0
          ? lm === 0
            ? '0'
            : String(Math.round((lm / 60) * 10) / 10).replace(/\.0$/, '')
          : '1'
      );
      setSuccess('Booking preferences saved.');
      setToast('Saved!');
      setTimeout(() => setToast(null), 3000);
    } finally {
      setBookingPrefsSaving(false);
    }
  }

  async function persistServiceTypes(next: Array<{ name: string; price: string; id?: string }>): Promise<boolean> {
    // Best-effort: keep a local fallback while we migrate older data.
    try {
      localStorage.setItem('proServiceTypes', JSON.stringify(next));
    } catch {
      // ignore
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const accessToken = session?.access_token ?? undefined;
    if (!accessToken) {
      setError('Your session expired. Please sign in again.');
      router.push(`/auth?next=${encodeURIComponent(pathname || '/pro/settings/business')}`);
      return false;
    }
    const res = await updateMyServiceProAction({ service_types: next as unknown[] }, accessToken);
    if (!res.success) {
      setError(res.error || 'Failed to save services.');
      return false;
    }
    if (userId) {
      const proData = await getMyServicePro(userId);
      if (!proData) {
        setError('Saved, but could not reload your services. Please refresh and try again.');
        return false;
      }
      if (proData.serviceTypes) setServiceTypes(proData.serviceTypes);
    }
    return true;
  }

  async function handleAddService() {
    if (!newServiceName || !newServicePrice) {
      setError('Please enter both service name and price');
      return;
    }

    setError(null);
    setSuccess(null);

    const newService = {
      name: newServiceName,
      price: newServicePrice,
      id: Date.now().toString(),
    };

    const prev = serviceTypes;
    const updated = [...serviceTypes, newService];
    setServiceTypes(updated);
    const ok = await persistServiceTypes(updated);
    if (!ok) {
      setServiceTypes(prev);
      return;
    }
    setNewServiceName('');
    setNewServicePrice('');
    setSuccess('Service saved.');
  }

  async function handleRemoveService(id: string) {
    setError(null);
    setSuccess(null);

    const prev = serviceTypes;
    const updated = serviceTypes.filter(s => s.id !== id);
    setServiceTypes(updated);
    const ok = await persistServiceTypes(updated);
    if (!ok) {
      setServiceTypes(prev);
      return;
    }
    setSuccess('Service saved.');
  }

  async function handleUpdateService(id: string, name: string, price: string) {
    setError(null);
    setSuccess(null);

    const prev = serviceTypes;
    const updated = serviceTypes.map(s => 
      s.id === id ? { ...s, name, price } : s
    );
    setServiceTypes(updated);
    const ok = await persistServiceTypes(updated);
    if (!ok) {
      setServiceTypes(prev);
      return;
    }
    setSuccess('Service saved.');
  }

  if (loadingData) {
    return (
      <div className="w-full max-w-full min-w-0 space-y-6">
        <div className="text-muted/70">Loading...</div>
      </div>
    );
  }

  if (userRole !== 'pro') {
    return (
      <div className="w-full max-w-full min-w-0 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text mb-2">My Business</h1>
          <p className="text-muted">Manage your business profile and service details</p>
          <div className="mt-3">
            <TrustRow />
          </div>
        </div>
        <div className="p-4 bg-surface2 border border-[var(--surface-border)] border-l-[3px] border-l-accent rounded-lg text-text">
          This section is only available for service professionals. Please sign up as a pro to access business settings.
        </div>
      </div>
    );
  }

  const completedBookings = bookings.filter(b => b.status === 'completed');
  const reviews = completedBookings.map(b => ({
    id: b.id,
    customerName: b.customerName,
    date: b.date,
    rating: 5, // Placeholder - would come from reviews table
    comment: `Great service!`, // Placeholder
  }));

  const tabs = [
    { id: 'profile' as TabType, label: 'Public profile', icon: '👤' },
    { id: 'services' as TabType, label: 'Services & pricing', icon: '🔧' },
    { id: 'schedule' as TabType, label: 'Availability', icon: '📅' },
    { id: 'income' as TabType, label: 'Earnings', icon: '💰' },
    { id: 'reviews' as TabType, label: 'Reviews', icon: '⭐' },
  ];

  return (
    <div className="w-full max-w-full min-w-0 space-y-6 overflow-x-hidden pb-10 sm:pb-8">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-text mb-2">My Business</h1>
        <p className="text-muted">
          Control what customers see, what you offer, and when you’re available.
          Save anytime.
        </p>
        <div className="mt-3">
          <TrustRow />
        </div>
      </div>

      {/* Tabs: wrap on narrow widths so the row never forces horizontal page scroll */}
      <div className="min-w-0 max-w-full border-b border-border pb-2">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex min-w-0 max-w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors sm:px-4 sm:text-base ${
                activeTab === tab.id
                  ? 'border border-[var(--surface-border)] border-l-[3px] border-l-accent bg-surface2 text-text'
                  : 'text-muted hover:bg-surface2'
              }`}
            >
              <span className="shrink-0" aria-hidden>
                {tab.icon}
              </span>
              <span className="min-w-0 break-words">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="p-4 bg-surface2 border border-[var(--surface-border)] border-l-[3px] border-l-accent rounded-lg text-text">
          {success}
        </div>
      )}

      {error && (
        <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg text-text">
          {error}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed left-1/2 z-50 max-w-[min(20rem,calc(100vw-2rem))] min-w-0 -translate-x-1/2 rounded-lg bg-accent px-4 py-2 text-center text-accentContrast shadow-lg"
          style={{ bottom: 'max(5.5rem, calc(var(--fu-bottom-nav-chrome, 5rem) + 0.5rem))' }}
        >
          {toast}
        </div>
      )}

      {/* Tab Content */}
      <div className="surface-card min-w-0 max-w-full overflow-x-hidden p-4 sm:p-6">
        {/* Edit Business Profile Tab */}
        {activeTab === 'profile' && (
          <>
            <form onSubmit={handleSaveProfile} className="mb-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-accent text-accentContrast rounded-xl font-medium hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                {loading ? 'Saving…' : 'Save profile'}
              </button>
            </form>
            <BusinessProfileBuilder
              userId={userId!}
              displayName={displayName}
              bio={bio}
              categoryId={categoryId}
              categoryName={selectedCategory?.name ?? ''}
              startingPrice={startingPrice}
              minJobPrice={minJobPrice}
              serviceRadius={serviceRadius}
              location={location}
              available={available}
              businessHoursModel={businessHoursModel}
              beforeAfterPhotos={beforeAfterPhotos}
              profilePhotoUrl={profilePhotoUrl}
              identityVerified={identityVerified}
              backgroundChecked={backgroundChecked}
              insuranceUploaded={insuranceUploaded}
              phoneVerified={false}
              onDisplayNameChange={setDisplayName}
              onBioChange={setBio}
              onCategoryIdChange={setCategoryId}
              categoryLocked={!!categoryId && !primaryCategoryInactive}
              onStartingPriceChange={setStartingPrice}
              onMinJobPriceChange={setMinJobPrice}
              onServiceRadiusChange={setServiceRadius}
              onLocationChange={setLocation}
              onAvailableChange={setAvailable}
              onBusinessHoursModelChange={setBusinessHoursModel}
              onBeforeAfterPhotosChange={setBeforeAfterPhotos}
              onProfilePhotoChange={setProfilePhotoUrl}
              categories={activeCategories.map((c) => ({ id: c.id, name: c.name }))}
              onEditSchedule={() => setActiveTab('schedule')}
            />
          </>
        )}
        {/* DEADCODE_START */}
        {false && (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="text-sm text-muted/70">x</div>
            <div>
              <label htmlFor="displayName">x</label>
              <input
                type="text"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text focus:ring-2 focus:ring-accent/40 focus:border-accent"
                placeholder="What customers should call you"
              />
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-muted mb-1">
                About
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text focus:ring-2 focus:ring-accent/40 focus:border-accent"
                placeholder="One or two sentences about your work, experience, and what you’re best at"
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-muted mb-1">
                Primary occupation *
              </label>
              {primaryCategoryInactive && (
                <div className="mb-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-text">
                  Your primary service ({selectedCategory?.name}) is no longer available. Please select a new service below.
                </div>
              )}
              <select
                id="category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                disabled={!!categoryId && !primaryCategoryInactive}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text focus:ring-2 focus:ring-accent/40 focus:border-accent disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <option value="">{activeCategories.length ? 'Select your occupation' : 'No occupations available yet'}</option>
                {activeCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {categoryId && !primaryCategoryInactive ? (
                <p className="text-xs text-muted/70 mt-2">
                  Your primary service is locked. You can only offer subcategories within this service.
                </p>
              ) : null}
              {!categories.length ? (
                <p className="text-xs text-muted/70 mt-2">
                  Categories are required to save your profile. If this stays empty, your database setup is missing category rows or
                  category read access.
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="startingPrice" className="block text-sm font-medium text-muted mb-1">
                Starting price ($) *
              </label>
              <input
                type="number"
                id="startingPrice"
                value={startingPrice}
                onChange={(e) => setStartingPrice(e.target.value)}
                required
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text focus:ring-2 focus:ring-accent/40 focus:border-accent"
                placeholder="0.00"
              />
              <p className="text-xs text-muted/70 mt-2">
                This is the starting price customers see. You can add more detailed services in the “Services &amp; pricing” tab.
              </p>
            </div>

            <div>
              <label htmlFor="serviceRadius" className="block text-sm font-medium text-muted mb-1">
                Service radius (miles)
              </label>
              <input
                type="number"
                id="serviceRadius"
                value={serviceRadius}
                onChange={(e) => setServiceRadius(e.target.value)}
                min="0"
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text focus:ring-2 focus:ring-accent/40 focus:border-accent"
                placeholder="e.g., 25"
              />
            </div>

            <div className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-text">Available to customers</div>
                  <div className="mt-1 text-xs text-muted/80">
                    Turn this on to appear in customer browse results for your category. You can turn it off anytime.
                  </div>
                </div>
                <Switch checked={available} onCheckedChange={setAvailable} aria-label="Available to customers" />
              </div>
              <div className="mt-2 text-xs text-muted/70">
                {available ? 'Status: Visible in customer browse.' : 'Status: Hidden from customer browse.'}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-accent text-accentContrast rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Saving…' : 'Save profile'}
            </button>
            <p className="text-xs text-muted/70">
              Tip: after saving, refresh to confirm what customers will see.
            </p>
          </form>
        )}

        {/* Set your Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="text-sm font-medium text-muted">Weekly availability</div>
                {businessHoursModel.legacyText ? (
                  <div className="text-xs text-muted/70" title={businessHoursModel.legacyText}>
                    Previously saved as text (will convert on save)
                  </div>
                ) : null}
              </div>
              <WeeklySchedulePicker
                value={businessHoursModel.weekly}
                onChange={(next) => setBusinessHoursModel((prev) => ({ ...prev, weekly: next }))}
              />
              <p className="text-sm text-muted/70 mt-2">
                Set the days you work, then choose start/end times. You can update this anytime.
              </p>
            </div>

            <button
              onClick={async () => {
                const scheduleErr = validateWeeklyHours(businessHoursModel.weekly);
                if (scheduleErr) {
                  setError(scheduleErr);
                  return;
                }
                setLoading(true);
                setError(null);
                setSuccess(null);
                
                if (userId) {
                  const {
                    data: { session },
                  } = await supabase.auth.getSession();
                  const accessToken = session?.access_token ?? undefined;
                  if (!accessToken) {
                    setError('Your session expired. Please sign in again.');
                    setLoading(false);
                    router.push(`/auth?next=${encodeURIComponent(pathname || '/pro/settings/business')}`);
                    return;
                  }
                  const res = await updateMyServiceProAction({
                    business_hours: stringifyBusinessHoursModel(businessHoursModel),
                  }, accessToken);
                  if (!res.success) {
                    setError(res.error || 'Failed to save schedule.');
                    setLoading(false);
                    return;
                  }
                  // Read-after-write verification
                  const proData = await getMyServicePro(userId);
                  if (!proData) {
                    setError('Saved, but could not reload your availability. Please refresh and try again.');
                    setLoading(false);
                    return;
                  }
                  setBusinessHoursModel(parseBusinessHoursModel(proData.businessHours || ''));
                }
                setLoading(false);
                setSuccess('Availability saved.');
              }}
              disabled={loading}
              className="px-4 py-2 bg-accent text-accentContrast rounded-lg hover:bg-accent disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving…' : 'Save availability'}
            </button>
          </div>
        )}

        {/* Manage Service Tab */}
        {activeTab === 'services' && (
          <div className="min-w-0 max-w-full space-y-6">
            <div className="surface-card min-w-0 max-w-full p-4 sm:p-5">
              <h3 className="mb-1 font-semibold text-text">Same-day &amp; booking notice</h3>
              <p className="mb-4 text-sm text-muted">
                Controls whether customers can book you for today and how much advance notice you require.
              </p>
              <div className="mb-4 flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-text">Allow same-day bookings</div>
                  <p className="mt-1 text-xs text-muted/80">
                    When off, customers only see dates starting tomorrow. When on, today appears if slots are still available.
                  </p>
                </div>
                <Switch
                  checked={sameDayAvailable}
                  onCheckedChange={setSameDayAvailable}
                  aria-label="Allow same-day bookings"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="minNoticeHours" className="mb-1.5 block text-sm font-medium text-text">
                  Minimum booking notice (hours)
                </label>
                <input
                  id="minNoticeHours"
                  type="number"
                  min={0}
                  max={168}
                  step={0.5}
                  value={minNoticeHours}
                  onChange={(e) => setMinNoticeHours(e.target.value)}
                  className="w-full max-w-full min-w-0 rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-3 text-text shadow-[var(--shadow-1)] focus:border-borderStrong focus:outline-none focus:ring-2 focus:ring-trust/30"
                />
                <p className="mt-2 text-xs text-muted/80">
                  Applied to new bookings. Same-day slots use the longer of this notice and {MIN_SAME_DAY_LEAD_MINUTES} minutes
                  before start.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleSaveBookingPreferences()}
                disabled={bookingPrefsSaving}
                className="w-full rounded-xl bg-accent px-4 py-3 font-medium text-accentContrast shadow-lg transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {bookingPrefsSaving ? 'Saving…' : 'Save booking preferences'}
              </button>
            </div>
            <div className="min-w-0">
              {!categoryId ? (
                <div className="p-4 mb-6 rounded-lg border border-border bg-surface2 text-text">
                  <p className="font-medium mb-1">Set your primary service first</p>
                  <p className="text-sm text-muted">
                    Save your primary service category in the Public profile tab, then you can select which subcategories you offer here.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('profile')}
                    className="mt-3 text-sm font-medium text-accent hover:underline"
                  >
                    Go to Public profile →
                  </button>
                </div>
              ) : (
                <div className="surface-card mb-6 min-w-0 max-w-full p-4">
                  <h3 className="font-semibold text-text mb-2">Subcategories (within your primary service)</h3>
                  <p className="text-sm text-muted mb-4">
                    Select which subcategories you offer. These are the only options available—your primary service is locked.
                  </p>
                  {subcategoriesLoading ? (
                    <p className="text-sm text-muted/70">Loading subcategories…</p>
                  ) : subcategories.length === 0 ? (
                    <p className="text-sm text-muted/70">No subcategories available for your primary service.</p>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-3">
                        {subcategories.map((sub) => (
                          <label
                            key={sub.id}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-surface2 active:bg-surface2 cursor-pointer transition-colors"
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
                              className="rounded border-border text-accent focus:ring-accent"
                            />
                            <span className="text-sm text-text">{sub.name}</span>
                          </label>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          setSubcategoriesSaving(true);
                          setError(null);
                          setSuccess(null);
                          const res = await setMyProSubcategorySelectionsAction(categorySlug, selectedSubcategoryIds);
                          setSubcategoriesSaving(false);
                          if (res.success) {
                            setSuccess('Subcategories saved.');
                          } else {
                            setError(res.error || 'Failed to save subcategories.');
                          }
                        }}
                        disabled={subcategoriesSaving || selectedSubcategoryIds.length === 0}
                        className="px-4 py-2.5 bg-accent text-accentContrast rounded-lg font-medium hover:bg-accent/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
                      >
                        {subcategoriesSaving ? 'Saving…' : 'Save subcategories'}
                      </button>
                      {selectedSubcategoryIds.length === 0 && (
                        <p className="text-xs text-muted/70">Select at least one subcategory to save.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
              <div className="surface-card mb-4 min-w-0 max-w-full p-4">
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="font-semibold text-text mb-1">Add-Ons</div>
                    <div className="text-sm text-muted">
                      Optional upsells customers can add at checkout.
                    </div>
                  </div>
                  <Link
                    href="/pro/addons"
                    className="shrink-0 text-sm font-medium text-text underline underline-offset-4 decoration-border hover:decoration-text"
                  >
                    Manage →
                  </Link>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-text mb-4">Your Services (pricing)</h3>
              
              {serviceTypes.length > 0 ? (
                <div className="space-y-3 mb-6">
                  {serviceTypes.map((service, idx) => {
                    const serviceId = service.id ?? `svc-${idx}-${String(service.name).replace(/\s/g, '-')}`;
                    return (
                    <div key={serviceId} className="surface-card min-w-0 max-w-full p-4">
                      {editingServiceId === serviceId ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={editServiceForm.name}
                            onChange={(e) => setEditServiceForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="Service name"
                            className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text focus:ring-2 focus:ring-accent/40 focus:border-accent"
                          />
                          <input
                            type="number"
                            value={editServiceForm.price}
                            onChange={(e) => setEditServiceForm(f => ({ ...f, price: e.target.value }))}
                            placeholder="Price ($)"
                            min="0"
                            step="0.01"
                            className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text focus:ring-2 focus:ring-accent/40 focus:border-accent"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (editServiceForm.name && editServiceForm.price) {
                                  void handleUpdateService(serviceId, editServiceForm.name, editServiceForm.price);
                                  setEditingServiceId(null);
                                  setEditServiceForm({ name: '', price: '' });
                                } else {
                                  setError('Please enter both name and price.');
                                }
                              }}
                              className="px-4 py-2 bg-accent text-accentContrast rounded-lg hover:bg-accent/90 transition-colors"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingServiceId(null);
                                setEditServiceForm({ name: '', price: '' });
                              }}
                              className="px-4 py-2 text-text hover:bg-surface2 rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="break-words font-medium text-text">{service.name}</p>
                            <p className="text-sm text-muted">${service.price}</p>
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingServiceId(serviceId);
                                setEditServiceForm({ name: service.name, price: service.price });
                              }}
                              className="cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium text-text transition-colors hover:bg-surface2 active:bg-surface2"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleRemoveService(serviceId)}
                              className="cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-danger/10 active:bg-danger/15"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );})}
                </div>
              ) : (
                <p className="text-muted/70 mb-6">No services added yet.</p>
              )}

              <div className="border-t border-border pt-6">
                <h4 className="font-medium text-text mb-4">Add New Service</h4>
                <div className="mb-3 grid min-w-0 max-w-full grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    placeholder="Service name"
                    className="min-w-0 max-w-full rounded-lg border border-border bg-surface px-3 py-2 text-text focus:border-accent focus:ring-2 focus:ring-accent/40"
                  />
                  <input
                    type="number"
                    value={newServicePrice}
                    onChange={(e) => setNewServicePrice(e.target.value)}
                    placeholder="Price ($)"
                    min="0"
                    step="0.01"
                    className="min-w-0 max-w-full rounded-lg border border-border bg-surface px-3 py-2 text-text focus:border-accent focus:ring-2 focus:ring-accent/40"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void handleAddService()}
                  className="w-full rounded-lg bg-accent px-4 py-2 text-accentContrast transition-colors hover:bg-accent sm:w-auto"
                >
                  Add Service
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Track Income and Tips Tab */}
        {activeTab === 'income' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-text mb-4">Income Overview</h3>
              
              {earningsLoading ? (
                <p className="text-muted/70">Loading earnings...</p>
              ) : (
                <div className="mb-6 grid min-w-0 max-w-full grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                  <div className="min-w-0 rounded-lg border border-[var(--surface-border)] bg-surface2 p-4">
                    <p className="text-sm text-muted mb-1">Total Earnings</p>
                    <p className="text-2xl font-bold text-accent">
                      {formatMoney(Math.round(earnings?.totalEarnings || 0))}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-lg border border-[var(--surface-border)] bg-surface2 p-4">
                    <p className="text-sm text-muted mb-1">This Month</p>
                    <p className="text-2xl font-bold text-accent">
                      {formatMoney(Math.round(earnings?.thisMonth || 0))}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-lg border border-border bg-surface2 p-4">
                    <p className="text-sm text-muted mb-1">Jobs Completed</p>
                    <p className="text-2xl font-bold text-text">
                      {earnings?.completedJobs || 0}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-lg border border-[var(--surface-border)] bg-surface2 p-4">
                    <p className="text-sm text-muted mb-1">Pending</p>
                    <p className="text-2xl font-bold text-accent">
                      {formatMoney(Math.round(earnings?.pendingPayments || 0))}
                    </p>
                  </div>
                </div>
              )}

              <div className="border-t border-border pt-6">
                <h4 className="font-medium text-text mb-4">Recent Earnings</h4>
                {completedBookings.length > 0 ? (
                  <div className="space-y-2">
                    {completedBookings.slice(0, 10).map((booking) => (
                      <div
                        key={booking.id}
                        className="surface-card flex min-w-0 max-w-full flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="break-words font-medium text-text">{booking.customerName}</p>
                          <p className="text-sm text-muted/70">
                            {new Date(booking.date).toLocaleDateString()}
                          </p>
                        </div>
                        <p className="font-semibold text-accent">
                          {booking.price ? formatMoney(Math.round(booking.price * 100)) : '$0.00'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted/70">No completed jobs yet.</p>
                )}
              </div>

              <div className="border-t border-border pt-6">
                <h4 className="font-medium text-text mb-4">Tips</h4>
                <p className="text-muted/70">Tips tracking coming soon. Tips will be displayed here once customers add them to completed bookings.</p>
              </div>
            </div>
          </div>
        )}

        {/* Customer Reviews Tab */}
        {activeTab === 'reviews' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-text mb-4">Customer Reviews</h3>
              
              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="surface-card p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-text">{review.customerName}</p>
                          <p className="text-sm text-muted/70">
                            {new Date(review.date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className={i < review.rating ? 'text-warning' : 'text-muted/40'}>
                              ⭐
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className="text-text">{review.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">⭐</div>
                  <p className="text-muted/70">No reviews yet.</p>
                  <p className="text-sm text-muted/70 mt-2">Reviews will appear here once customers rate your completed jobs.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
