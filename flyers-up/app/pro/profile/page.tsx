'use client';

/**
 * Pro Profile Page
 * Dedicated profile page for service professionals
 * Allows pros to view and edit their profile information
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import PageLayout from '@/components/PageLayout';
import { getCurrentUser, getMyServicePro, getServiceCategories, type ServiceCategory } from '@/lib/api';
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
  servicesOffered: string[];
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
    servicesOffered: [],
    darkMode: false,
    jobsCompleted: 0,
    averageRating: 0,
  });
  const [businessHoursModel, setBusinessHoursModel] = useState(() => defaultBusinessHoursModel());

  useEffect(() => {
    loadProfile();
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const cats = await getServiceCategories();
    setCategories(cats);
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const user = await getCurrentUser();
      if (!user || user.role !== 'pro') {
        router.push(`/signin?role=pro&next=${encodeURIComponent(pathname || '/pro/profile')}`);
        return;
      }

      const proData = await getMyServicePro(user.id);
      
      // Load extended profile data from localStorage
      // Legacy fallback only (older sessions stored some fields locally).
      const extendedDataStr = localStorage.getItem('proProfile_extended');
      const extendedData = extendedDataStr ? JSON.parse(extendedDataStr) : {};
      
      // Get rating and review count from service_pros
      const { data: proFullData } = await supabase
        .from('service_pros')
        .select('rating, review_count, location')
        .eq('user_id', user.id)
        .single();
      
      if (proData) {
        const category = categories.find(c => c.id === proData.categoryId);
        setBusinessHoursModel(parseBusinessHoursModel(proData.businessHours || ''));
        setFormData({
          displayName: proData.displayName || '',
          bio: proData.bio || '',
          categoryId: proData.categoryId || '',
          categorySlug: category?.slug || '',
          startingPrice: proData.startingPrice?.toString() || '0',
          location: proFullData?.location || extendedData.location || '',
          serviceRadius: proData.serviceRadius?.toString() || '',
          yearsExperience: (proData.yearsExperience != null ? String(proData.yearsExperience) : (extendedData.yearsExperience?.toString() || '0')),
          verifiedCredentials:
            (proData.verifiedCredentials && proData.verifiedCredentials.length > 0)
              ? proData.verifiedCredentials
              : (extendedData.verifiedCredentials || []),
          servicesOffered:
            (proData.servicesOffered && proData.servicesOffered.length > 0)
              ? proData.servicesOffered
              : (extendedData.servicesOffered || [category?.slug || '']),
          darkMode: localStorage.getItem('darkMode') === 'true',
          jobsCompleted: proFullData?.review_count || 0,
          averageRating: proFullData?.rating || 0,
        });
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

      const result = await updateMyServiceProAction({
        display_name: displayName,
        bio: formData.bio,
        category_id: formData.categoryId || undefined,
        starting_price: startingPriceNum ?? undefined,
        location: formData.location.trim() || undefined,
        service_radius: formData.serviceRadius ? parseInt(formData.serviceRadius) : undefined,
        business_hours: stringifyBusinessHoursModel(businessHoursModel),
        years_experience: yearsExpNum ?? undefined,
        services_offered: formData.servicesOffered,
        certifications: formData.verifiedCredentials,
      });

      if (!result.success) {
        setError(result.error || 'Failed to update profile.');
        return;
      }

      // Legacy best-effort: keep localStorage in sync for older pages still reading it.
      try {
        const ext = {
          yearsExperience: Number(formData.yearsExperience || 0),
          verifiedCredentials: formData.verifiedCredentials,
          servicesOffered: formData.servicesOffered,
        };
        localStorage.setItem('proProfile_extended', JSON.stringify(ext));
      } catch {}

      // Save dark mode preference
      localStorage.setItem('darkMode', formData.darkMode.toString());

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

  const toggleService = (service: string) => {
    if (formData.servicesOffered.includes(service)) {
      setFormData({
        ...formData,
        servicesOffered: formData.servicesOffered.filter(s => s !== service),
      });
    } else {
      setFormData({
        ...formData,
        servicesOffered: [...formData.servicesOffered, service],
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

  return (
    <PageLayout showBackButton backButtonHref="/dashboard/pro">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text">My Profile</h1>
            <p className="text-muted">Manage your professional profile</p>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-accent hover:bg-accent text-accentContrast rounded-lg font-medium transition-colors"
            >
              Edit Profile
            </button>
          )}
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 p-3 bg-success/15 border border-success/30 rounded-lg text-text text-sm">
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
                <label className="block text-sm font-medium text-text mb-1">Service Category</label>
                {isEditing ? (
                  <select
                    value={formData.categoryId}
                    onChange={(e) => {
                      const selected = categories.find(c => c.id === e.target.value);
                      setFormData({
                        ...formData,
                        categoryId: e.target.value,
                        categorySlug: selected?.slug || '',
                      });
                    }}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent/40 focus:border-accent"
                  >
                    <option value="">Select a category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-text">{formData.categorySlug || 'Not set'}</p>
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
                      ? 'bg-success/15 border-accent/40 text-text'
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

          {/* Services Offered */}
          <div className="bg-surface rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold text-text mb-4">Services Offered</h2>
            <div className="flex flex-wrap gap-3">
              {categories.map(cat => (
                <label
                  key={cat.id}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                    formData.servicesOffered.includes(cat.slug)
                      ? 'bg-success/15 border-accent/40 text-text'
                      : 'bg-surface2 border-border text-text hover:bg-surface2'
                  } ${!isEditing ? 'cursor-default' : ''}`}
                >
                  {isEditing && (
                    <input
                      type="checkbox"
                      checked={formData.servicesOffered.includes(cat.slug)}
                      onChange={() => toggleService(cat.slug)}
                      className="w-4 h-4 rounded border-border text-accent focus:ring-accent/40"
                    />
                  )}
                  {!isEditing && formData.servicesOffered.includes(cat.slug) && (
                    <span className="text-accent">✓</span>
                  )}
                  <span>{cat.icon} {cat.name}</span>
                </label>
              ))}
            </div>
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
          <div className="bg-surface rounded-xl border border-border p-6">
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
      </div>
    </PageLayout>
  );
}

