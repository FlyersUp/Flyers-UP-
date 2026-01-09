'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Logo from '@/components/Logo';
import { supabase } from '@/lib/supabaseClient';
import { getServiceCategories, type ServiceCategory } from '@/lib/api';
import { getOrCreateProfile, routeAfterAuth, upsertProfile, upsertServicePro } from '@/lib/onboarding';

function ProInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next');

  const safeNext = useMemo(() => (nextParam && nextParam.startsWith('/') ? nextParam : null), [nextParam]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [firstName, setFirstName] = useState('');
  const [primaryCategoryId, setPrimaryCategoryId] = useState('');
  const [secondaryCategoryId, setSecondaryCategoryId] = useState<string>('');
  const [serviceAreaZip, setServiceAreaZip] = useState('');

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace(safeNext ? `/auth?next=${encodeURIComponent(safeNext)}` : '/auth');
          return;
        }

        const [profile, cats] = await Promise.all([
          getOrCreateProfile(user.id, user.email ?? null),
          getServiceCategories({ includeHidden: false }),
        ]);

        if (!profile) {
          setError('Could not load your profile. Please try again.');
          return;
        }

        if (profile.role !== 'pro') {
          router.replace(routeAfterAuth(profile, safeNext));
          return;
        }

        setCategories(cats);
        setFirstName(profile.first_name || '');
        setServiceAreaZip(profile.zip_code || '');
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, [router, safeNext]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth');
        return;
      }

      if (!firstName.trim()) {
        setError('Please enter your first name.');
        return;
      }
      if (!primaryCategoryId) {
        setError('Please select a primary category.');
        return;
      }
      if (!serviceAreaZip.trim()) {
        setError('Please enter a service area zip.');
        return;
      }

      const profileRes = await upsertProfile({
        id: user.id,
        role: 'pro',
        first_name: firstName.trim(),
        zip_code: serviceAreaZip.trim(),
        onboarding_step: null,
        email: user.email ?? null,
      });
      if (!profileRes.success) {
        setError(profileRes.error || 'Could not save your info. Please try again.');
        return;
      }

      const proRes = await upsertServicePro({
        user_id: user.id,
        display_name: firstName.trim(),
        category_id: primaryCategoryId,
        secondary_category_id: secondaryCategoryId || null,
        service_area_zip: serviceAreaZip.trim(),
      });
      if (!proRes.success) {
        setError(proRes.error || 'Could not save your pro profile. Please try again.');
        return;
      }

      router.replace(safeNext ?? '/pro');
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fbfbf7] flex items-center justify-center">
        <div className="text-sm text-gray-600">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfbf7]">
      <header className="px-4 py-5">
        <div className="max-w-md mx-auto">
          <Logo size="md" linkToHome />
        </div>
      </header>

      <main className="px-4 pb-10">
        <div className="max-w-md mx-auto">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
            <h1 className="text-2xl font-semibold tracking-tight">Set up your pro profile</h1>
            <p className="text-gray-600 mt-2">You can add verification and payouts later. This takes under 60 seconds.</p>

            {error && (
              <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="firstName">
                  First name
                </label>
                <input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                  placeholder="Sam"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="primaryCategory">
                  Primary category
                </label>
                <select
                  id="primaryCategory"
                  value={primaryCategoryId}
                  onChange={(e) => setPrimaryCategoryId(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                >
                  <option value="">Select…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="secondaryCategory">
                  Secondary category (optional)
                </label>
                <select
                  id="secondaryCategory"
                  value={secondaryCategoryId}
                  onChange={(e) => setSecondaryCategoryId(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                >
                  <option value="">None</option>
                  {categories
                    .filter((c) => c.id !== primaryCategoryId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="zip">
                  Service area zip
                </label>
                <input
                  id="zip"
                  value={serviceAreaZip}
                  onChange={(e) => setServiceAreaZip(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                  placeholder="10001"
                  inputMode="numeric"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-emerald-700 text-white px-4 py-3.5 text-base font-medium hover:bg-emerald-800 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Continue'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ProOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fbfbf7] flex items-center justify-center">
          <div className="text-sm text-gray-600">Loading…</div>
        </div>
      }
    >
      <ProInner />
    </Suspense>
  );
}


