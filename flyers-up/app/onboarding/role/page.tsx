'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Logo from '@/components/Logo';
import { supabase } from '@/lib/supabaseClient';
import { getOrCreateProfile, routeAfterAuth, upsertProfile, type AppRole } from '@/lib/onboarding';

function isInvalidRefreshToken(err: unknown): boolean {
  const msg = (err as { message?: string } | null)?.message ?? '';
  return /invalid refresh token/i.test(msg) || /refresh token not found/i.test(msg);
}

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
      <div className="min-h-screen bg-gradient-to-b from-bg via-surface to-bg text-text flex items-center justify-center">
        <div className="text-sm text-muted">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-bg via-surface to-bg text-text">
      <header className="px-4 py-5">
        <div className="max-w-md mx-auto">
          <Logo size="md" linkToHome />
        </div>
      </header>

      <main className="px-4 pb-10">
        <div className="max-w-md mx-auto">
          <div className="rounded-2xl border border-border bg-surface shadow-sm p-6">
            <h1 className="text-2xl font-semibold tracking-tight">How will you use Flyers Up?</h1>
            <p className="text-muted mt-2">Pick one — you can switch later.</p>

            {error && (
              <div className="mt-4 rounded-xl border border-red-100 bg-danger/10 px-4 py-3 text-sm text-text">
                {error}
              </div>
            )}

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => setSelected('customer')}
                className={`w-full text-left rounded-2xl border px-4 py-4 transition-colors ${
                  selected === 'customer'
                    ? 'border-[hsl(var(--accent-customer))] bg-[hsl(var(--accent-customer)/0.12)]'
                    : 'border-border bg-surface hover:bg-surface2'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl leading-none text-[hsl(var(--accent-customer))]">🧹</div>
                  <div>
                    <div className="font-semibold text-text">I’m looking for services</div>
                    <div className="text-sm text-muted mt-0.5">Book local pros, message, and manage jobs.</div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelected('pro')}
                className={`w-full text-left rounded-2xl border px-4 py-4 transition-colors ${
                  selected === 'pro'
                    ? 'border-[hsl(var(--accent-pro))] bg-[hsl(var(--accent-pro)/0.10)]'
                    : 'border-border bg-surface hover:bg-surface2'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl leading-none text-[hsl(var(--accent-pro))]">🪜</div>
                  <div>
                    <div className="font-semibold text-text">I offer services</div>
                    <div className="text-sm text-muted mt-0.5">Create a simple profile and start taking bookings.</div>
                  </div>
                </div>
              </button>
            </div>

            <button
              type="button"
              disabled={!selected || saving}
              onClick={handleContinue}
              className={`mt-6 w-full rounded-xl px-4 py-3.5 text-base font-medium transition-colors disabled:opacity-50 ${
                selected === 'customer'
                  ? 'bg-[hsl(var(--accent-customer))] text-text hover:opacity-95'
                  : selected === 'pro'
                    ? 'bg-[hsl(var(--accent-pro))] text-text hover:opacity-95'
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


