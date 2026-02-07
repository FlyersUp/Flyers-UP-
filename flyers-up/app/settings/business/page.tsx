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
import { useProEarningsRealtime } from '@/hooks';
import { formatMoney } from '@/lib/utils/money';
import { TrustRow } from '@/components/ui/TrustRow';
import { WeeklySchedulePicker } from '@/components/ui/WeeklySchedulePicker';
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
  const [startingPrice, setStartingPrice] = useState('');
  const [serviceRadius, setServiceRadius] = useState('');
  const [businessHoursModel, setBusinessHoursModel] = useState(() => defaultBusinessHoursModel());

  // Service management
  const [serviceTypes, setServiceTypes] = useState<Array<{ name: string; price: string; id?: string }>>([]);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');

  // Earnings
  const { earnings, loading: earningsLoading } = useProEarningsRealtime(userId);

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  async function checkAuthAndLoad() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push(`/signin?next=${encodeURIComponent(pathname || '/pro/settings/business')}`);
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

      // Load categories
      const cats = await getServiceCategories();
      setCategories(cats);

      // Load business data
      const proData = await getMyServicePro(user.id);
      if (proData) {
        setDisplayName(proData.displayName);
        setBio(proData.bio || '');
        setCategoryId(proData.categoryId);
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

      const result = await updateMyServiceProAction({
        display_name: displayName,
        bio: bio || undefined,
        category_id: categoryId || undefined,
        starting_price: startingPrice ? parseFloat(startingPrice) : undefined,
        service_radius: serviceRadius ? parseInt(serviceRadius) : undefined,
        business_hours: stringifyBusinessHoursModel(businessHoursModel),
      }, accessToken);

      if (result.success) {
        setSuccess('Business profile updated successfully');
        // Read-after-write: re-fetch from Supabase source of truth.
        const proData = await getMyServicePro(userId);
        if (proData) {
          setDisplayName(proData.displayName);
          setBio(proData.bio || '');
          setCategoryId(proData.categoryId);
          setStartingPrice(proData.startingPrice.toString());
          setServiceRadius(proData.serviceRadius?.toString() || '');
          setBusinessHoursModel(parseBusinessHoursModel(proData.businessHours || ''));
        }
      } else {
        setError(result.error || 'Failed to update business profile');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function persistServiceTypes(next: Array<{ name: string; price: string; id?: string }>) {
    // Best-effort: keep a local fallback while we migrate older data.
    try {
      localStorage.setItem('proServiceTypes', JSON.stringify(next));
    } catch {
      // ignore
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const res = await updateMyServiceProAction({ service_types: next as unknown[] }, session?.access_token ?? undefined);
    if (!res.success) {
      setError(res.error || 'Failed to save services.');
      return;
    }
    if (userId) {
      const proData = await getMyServicePro(userId);
      if (proData?.serviceTypes) setServiceTypes(proData.serviceTypes);
    }
  }

  function handleAddService() {
    if (!newServiceName || !newServicePrice) {
      setError('Please enter both service name and price');
      return;
    }

    const newService = {
      name: newServiceName,
      price: newServicePrice,
      id: Date.now().toString(),
    };

    const updated = [...serviceTypes, newService];
    setServiceTypes(updated);
    void persistServiceTypes(updated);
    setNewServiceName('');
    setNewServicePrice('');
    setSuccess('Service added successfully');
  }

  function handleRemoveService(id: string) {
    const updated = serviceTypes.filter(s => s.id !== id);
    setServiceTypes(updated);
    void persistServiceTypes(updated);
    setSuccess('Service removed successfully');
  }

  function handleUpdateService(id: string, name: string, price: string) {
    const updated = serviceTypes.map(s => 
      s.id === id ? { ...s, name, price } : s
    );
    setServiceTypes(updated);
    void persistServiceTypes(updated);
    setSuccess('Service updated successfully');
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
        <div className="p-4 bg-warning/15 border border-warning/30 rounded-lg text-accent">
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
    { id: 'profile' as TabType, label: 'Edit Profile', icon: '👤' },
    { id: 'schedule' as TabType, label: 'Schedule', icon: '📅' },
    { id: 'services' as TabType, label: 'Services', icon: '🔧' },
    { id: 'income' as TabType, label: 'Income & Tips', icon: '💰' },
    { id: 'reviews' as TabType, label: 'Reviews', icon: '⭐' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text mb-2">My Business</h1>
        <p className="text-muted">Manage your business profile and service details</p>
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
                ? 'bg-accent/15 text-text'
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
        <div className="p-4 bg-success/15 border border-success/30 rounded-lg text-text">
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
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-muted mb-1">
                Business Name *
              </label>
              <input
                type="text"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text focus:ring-2 focus:ring-accent/40 focus:border-accent"
                placeholder="Your business or display name"
              />
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-muted mb-1">
                About / Bio
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text focus:ring-2 focus:ring-accent/40 focus:border-accent"
                placeholder="Tell customers about your services and experience"
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-muted mb-1">
                Service Category *
              </label>
              <select
                id="category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text focus:ring-2 focus:ring-accent/40 focus:border-accent"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="startingPrice" className="block text-sm font-medium text-muted mb-1">
                Starting Price ($) *
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
            </div>

            <div>
              <label htmlFor="serviceRadius" className="block text-sm font-medium text-muted mb-1">
                Service Radius (miles)
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

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-accent text-accentContrast rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
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
                Check the days you work, then pick start/end times.
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
                
                if (userId) {
                  const {
                    data: { session },
                  } = await supabase.auth.getSession();
                  const res = await updateMyServiceProAction({
                    business_hours: stringifyBusinessHoursModel(businessHoursModel),
                  }, session?.access_token ?? undefined);
                  if (!res.success) {
                    setError(res.error || 'Failed to save schedule.');
                    setLoading(false);
                    return;
                  }
                }
                setLoading(false);
                setSuccess('Schedule updated successfully');
              }}
              disabled={loading}
              className="px-4 py-2 bg-accent text-accentContrast rounded-lg hover:bg-accent disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving...' : 'Save Schedule'}
            </button>
          </div>
        )}

        {/* Manage Service Tab */}
        {activeTab === 'services' && (
          <div className="space-y-6">
            <div>
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
                    className="shrink-0 text-sm font-medium text-accent hover:underline"
                  >
                    Manage →
                  </Link>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-text mb-4">Your Services</h3>
              
              {serviceTypes.length > 0 ? (
                <div className="space-y-3 mb-6">
                  {serviceTypes.map((service) => (
                    <div key={service.id} className="surface-card flex items-center gap-3 p-4">
                      <div className="flex-1">
                        <p className="font-medium text-text">{service.name}</p>
                        <p className="text-sm text-muted">${service.price}</p>
                      </div>
                      <button
                        onClick={() => {
                          const newName = prompt('Service name:', service.name);
                          const newPrice = prompt('Price ($):', service.price);
                          if (newName && newPrice && service.id) {
                            handleUpdateService(service.id, newName, newPrice);
                          }
                        }}
                        className="px-3 py-1 text-sm text-accent hover:bg-success/15 rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => service.id && handleRemoveService(service.id)}
                        className="px-3 py-1 text-sm text-red-600 hover:bg-danger/10 rounded-lg transition-colors"
                      >
                        Remove
                      </button>
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
                  onClick={handleAddService}
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
                  <div className="p-4 bg-success/15 rounded-lg">
                    <p className="text-sm text-muted mb-1">Total Earnings</p>
                    <p className="text-2xl font-bold text-accent">
                      {formatMoney(Math.round(earnings?.totalEarnings || 0))}
                    </p>
                  </div>
                  <div className="p-4 bg-info/10 rounded-lg border border-border">
                    <p className="text-sm text-muted mb-1">This Month</p>
                    <p className="text-2xl font-bold text-info">
                      {formatMoney(Math.round(earnings?.thisMonth || 0))}
                    </p>
                  </div>
                  <div className="p-4 bg-surface2 border border-border rounded-lg">
                    <p className="text-sm text-muted mb-1">Jobs Completed</p>
                    <p className="text-2xl font-bold text-text">
                      {earnings?.completedJobs || 0}
                    </p>
                  </div>
                  <div className="p-4 bg-warning/15 rounded-lg">
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
