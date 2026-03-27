'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { getCurrentUser, getServiceCategories, type ServiceCategory } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { SideMenu } from '@/components/ui/SideMenu';
import { JobDetailsForm, PhotoUploadGrid, PriceEstimateCard } from '@/components/scope-lock';
import { computePriceEstimate } from '@/lib/scopeLock/priceCalculator';
import type { JobDetails, PhotoEntry } from '@/lib/scopeLock/jobDetailsSchema';

const REQUIRED_PHOTO_MIN = 2;
const MAX_REQUEST_PHOTOS = 12;

function fileFingerprint(f: File): string {
  return `${f.name}:${f.size}:${f.lastModified}`;
}

export default function NewRequestPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('Account');
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [location, setLocation] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);

  const [jobDetails, setJobDetails] = useState<Partial<JobDetails>>({
    home_size_sqft: undefined,
    bedrooms: 0,
    bathrooms: 0,
    cleaning_type: 'standard',
    condition: 'moderate',
    pets: false,
    addons: [],
  });
  const [photosCategorized, setPhotosCategorized] = useState<PhotoEntry[]>([]);

  useEffect(() => {
    const guard = async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.replace(`/auth?next=${encodeURIComponent('/customer/requests/new')}`);
        return;
      }
      setUserId(user.id);
      setUserName(user.email?.split('@')[0] ?? 'Account');
      setReady(true);
    };
    void guard();
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    getServiceCategories().then(setCategories);
  }, [ready]);

  const uploadPhoto = useCallback(
    async (file: File, category: string): Promise<string> => {
      if (!userId) throw new Error('Not authenticated');
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${userId}/job-requests/${Date.now()}-${category}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('profile-images')
        .upload(path, file, { upsert: true });
      if (uploadErr) throw new Error(uploadErr.message);
      const { data } = supabase.storage.from('profile-images').getPublicUrl(path);
      return data.publicUrl;
    },
    [userId]
  );

  async function uploadPhotos(): Promise<string[]> {
    if (!userId || photoFiles.length === 0) return [];
    const urls: string[] = [];
    for (let i = 0; i < photoFiles.length; i++) {
      const file = photoFiles[i];
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${userId}/job-requests/${Date.now()}-${i}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('profile-images')
        .upload(path, file, { upsert: true });
      if (!uploadErr) {
        const { data } = supabase.storage.from('profile-images').getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    return urls;
  }

  const handleNonCleaningPhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (picked.length === 0) return;
    setPhotoFiles((prev) => {
      const seen = new Set(prev.map(fileFingerprint));
      const merged = [...prev];
      for (const f of picked) {
        const key = fileFingerprint(f);
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(f);
        if (merged.length >= MAX_REQUEST_PHOTOS) break;
      }
      return merged;
    });
  };

  const removePhotoFileAt = (index: number) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const isCleaning = serviceCategory.toLowerCase().includes('cleaning');
  const priceEstimate =
    isCleaning &&
    typeof jobDetails.home_size_sqft === 'number' &&
    jobDetails.home_size_sqft >= 100 &&
    jobDetails.condition
      ? computePriceEstimate({
          square_feet: jobDetails.home_size_sqft,
          bedrooms: jobDetails.bedrooms ?? 0,
          bathrooms: jobDetails.bathrooms ?? 0,
          cleaning_type: jobDetails.cleaning_type ?? 'standard',
          condition: jobDetails.condition,
          pets: jobDetails.pets ?? false,
          addons: jobDetails.addons ?? [],
        })
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!userId) return;
    if (!title.trim()) {
      setError('Please enter a title.');
      return;
    }
    if (!serviceCategory) {
      setError('Please select an occupation.');
      return;
    }
    if (!location.trim()) {
      setError('Please enter a location.');
      return;
    }
    if (isCleaning) {
      const sqft = jobDetails.home_size_sqft;
      if (typeof sqft !== 'number' || sqft < 100) {
        setError('Please enter home size (min 100 sq ft).');
        return;
      }
      if (photosCategorized.length < REQUIRED_PHOTO_MIN) {
        setError(`Please upload at least ${REQUIRED_PHOTO_MIN} photos.`);
        return;
      }
    } else if (photoFiles.length < REQUIRED_PHOTO_MIN) {
      setError(`Please upload at least ${REQUIRED_PHOTO_MIN} photos.`);
      return;
    }
    setSubmitting(true);
    try {
      const photos = photosCategorized.length > 0
        ? photosCategorized.map((p) => p.url)
        : await uploadPhotos();
      const photosCategorizedPayload =
        photosCategorized.length > 0 ? photosCategorized : undefined;
      const jobDetailsPayload = isCleaning ? jobDetails : undefined;
      const aiEstimate =
        priceEstimate && isCleaning
          ? { low: priceEstimate.estimate_low, high: priceEstimate.estimate_high }
          : undefined;

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const insertPayload: Record<string, unknown> = {
        customer_id: userId,
        title: title.trim(),
        description: description.trim() || null,
        service_category: serviceCategory,
        budget_min: budgetMin ? parseFloat(budgetMin) : null,
        budget_max: budgetMax ? parseFloat(budgetMax) : null,
        location: location.trim(),
        photos: photos,
        status: 'open',
        preferred_date: preferredDate || null,
        preferred_time: preferredTime || null,
        expires_at: expiresAt.toISOString(),
      };
      if (jobDetailsPayload) insertPayload.job_details = jobDetailsPayload;
      if (photosCategorizedPayload) insertPayload.photos_categorized = photosCategorizedPayload;
      if (aiEstimate) {
        insertPayload.ai_estimate_low = aiEstimate.low;
        insertPayload.ai_estimate_high = aiEstimate.high;
      }

      const { error: insertErr } = await supabase.from('job_requests').insert(insertPayload);

      if (insertErr) throw new Error(insertErr.message);
      router.push('/customer/requests');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create request.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) {
    return (
      <AppLayout mode="customer">
        <div className="min-h-[40vh] flex items-center justify-center">
          <p className="text-sm text-muted/70">Loading…</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout mode="customer">
      <div className="min-h-screen bg-[#F5F5F5]">
        <div className="sticky top-0 z-20 bg-[#F5F5F5]/95 backdrop-blur-sm border-b border-black/10">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link
              href="/customer/requests"
              className="text-sm font-medium text-black/70 hover:text-black"
            >
              ← Back
            </Link>
            <h1 className="text-xl font-semibold text-[#111]">New Request</h1>
            <div className="w-14" />
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#111] mb-1">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Sink leaking"
                className="w-full px-4 py-3 rounded-xl bg-[#F2F2F0] border border-black/10 text-[#111] placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-[#B2FBA5]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111] mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you need..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-[#F2F2F0] border border-black/10 text-[#111] placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-[#B2FBA5] resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111] mb-1">Occupation *</label>
              <select
                value={serviceCategory}
                onChange={(e) => setServiceCategory(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#F2F2F0] border border-black/10 text-[#111] focus:outline-none focus:ring-2 focus:ring-[#B2FBA5]"
                required
              >
                <option value="">Select occupation</option>
                {categories
                  .filter((c) => c.is_active_phase1 !== false)
                  .map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#111] mb-1">Budget min ($)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(e.target.value)}
                  placeholder="80"
                  className="w-full px-4 py-3 rounded-xl bg-[#F2F2F0] border border-black/10 text-[#111] placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-[#B2FBA5]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111] mb-1">Budget max ($)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                  placeholder="120"
                  className="w-full px-4 py-3 rounded-xl bg-[#F2F2F0] border border-black/10 text-[#111] placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-[#B2FBA5]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111] mb-1">Location *</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Williamsburg"
                className="w-full px-4 py-3 rounded-xl bg-[#F2F2F0] border border-black/10 text-[#111] placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-[#B2FBA5]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#111] mb-1">Preferred date</label>
                <input
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#F2F2F0] border border-black/10 text-[#111] focus:outline-none focus:ring-2 focus:ring-[#B2FBA5]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111] mb-1">Preferred time</label>
                <input
                  type="text"
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  placeholder="e.g. 2pm or Today"
                  className="w-full px-4 py-3 rounded-xl bg-[#F2F2F0] border border-black/10 text-[#111] placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-[#B2FBA5]"
                />
              </div>
            </div>

            {isCleaning ? (
              <>
                <div className="p-4 rounded-xl bg-white border border-black/10">
                  <h3 className="text-sm font-semibold text-[#111] mb-4">Job Details (required)</h3>
                  <JobDetailsForm
                    value={jobDetails}
                    onChange={setJobDetails}
                    errors={{}}
                  />
                </div>
                {priceEstimate && (
                  <PriceEstimateCard estimate={priceEstimate} />
                )}
                <div className="p-4 rounded-xl bg-white border border-black/10">
                  <PhotoUploadGrid
                    photos={photosCategorized}
                    onChange={setPhotosCategorized}
                    onUpload={uploadPhoto}
                    minRequired={REQUIRED_PHOTO_MIN}
                    errors={photosCategorized.length < REQUIRED_PHOTO_MIN && photosCategorized.length > 0 ? [`Add ${REQUIRED_PHOTO_MIN - photosCategorized.length} more photo(s)`] : []}
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium text-[#111] mb-1">
                  Photos (min {REQUIRED_PHOTO_MIN} required)
                </label>
                <p className="text-xs text-black/50 mb-2">
                  Add photos one at a time or several at once — each tap on &quot;Choose files&quot; adds to your list (up to {MAX_REQUEST_PHOTOS}).
                </p>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleNonCleaningPhotosChange}
                  disabled={photoFiles.length >= MAX_REQUEST_PHOTOS}
                  className="w-full px-4 py-3 rounded-xl bg-[#F2F2F0] border border-black/10 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#B2FBA5] file:font-semibold file:text-black disabled:opacity-60"
                />
                {photoFiles.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {photoFiles.map((f, i) => (
                      <li
                        key={`${fileFingerprint(f)}-${i}`}
                        className="flex items-center justify-between gap-2 text-xs text-black/70 bg-white border border-black/10 rounded-lg px-3 py-2"
                      >
                        <span className="truncate min-w-0" title={f.name}>
                          {f.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => removePhotoFileAt(i)}
                          className="shrink-0 text-red-600 font-medium hover:underline"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {photoFiles.length > 0 && (
                  <p className="mt-1 text-xs text-black/60">
                    {photoFiles.length} photo{photoFiles.length === 1 ? '' : 's'} selected
                    {photoFiles.length < REQUIRED_PHOTO_MIN &&
                      ` — add ${REQUIRED_PHOTO_MIN - photoFiles.length} more`}
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-[#B2FBA5] text-black font-semibold hover:opacity-95 disabled:opacity-60 transition-opacity"
            >
              {submitting ? 'Posting…' : 'Post Request'}
            </button>
          </form>
        </div>
      </div>
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} role="customer" userName={userName} />
    </AppLayout>
  );
}
