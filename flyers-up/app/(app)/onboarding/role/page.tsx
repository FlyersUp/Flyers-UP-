'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Logo from '@/components/Logo';
import { supabase } from '@/lib/supabaseClient';
import { getOrCreateProfile, routeAfterAuth, upsertProfile, type AppRole } from '@/lib/onboarding';
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress';

/** Role picker brand colors (customer = green, pro = orange) */
const ROLE_GREEN = '#bee3ba';
const ROLE_ORANGE = '#fbbb62';

function isInvalidRefreshToken(err: unknown): boolean {
  const msg = (err as { message?: string } | null)?.message ?? '';
  return /invalid refresh token/i.test(msg) || /refresh token not found/i.test(msg);
}

function RoleInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next');
  const switchParam = searchParams.get('switch');
  const switching = switchParam === '1' || switchParam === 'true';

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
        const { data: { user }, error: userErr } = await supabase.auth.getUser();
        if (userErr) {
          if (isInvalidRefreshToken(userErr)) {
            try {
              await supabase.auth.signOut();
            } catch {
              // ignore
            }
          }
          router.replace(
            safeNext
              ? `/auth?next=${encodeURIComponent(safeNext)}&error=${encodeURIComponent('Your session expired. Please sign in again.')}`
              : `/auth?error=${encodeURIComponent('Your session expired. Please sign in again.')}`
          );
          return;
        }
        if (!user) {
          router.replace(safeNext ? `/auth?next=${encodeURIComponent(safeNext)}` : '/auth');
          return;
        }
        const profile = await getOrCreateProfile(user.id, user.email ?? null);
        if (!profile) {
          setError('Could not load your profile. Please try again.');
          return;
        }
        if (profile.role && !switching) {
          router.replace(routeAfterAuth(profile, safeNext));
          return;
        }
        if (profile.role && switching) {
          setSelected(profile.role);
        }
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, [router, safeNext, switching]);

  async function handleContinue() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr) {
        if (isInvalidRefreshToken(userErr)) {
          try {
            await supabase.auth.signOut();
          } catch {
            // ignore
          }
        }
        router.replace('/auth');
        return;
      }
      if (!user) {
        router.replace('/auth');
        return;
      }

      // When switching to pro: skip onboarding if they already have a complete pro profile (data preserved)
      let onboardingStep: string | null;
      if (selected === 'customer') {
        onboardingStep = 'customer_profile';
      } else {
        const { data: proRow } = await supabase
          .from('service_pros')
          .select('display_name, category_id, service_area_zip')
          .eq('user_id', user.id)
          .maybeSingle();
        const hasProProfile =
          proRow?.display_name?.trim() &&
          proRow?.category_id &&
          proRow?.service_area_zip?.trim();
        onboardingStep = hasProProfile ? null : 'pro_profile';
      }

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
      router.replace(routeAfterAuth({ ...profile, role: selected, onboarding_step: onboardingStep ?? profile.onboarding_step }, safeNext));
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-bg via-surface to-bg text-text flex items-center justify-center">
        <div className="text-sm text-muted">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-bg via-surface to-bg text-text">
      <header className="px-4 py-5">
        <div className="max-w-lg mx-auto">
          <Logo size="md" linkToHome />
        </div>
      </header>

      <main className="px-4 pb-12">
        <div className="max-w-lg mx-auto">
          <OnboardingProgress
            currentStep={1}
            accentHex={selected === 'pro' ? ROLE_ORANGE : ROLE_GREEN}
          />
          <div className="rounded-2xl border border-border bg-surface shadow-sm p-6 sm:p-8">
            <h1 className="text-2xl font-semibold tracking-tight">How will you use Flyers Up?</h1>
            <p className="text-muted mt-2">
              {switching ? 'Switch roles any time.' : 'Pick one — you can switch later.'}
            </p>

            {error && (
              <div className="mt-4 rounded-xl border border-red-100 bg-danger/10 px-4 py-3 text-sm text-text">
                {error}
              </div>
            )}

            <div className="mt-8 space-y-4">
              <button
                type="button"
                onClick={() => setSelected('customer')}
                className={`w-full text-left rounded-2xl border-2 p-6 sm:p-8 transition-all duration-200 active:scale-[0.99] ${
                  selected === 'customer'
                    ? 'border-[#bee3ba] bg-[#bee3ba]/35 shadow-md ring-2 ring-[#bee3ba]/40'
                    : 'border-border bg-surface hover:border-[#bee3ba]/55 hover:bg-surface2 active:bg-surface2'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl leading-none shrink-0">🧹</div>
                  <div>
                    <div className="font-semibold text-lg text-text">I&apos;m looking for services</div>
                    <div className="text-muted mt-1">Book local pros, message, and manage jobs.</div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelected('pro')}
                className={`w-full text-left rounded-2xl border-2 p-6 sm:p-8 transition-all duration-200 active:scale-[0.99] ${
                  selected === 'pro'
                    ? 'border-[#fbbb62] bg-[#fbbb62]/35 shadow-md ring-2 ring-[#fbbb62]/45'
                    : 'border-border bg-surface hover:border-[#fbbb62]/60 hover:bg-surface2 active:bg-surface2'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl leading-none shrink-0">🪜</div>
                  <div className="min-w-0">
                    <div className="font-semibold text-lg text-text">I offer services</div>
                    <div className="text-muted mt-1">
                      Create a simple profile and start taking bookings.
                    </div>
                  </div>
                </div>
              </button>
            </div>

            <button
              type="button"
              disabled={!selected || saving}
              onClick={handleContinue}
              className={`mt-8 w-full rounded-xl px-4 py-4 text-base font-medium text-[#111111] hover:opacity-95 active:scale-[0.98] active:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 ${
                selected === 'pro'
                  ? 'bg-[#fbbb62]'
                  : selected === 'customer'
                    ? 'bg-[#bee3ba]'
                    : 'bg-surface2 text-muted'
              }`}
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
        <div className="min-h-screen bg-gradient-to-b from-bg via-surface to-bg flex items-center justify-center">
          <div className="text-sm text-muted">Loading…</div>
        </div>
      }
    >
      <RoleInner />
    </Suspense>
  );
}


