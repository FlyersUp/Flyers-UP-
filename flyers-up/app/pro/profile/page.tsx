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

interface ProProfileData {
  displayName: string;
  bio: string;
  categoryId: string;
  categorySlug: string;
  startingPrice: string;
  location: string;
  serviceRadius: string;
  businessHours: string;
  yearsExperience: string;
  verifiedCredentials: string[];
  servicesOffered: string[];
  availabilityTime: string;
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
    businessHours: '',
    yearsExperience: '',
    verifiedCredentials: [],
    servicesOffered: [],
    availabilityTime: '',
    darkMode: false,
    jobsCompleted: 0,
    averageRating: 0,
  });

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
        setFormData({
          displayName: proData.displayName || '',
          bio: proData.bio || '',
          categoryId: proData.categoryId || '',
          categorySlug: category?.slug || '',
          startingPrice: proData.startingPrice?.toString() || '0',
          location: proFullData?.location || extendedData.location || '',
          serviceRadius: proData.serviceRadius?.toString() || '',
          businessHours: proData.businessHours || '',
          yearsExperience: extendedData.yearsExperience?.toString() || '0',
          verifiedCredentials: extendedData.verifiedCredentials || [],
          servicesOffered: extendedData.servicesOffered || [category?.slug || ''],
          availabilityTime: extendedData.availabilityTime || '',
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

      // Validate bio length (500 words max)
      const wordCount = formData.bio.trim().split(/\s+/).filter(Boolean).length;
      if (wordCount > 500) {
        setError('Bio must be 500 words or less.');
        return;
      }

      // Update service pro (only fields that exist in DB)
      const result = await updateMyServiceProAction({
        display_name: formData.displayName,
        bio: formData.bio,
        category_id: formData.categoryId,
        starting_price: parseFloat(formData.startingPrice) || 0,
        location: formData.location,
        service_radius: formData.serviceRadius ? parseInt(formData.serviceRadius) : undefined,
        business_hours: formData.businessHours,
      });

      if (!result.success) {
        setError(result.error || 'Failed to update profile.');
        return;
      }

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

          {/* Availability Time */}
          <div className="bg-surface rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold text-text mb-4">Availability</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Business Hours</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.businessHours}
                    onChange={(e) => setFormData({ ...formData, businessHours: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent/40 focus:border-accent"
                    placeholder="e.g., Mon-Fri: 9am-5pm, Sat: 10am-2pm"
                  />
                ) : (
                  <p className="text-text">{formData.businessHours || 'Not set'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Availability Time</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.availabilityTime}
                    onChange={(e) => setFormData({ ...formData, availabilityTime: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent/40 focus:border-accent"
                    placeholder="e.g., Available 24/7, Weekends only, etc."
                  />
                ) : (
                  <p className="text-text">{formData.availabilityTime || 'Not set'}</p>
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

