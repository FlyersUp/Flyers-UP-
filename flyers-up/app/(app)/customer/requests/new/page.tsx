'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { CustomerPageShell } from '@/components/customer/CustomerPageShell';
import { getCurrentUser, getServiceCategories, type ServiceCategory } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { JobDetailsForm, PhotoUploadGrid, PriceEstimateCard } from '@/components/scope-lock';
import { computePriceEstimate } from '@/lib/scopeLock/priceCalculator';
import type { JobDetails, PhotoEntry } from '@/lib/scopeLock/jobDetailsSchema';
import { isValidUsZip5, normalizeUsZip5 } from '@/lib/jobRequestLocation';

const REQUIRED_PHOTO_MIN = 2;
const MAX_REQUEST_PHOTOS = 12;

/** Match BookingForm / customer marketplace inputs (trust blue focus, white fields). */
const fieldClass =
  'w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-[#2d3436] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#4A69BD] focus:ring-2 focus:ring-[#4A69BD]/25 dark:border-white/12 dark:bg-[#14161c] dark:text-white dark:placeholder:text-white/40';

const labelClass = 'mb-1 block text-sm font-semibold text-[#2d3436] dark:text-white';

const sectionCardClass =
  'rounded-2xl border border-[#E8EAED] bg-white p-5 shadow-[0_4px_24px_rgba(74,105,189,0.06)] dark:border-white/10 dark:bg-[#1a1d24] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)]';

const primaryCtaClass =
  'w-full rounded-full bg-[#FFB347] py-3.5 text-base font-bold text-[#2d3436] shadow-[0_6px_20px_rgba(255,179,71,0.45)] transition-all hover:brightness-[1.02] active:scale-[0.98] disabled:opacity-50 dark:text-[#1a1a1a]';

function fileFingerprint(f: File): string {
  return `${f.name}:${f.size}:${f.lastModified}`;
}

