'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Logo from '@/components/Logo';
import { supabase } from '@/lib/supabaseClient';
import { getOrCreateProfile, routeAfterAuth, upsertProfile, type AppRole } from '@/lib/onboarding';

function RoleInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next');

  const [selected, setSelected] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const safeNext = useMemo(() => (nextParam && nextParam.startsWith('/') ? nextParam : null), [nextParam]);

  useEffect(() => {
    const init = async () => {
      setError(null);
      setLoading(true);
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
        if (profile.role) {
          router.replace(routeAfterAuth(profile, safeNext));
          return;
        }
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, [router, safeNext]);

  async function handleContinue() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth');
        return;
      }

      const onboardingStep = selected === 'customer' ? 'customer_profile' : 'pro_profile';
      const res = await upsertProfile({
        id: user.id,
        role: selected,
        onboarding_step: onboardingStep,
        email: user.email ?? null,
      });
      if (!res.success) {
        setError(res.error || 'Could not save your choice. Please try again.');
        return;
      }

      const profile = await getOrCreateProfile(user.id, user.email ?? null);
      if (!profile) {
        setError('Could not load your profile. Please try again.');
        return;
      }
      router.replace(routeAfterAuth({ ...profile, role: selected, onboarding_step: onboardingStep }, safeNext));
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
            <h1 className="text-2xl font-semibold tracking-tight">How will you use Flyers Up?</h1>
            <p className="text-gray-600 mt-2">Pick one — you can switch later.</p>

            {error && (
              <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => setSelected('customer')}
                className={`w-full text-left rounded-2xl border px-4 py-4 transition-colors ${
                  selected === 'customer'
                    ? 'border-emerald-600 bg-emerald-50'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl leading-none">🧹</div>
                  <div>
                    <div className="font-semibold text-gray-900">I’m looking for services</div>
                    <div className="text-sm text-gray-600 mt-0.5">Book local pros, message, and manage jobs.</div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelected('pro')}
                className={`w-full text-left rounded-2xl border px-4 py-4 transition-colors ${
                  selected === 'pro'
                    ? 'border-emerald-600 bg-emerald-50'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl leading-none">🪜</div>
                  <div>
                    <div className="font-semibold text-gray-900">I offer services</div>
                    <div className="text-sm text-gray-600 mt-0.5">Create a simple profile and start taking bookings.</div>
                  </div>
                </div>
              </button>
            </div>

            <button
              type="button"
              disabled={!selected || saving}
              onClick={handleContinue}
              className="mt-6 w-full rounded-xl bg-emerald-700 text-white px-4 py-3.5 text-base font-medium hover:bg-emerald-800 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Continue'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function RolePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fbfbf7] flex items-center justify-center">
          <div className="text-sm text-gray-600">Loading…</div>
        </div>
      }
    >
      <RoleInner />
    </Suspense>
  );
}


