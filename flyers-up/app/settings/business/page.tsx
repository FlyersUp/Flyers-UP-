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
import { getMyServicePro, getServiceCategories, getProEarnings, getProJobs, type ServiceCategory, type Booking } from '@/lib/api';
import { updateMyServiceProAction } from '@/app/actions/servicePro';
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
  const [serviceRadius, setServiceRadius] = useState('');
  const [businessHoursModel, setBusinessHoursModel] = useState(() => defaultBusinessHoursModel());

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
      const proData = await getMyServicePro(user.id);
      if (proData) {
        setDisplayName(proData.displayName);
        setBio(proData.bio || '');
        setCategoryId(proData.categoryId);
        setAvailable(Boolean(proData.available));
        setStartingPrice(proData.startingPrice.toString());
        setServiceRadius(proData.serviceRadius?.toString() || '');
        setBusinessHoursModel(parseBusinessHoursModel(proData.businessHours || ''));
        
        // Load service types from Supabase; fall back to localStorage for older sessions.
        if (proData.serviceTypes && proData.serviceTypes.length > 0) {
          setServiceTypes(proData.serviceTypes);
        } else {
          const servicesStr = localStorage.getItem('proServiceTypes');
          if (servicesStr) {
            setServiceTypes(JSON.parse(servicesStr));
          } else {
            // Default service type
            setServiceTypes([{ name: proData.categoryName || 'General Service', price: proData.startingPrice.toString() }]);
          }
        }
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
        service_radius: serviceRadius ? parseInt(serviceRadius) : undefined,
        business_hours: stringifyBusinessHoursModel(businessHoursModel),
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
        setServiceRadius(proData.serviceRadius?.toString() || '');
        setBusinessHoursModel(parseBusinessHoursModel(proData.businessHours || ''));
        setSuccess('Business profile saved.');
      } else {
        setError(result.error || 'Failed to update business profile');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
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
      <div className="space-y-6">
        <div className="text-muted/70">Loading...</div>
      </div>
    );
  }

  if (userRole !== 'pro') {
    return (
      <div className="space-y-6">
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text mb-2">My Business</h1>
        <p className="text-muted">
          Control what customers see, what you offer, and when you’re available.
          Save anytime.
        </p>
        <div className="mt-3">
          <TrustRow />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-surface2 text-text border border-[var(--surface-border)] border-l-[3px] border-l-accent'
                : 'text-muted hover:bg-surface2'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
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

      {/* Tab Content */}
      <div className="surface-card p-6 overflow-visible">
        {/* Edit Business Profile Tab */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="text-sm text-muted/70">
              These details appear on your public listing. Required fields are marked with *.
            </div>

            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-muted mb-1">
                Business name *
              </label>
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
                Primary service category *
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
                <option value="">{activeCategories.length ? 'Select a category' : 'No categories available yet'}</option>
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
          <div className="space-y-6">
            <div>
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
                <div className="surface-card p-4 mb-6">
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
                            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-surface2 cursor-pointer"
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
                        className="px-4 py-2 bg-accent text-accentContrast rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
              <div className="surface-card p-4 mb-4">
                <div className="flex items-start justify-between gap-4">
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
                  {serviceTypes.map((service) => (
                    <div key={service.id} className="surface-card p-4">
                      {editingServiceId === service.id ? (
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
                              onClick={() => {
                                if (editServiceForm.name && editServiceForm.price && service.id) {
                                  void handleUpdateService(service.id, editServiceForm.name, editServiceForm.price);
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
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <p className="font-medium text-text">{service.name}</p>
                            <p className="text-sm text-muted">${service.price}</p>
                          </div>
                          <button
                            onClick={() => {
                              setEditingServiceId(service.id ?? null);
                              setEditServiceForm({ name: service.name, price: service.price });
                            }}
                            className="px-3 py-1 text-sm text-text hover:bg-surface2 rounded-lg transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => service.id && void handleRemoveService(service.id)}
                            className="px-3 py-1 text-sm text-red-600 hover:bg-danger/10 rounded-lg transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted/70 mb-6">No services added yet.</p>
              )}

              <div className="border-t border-border pt-6">
                <h4 className="font-medium text-text mb-4">Add New Service</h4>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <input
                    type="text"
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    placeholder="Service name"
                    className="px-3 py-2 border border-border rounded-lg bg-surface text-text focus:ring-2 focus:ring-accent/40 focus:border-accent"
                  />
                  <input
                    type="number"
                    value={newServicePrice}
                    onChange={(e) => setNewServicePrice(e.target.value)}
                    placeholder="Price ($)"
                    min="0"
                    step="0.01"
                    className="px-3 py-2 border border-border rounded-lg bg-surface text-text focus:ring-2 focus:ring-accent/40 focus:border-accent"
                  />
                </div>
                <button
                  onClick={() => void handleAddService()}
                  className="px-4 py-2 bg-accent text-accentContrast rounded-lg hover:bg-accent transition-colors"
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-surface2 border border-[var(--surface-border)] rounded-lg">
                    <p className="text-sm text-muted mb-1">Total Earnings</p>
                    <p className="text-2xl font-bold text-accent">
                      {formatMoney(Math.round(earnings?.totalEarnings || 0))}
                    </p>
                  </div>
                  <div className="p-4 bg-surface2 border border-[var(--surface-border)] rounded-lg">
                    <p className="text-sm text-muted mb-1">This Month</p>
                    <p className="text-2xl font-bold text-accent">
                      {formatMoney(Math.round(earnings?.thisMonth || 0))}
                    </p>
                  </div>
                  <div className="p-4 bg-surface2 border border-border rounded-lg">
                    <p className="text-sm text-muted mb-1">Jobs Completed</p>
                    <p className="text-2xl font-bold text-text">
                      {earnings?.completedJobs || 0}
                    </p>
                  </div>
                  <div className="p-4 bg-surface2 border border-[var(--surface-border)] rounded-lg">
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
                      <div key={booking.id} className="surface-card flex items-center justify-between p-3">
                        <div>
                          <p className="font-medium text-text">{booking.customerName}</p>
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