export default function NewRequestPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('Account');
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [locationZip, setLocationZip] = useState('');
  const [locationNote, setLocationNote] = useState('');
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
      const fallback = user.email?.split('@')[0] ?? 'Account';
      const full = user.fullName?.trim();
      setUserName(full || fallback);
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
    const zip5 = normalizeUsZip5(locationZip);
    if (!zip5 || !isValidUsZip5(zip5)) {
      setError('Please enter a valid 5-digit US ZIP code.');
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
      const photos =
        photosCategorized.length > 0 ? photosCategorized.map((p) => p.url) : await uploadPhotos();
      const photosCategorizedPayload =
        photosCategorized.length > 0 ? photosCategorized : undefined;
      const jobDetailsPayload = isCleaning ? jobDetails : undefined;
      const aiEstimate =
        priceEstimate && isCleaning
          ? { low: priceEstimate.estimate_low, high: priceEstimate.estimate_high }
          : undefined;

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const locationLabel = locationNote.trim()
        ? `${zip5} · ${locationNote.trim()}`
        : zip5;

      const insertPayload: Record<string, unknown> = {
        customer_id: userId,
        title: title.trim(),
        description: description.trim() || null,
        service_category: serviceCategory,
        budget_min: budgetMin ? parseFloat(budgetMin) : null,
        budget_max: budgetMax ? parseFloat(budgetMax) : null,
        location: locationLabel,
        location_zip: zip5,
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
        <CustomerPageShell title="New Request" userName={userName}>
          <div className="mx-auto flex min-h-[40vh] max-w-2xl items-center justify-center px-4">
            <p className="text-sm text-text3">Loading…</p>
          </div>
        </CustomerPageShell>
      </AppLayout>
    );
  }

  return (
    <AppLayout mode="customer">
      <CustomerPageShell title="New Request" userName={userName}>
        <div className="mx-auto min-w-0 w-full max-w-2xl px-3 pb-10 pt-2 sm:px-4">
          <Link
            href="/customer/requests"
            className="inline-flex text-sm font-medium text-[hsl(var(--accent-customer))] hover:underline"
          >
            ← Back to requests
          </Link>

          <form onSubmit={handleSubmit} className="mt-4 space-y-5">
            {error && (
              <div className="rounded-2xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
                {error}
              </div>
            )}

            <div>
              <label className={labelClass} htmlFor="req-title">
                Title *
              </label>
              <input
                id="req-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Sink leaking"
                className={fieldClass}
                required
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="req-desc">
                Description
              </label>
              <textarea
                id="req-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you need..."
                rows={3}
                className={`${fieldClass} resize-none`}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="req-occupation">
                Occupation *
              </label>
              <select
                id="req-occupation"
                value={serviceCategory}
                onChange={(e) => setServiceCategory(e.target.value)}
                className={fieldClass}
                required
              >
                <option value="">Select occupation</option>
                {categories
                  .filter((c) => c.is_active_phase1 !== false)
                  .map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass} htmlFor="req-budget-min">
                  Budget min ($)
                </label>
                <input
                  id="req-budget-min"
                  type="number"
                  min="0"
                  step="1"
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(e.target.value)}
                  placeholder="80"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="req-budget-max">
                  Budget max ($)
                </label>
                <input
                  id="req-budget-max"
                  type="number"
                  min="0"
                  step="1"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                  placeholder="120"
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="req-zip">
                  ZIP code *
                </label>
                <input
                  id="req-zip"
                  type="text"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  maxLength={5}
                  value={locationZip}
                  onChange={(e) => setLocationZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  placeholder="e.g. 11212"
                  className={fieldClass}
                  required
                />
                <p className="mt-1 text-xs text-[#6B7280] dark:text-white/55">
                  Used so nearby pros can find your request.
                </p>
              </div>
              <div>
                <label className={labelClass} htmlFor="req-neighborhood">
                  Neighborhood (optional)
                </label>
                <input
                  id="req-neighborhood"
                  type="text"
                  value={locationNote}
                  onChange={(e) => setLocationNote(e.target.value)}
                  placeholder="e.g. East Flatbush"
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass} htmlFor="req-date">
                  Preferred date
                </label>
                <input
                  id="req-date"
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="req-time">
                  Preferred time
                </label>
                <input
                  id="req-time"
                  type="text"
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  placeholder="e.g. 2pm or Today"
                  className={fieldClass}
                />
              </div>
            </div>

            {isCleaning ? (
              <>
                <div className={sectionCardClass}>
                  <h3 className="mb-4 text-sm font-semibold text-[#2d3436] dark:text-white">
                    Job details (required)
                  </h3>
                  <JobDetailsForm value={jobDetails} onChange={setJobDetails} errors={{}} />
                </div>
                {priceEstimate && <PriceEstimateCard estimate={priceEstimate} />}
                <div className={sectionCardClass}>
                  <PhotoUploadGrid
                    photos={photosCategorized}
                    onChange={setPhotosCategorized}
                    onUpload={uploadPhoto}
                    minRequired={REQUIRED_PHOTO_MIN}
                    errors={
                      photosCategorized.length < REQUIRED_PHOTO_MIN &&
                      photosCategorized.length > 0
                        ? [`Add ${REQUIRED_PHOTO_MIN - photosCategorized.length} more photo(s)`]
                        : []
                    }
                  />
                </div>
              </>
            ) : (
              <div>
                <label className={labelClass} htmlFor="req-photos">
                  Photos (min {REQUIRED_PHOTO_MIN} required)
                </label>
                <p className="mb-2 text-xs text-[#6B7280] dark:text-white/55">
                  Add photos one at a time or several at once — each tap on &quot;Choose files&quot; adds to your list (up
                  to {MAX_REQUEST_PHOTOS}).
                </p>
                <input
                  id="req-photos"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleNonCleaningPhotosChange}
                  disabled={photoFiles.length >= MAX_REQUEST_PHOTOS}
                  className={`${fieldClass} text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-[#FFB347] file:px-4 file:py-2 file:text-sm file:font-bold file:text-[#2d3436] disabled:opacity-60`}
                />
                {photoFiles.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {photoFiles.map((f, i) => (
                      <li
                        key={`${fileFingerprint(f)}-${i}`}
                        className="flex items-center justify-between gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-xs text-[#2d3436] dark:border-white/12 dark:bg-[#14161c] dark:text-white/80"
                      >
                        <span className="min-w-0 truncate" title={f.name}>
                          {f.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => removePhotoFileAt(i)}
                          className="shrink-0 font-medium text-red-600 hover:underline dark:text-red-400"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {photoFiles.length > 0 && (
                  <p className="mt-1 text-xs text-[#6B7280] dark:text-white/55">
                    {photoFiles.length} photo{photoFiles.length === 1 ? '' : 's'} selected
                    {photoFiles.length < REQUIRED_PHOTO_MIN &&
                      ` — add ${REQUIRED_PHOTO_MIN - photoFiles.length} more`}
                  </p>
                )}
              </div>
            )}

            <button type="submit" disabled={submitting} className={primaryCtaClass}>
              {submitting ? 'Posting…' : 'Post request'}
            </button>
          </form>
        </div>
      </CustomerPageShell>
    </AppLayout>
  );
}
