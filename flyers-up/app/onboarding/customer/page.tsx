'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Logo from '@/components/Logo';
import { supabase } from '@/lib/supabaseClient';
import { getOrCreateProfile, routeAfterAuth, upsertProfile } from '@/lib/onboarding';

function CustomerInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next');

  const safeNext = useMemo(() => (nextParam && nextParam.startsWith('/') ? nextParam : null), [nextParam]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [zip, setZip] = useState('');
  const [phone, setPhone] = useState('');

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

        const profile = await getOrCreateProfile(user.id, user.email ?? null);
        if (!profile) {
          setError('Could not load your profile. Please try again.');
          return;
        }

        if (profile.role !== 'customer') {
          router.replace(routeAfterAuth(profile, safeNext));
          return;
        }

        setFirstName(profile.first_name || '');
        setZip(profile.zip_code || '');
        setPhone(profile.phone || '');
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

      const res = await upsertProfile({
        id: user.id,
        role: 'customer',
        first_name: firstName.trim(),
        zip_code: zip.trim() || null,
        phone: phone.trim() || null,
        onboarding_step: null,
        email: user.email ?? null,
      });

      if (!res.success) {
        setError(res.error || 'Could not save your info. Please try again.');
        return;
      }

      router.replace(safeNext ?? '/customer');
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
            <h1 className="text-2xl font-semibold tracking-tight">A quick hello</h1>
            <p className="text-gray-600 mt-2">You can add details later.</p>

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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="zip">
                    Zip (optional)
                  </label>
                  <input
                    id="zip"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                    placeholder="10001"
                    inputMode="numeric"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="phone">
                    Phone (optional)
                  </label>
                  <input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                    placeholder="(917) 555-1234"
                    inputMode="tel"
                  />
                </div>
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

export default function CustomerOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fbfbf7] flex items-center justify-center">
          <div className="text-sm text-gray-600">Loading…</div>
        </div>
      }
    >
      <CustomerInner />
    </Suspense>
  );
}


