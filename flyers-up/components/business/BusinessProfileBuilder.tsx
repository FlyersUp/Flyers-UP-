'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { MapPin, ImagePlus, Check, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Switch } from '@/components/ui/Switch';
import { Button } from '@/components/ui/Button';
import { ProfileStrength, type ProfileStrengthChecklist } from './ProfileStrength';
import { summarizeBusinessHours } from '@/lib/utils/businessHours';
import type { BusinessHoursModelV1 } from '@/lib/utils/businessHours';
import { getProfilePhotoUrl, uploadProfilePhoto } from '@/lib/proProfile';
import { supabase } from '@/lib/supabaseClient';
import { PLATFORM_FEE_BPS } from '@/lib/bookings/money';
import { cn } from '@/lib/cn';

const PLATFORM_FEE_PERCENT = PLATFORM_FEE_BPS / 100;
const MAX_WORK_PHOTOS = 6;
const SUGGESTED_PRICE_MIN = 18;
const SUGGESTED_PRICE_MAX = 35;

function safeExtFromFile(file: File): string {
  const n = (file.name || '').toLowerCase();
  const m = n.match(/\.([a-z0-9]+)$/i);
  const ext = m?.[1] ?? '';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'heic'].includes(ext)) return ext === 'jpeg' ? 'jpg' : ext;
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'image/gif') return 'gif';
  if (file.type === 'image/jpeg') return 'jpg';
  return 'png';
}

export interface BusinessProfileBuilderProps {
  userId: string;
  displayName: string;
  bio: string;
  categoryId: string;
  categoryName: string;
  startingPrice: string;
  minJobPrice: string;
  serviceRadius: string;
  location: string;
  available: boolean;
  businessHoursModel: BusinessHoursModelV1;
  beforeAfterPhotos: string[];
  profilePhotoUrl: string;
  identityVerified: boolean;
  backgroundChecked: boolean;
  insuranceUploaded: boolean;
  phoneVerified: boolean;
  onDisplayNameChange: (v: string) => void;
  onBioChange: (v: string) => void;
  onCategoryIdChange: (v: string) => void;
  onStartingPriceChange: (v: string) => void;
  onMinJobPriceChange: (v: string) => void;
  onServiceRadiusChange: (v: string) => void;
  onLocationChange: (v: string) => void;
  onAvailableChange: (v: boolean) => void;
  onBusinessHoursModelChange: (v: BusinessHoursModelV1) => void;
  onBeforeAfterPhotosChange: (v: string[]) => void;
  onProfilePhotoChange: (url: string) => void;
  categories: Array<{ id: string; name: string }>;
  scheduleTabHref?: string;
  trustSafetyHref?: string;
  onEditSchedule?: () => void;
}

export function BusinessProfileBuilder({
  userId,
  displayName,
  bio,
  categoryId,
  categoryName,
  startingPrice,
  minJobPrice,
  serviceRadius,
  location,
  available,
  businessHoursModel,
  beforeAfterPhotos,
  profilePhotoUrl,
  identityVerified,
  backgroundChecked,
  insuranceUploaded,
  phoneVerified,
  onDisplayNameChange,
  onBioChange,
  onCategoryIdChange,
  onStartingPriceChange,
  onMinJobPriceChange,
  onServiceRadiusChange,
  onLocationChange,
  onAvailableChange,
  onBeforeAfterPhotosChange,
  onProfilePhotoChange,
  categories,
  scheduleTabHref = '/settings/business',
  trustSafetyHref = '/pro/settings/safety-compliance',
  onEditSchedule,
}: BusinessProfileBuilderProps) {
  const profileInputRef = useRef<HTMLInputElement>(null);
  const workPhotoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingWorkPhoto, setUploadingWorkPhoto] = useState(false);

  const startingPriceNum = parseFloat(startingPrice) || 0;
  const proReceives = startingPriceNum > 0
    ? Math.round((startingPriceNum * (1 - PLATFORM_FEE_PERCENT / 100)) * 100) / 100
    : 0;

  const checklist: ProfileStrengthChecklist = {
    businessName: Boolean(displayName?.trim()),
    occupation: Boolean(categoryId),
    startingPrice: startingPriceNum > 0,
    profilePhoto: Boolean(profilePhotoUrl),
    workPhotos: beforeAfterPhotos.length >= 3,
    description: Boolean(bio?.trim()),
    servicePackages: true, // Service types managed in Services tab; could check serviceTypes.length when passed
  };

  const typicalSchedule = summarizeBusinessHours(businessHoursModel);

  async function handleProfilePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploadingProfile(true);
    try {
      const res = await uploadProfilePhoto(userId, file);
      if (res.success && res.url) {
        onProfilePhotoChange(res.url);
      }
    } finally {
      setUploadingProfile(false);
      e.target.value = '';
    }
  }

  async function handleWorkPhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId || beforeAfterPhotos.length >= MAX_WORK_PHOTOS) return;
    setUploadingWorkPhoto(true);
    try {
      const ext = safeExtFromFile(file);
      const safeName = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
      const path = `${userId}/work/${safeName}`;
      const { data, error } = await supabase.storage.from('profile-images').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined,
      });
      if (error || !data?.path) throw new Error(error?.message || 'Upload failed');
      const { data: urlData } = supabase.storage.from('profile-images').getPublicUrl(data.path);
      onBeforeAfterPhotosChange([...beforeAfterPhotos, urlData.publicUrl]);
    } finally {
      setUploadingWorkPhoto(false);
      e.target.value = '';
    }
  }

  function removeWorkPhoto(index: number) {
    onBeforeAfterPhotosChange(beforeAfterPhotos.filter((_, i) => i !== index));
  }

  const coveragePlaceholder = location
    ? `Coverage includes areas within ${serviceRadius || '?'} miles of ${location}`
    : 'Set your location and radius to see coverage';

  return (
    <div className="space-y-6 pb-24">
      {/* 1. Profile Strength */}
      <ProfileStrength checklist={checklist} />

      {/* 2. Business Info */}
      <Card padding="lg">
        <h3 className="text-base font-semibold text-text mb-4">Business Info</h3>
        <div className="space-y-4">
          <Input
            label="Business Name"
            value={displayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
            placeholder="What customers should call you"
            required
          />
          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">Profile Photo</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-border bg-surface2 flex items-center justify-center overflow-hidden">
                {profilePhotoUrl ? (
                  <img src={profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <ImagePlus className="h-8 w-8 text-muted/60" />
                )}
              </div>
              <div>
                <input
                  ref={profileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfilePhotoUpload}
                  disabled={uploadingProfile}
                />
                <Button
                  variant="secondary"
                  onClick={() => profileInputRef.current?.click()}
                  disabled={uploadingProfile}
                  showArrow={false}
                >
                  {uploadingProfile ? 'Uploading…' : 'Upload photo'}
                </Button>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">Primary Occupation</label>
            <select
              value={categoryId}
              onChange={(e) => onCategoryIdChange(e.target.value)}
              className="w-full px-4 py-3 rounded-[var(--radius-lg)] border border-border bg-surface text-text focus:ring-2 focus:ring-accent/40 focus:border-accent"
            >
              <option value="">Select your occupation</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <Textarea
            label="About Your Service"
            value={bio}
            onChange={(e) => onBioChange(e.target.value)}
            rows={5}
            placeholder={`Tell customers about your service:
• Your experience
• Types of jobs you handle
• Your approach
• Neighborhoods you serve`}
          />
        </div>
      </Card>

      {/* 3. Pricing */}
      <Card padding="lg">
        <h3 className="text-base font-semibold text-text mb-4">Pricing</h3>
        <div className="space-y-4">
          <div>
            <Input
              label="Starting Price ($)"
              type="number"
              min={0}
              step="0.01"
              value={startingPrice}
              onChange={(e) => onStartingPriceChange(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-xs text-muted mt-2">
              Suggested range for this occupation in your area: ${SUGGESTED_PRICE_MIN} – ${SUGGESTED_PRICE_MAX}
            </p>
          </div>
          <div>
            <Input
              label="Minimum Job Price ($)"
              type="number"
              min={0}
              step="0.01"
              value={minJobPrice}
              onChange={(e) => onMinJobPriceChange(e.target.value)}
              placeholder="Optional"
            />
            <p className="text-xs text-muted mt-2">
              You will never receive bookings below this amount.
            </p>
          </div>
          {startingPriceNum > 0 && (
            <div className="p-4 rounded-xl bg-surface2 border border-border">
              <p className="text-sm font-medium text-text mb-1">Earnings transparency</p>
              <p className="text-sm text-muted">
                Customer pays: ${startingPriceNum.toFixed(2)} → You receive: ${proReceives.toFixed(2)} after platform fee
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* 4. Service Area */}
      <Card padding="lg">
        <h3 className="text-base font-semibold text-text mb-4">Service Area</h3>
        <div className="space-y-4">
          <Input
            label="Location (city or neighborhood)"
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            placeholder="e.g., Hoboken"
          />
          <div>
            <Input
              label="Service Radius (miles)"
              type="number"
              min={0}
              value={serviceRadius}
              onChange={(e) => onServiceRadiusChange(e.target.value)}
              placeholder="e.g., 15"
            />
            <div className="mt-3 p-3 rounded-lg bg-surface2 border border-border">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-muted mt-0.5" />
                <div className="text-sm text-muted">
                  {location ? (
                    <>
                      <span className="font-medium text-text">Based in {location}</span>
                      <br />
                      {coveragePlaceholder}
                    </>
                  ) : (
                    'Add your location to see coverage preview'
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 5. Portfolio Photos */}
      <Card padding="lg">
        <h3 className="text-base font-semibold text-text mb-2">Add Work Photos (Recommended)</h3>
        <p className="text-sm text-muted mb-4">
          Upload photos of: completed jobs, before/after results, equipment or workspace. These appear in your Pro profile.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {beforeAfterPhotos.map((url, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-border group">
              <img src={url} alt={`Work ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeWorkPhoto(i)}
                className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove photo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          {beforeAfterPhotos.length < MAX_WORK_PHOTOS && (
            <label className="aspect-square rounded-xl border-2 border-dashed border-border bg-surface2 flex items-center justify-center cursor-pointer hover:bg-surface transition-colors">
              <input
                ref={workPhotoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleWorkPhotoUpload}
                disabled={uploadingWorkPhoto}
              />
              {uploadingWorkPhoto ? (
                <span className="text-sm text-muted">Uploading…</span>
              ) : (
                <ImagePlus className="h-8 w-8 text-muted/60" />
              )}
            </label>
          )}
        </div>
        <p className="text-xs text-muted mt-2">Up to {MAX_WORK_PHOTOS} photos</p>
      </Card>

      {/* 6. Trust & Verification */}
      <Card padding="lg">
        <h3 className="text-base font-semibold text-text mb-4">Trust & Verification</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { done: identityVerified, label: 'Government ID verified' },
            { done: phoneVerified, label: 'Phone verified' },
            { done: backgroundChecked, label: 'Background check' },
            { done: insuranceUploaded, label: 'Insurance uploaded' },
          ].map(({ done, label }) => (
            <div
              key={label}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg border',
                done ? 'border-accent/30 bg-accent/5' : 'border-border bg-surface2'
              )}
            >
              {done ? <Check className="h-4 w-4 text-accent shrink-0" /> : <span className="w-4 h-4 rounded-full border border-muted shrink-0" />}
              <span className={cn('text-sm', done ? 'text-text' : 'text-muted')}>{label}</span>
            </div>
          ))}
        </div>
        <Link
          href={trustSafetyHref}
          className="inline-block mt-3 text-sm font-medium text-accent hover:underline"
        >
          Manage verification →
        </Link>
      </Card>

      {/* 7. Availability Summary */}
      <Card padding="lg">
        <h3 className="text-base font-semibold text-text mb-4">Availability</h3>
        <div className="space-y-2 text-sm">
          <p className="text-muted">
            <span className="font-medium text-text">Typical Schedule:</span>{' '}
            {typicalSchedule || 'No availability set'}
          </p>
          {onEditSchedule ? (
            <button
              type="button"
              onClick={onEditSchedule}
              className="text-sm font-medium text-accent hover:underline"
            >
              Edit full schedule →
            </button>
          ) : (
            <Link
              href={scheduleTabHref}
              className="inline-block text-sm font-medium text-accent hover:underline"
            >
              Edit full schedule →
            </Link>
          )}
        </div>
      </Card>

      {/* 8. Accepting Customers Toggle */}
      <Card padding="lg">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-text">Accepting New Customers</h3>
            <p className="text-sm text-muted mt-1">
              {available
                ? 'Customers can discover and book you.'
                : 'Your listing is hidden.'}
            </p>
          </div>
          <Switch
            checked={available}
            onCheckedChange={onAvailableChange}
            aria-label="Accepting new customers"
          />
        </div>
      </Card>

      {/* 9. Public Listing Preview */}
      <Card padding="lg" className="border-2 border-accent/20">
        <h3 className="text-base font-semibold text-text mb-4">Listing Preview</h3>
        <p className="text-xs text-muted mb-3">What customers see:</p>
        <div className="p-4 rounded-xl bg-surface2 border border-border">
          <div className="flex gap-3">
            <div className="w-14 h-14 rounded-xl bg-surface border border-border overflow-hidden shrink-0">
              {profilePhotoUrl ? (
                <img src={profilePhotoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted/50 text-xs">Photo</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-text truncate">{displayName || 'Your business name'}</p>
              <p className="text-sm text-muted truncate">{categoryName || 'Occupation'} • {location || 'Location'}</p>
              <p className="text-xs text-accent mt-1">Starting at ${startingPriceNum > 0 ? startingPriceNum.toFixed(0) : '—'}</p>
            </div>
          </div>
          {bio && (
            <p className="text-sm text-muted mt-3 line-clamp-2">&quot;{bio}&quot;</p>
          )}
          <p className="text-xs text-muted mt-2">Service radius: {serviceRadius || '—'} miles</p>
        </div>
      </Card>
    </div>
  );
}
