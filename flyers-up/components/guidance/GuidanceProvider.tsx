'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getCurrentUser } from '@/lib/api';
import { useGuidancePreferences } from '@/hooks/useGuidancePreferences';
import { OnboardingGuide } from './OnboardingGuide';

interface GuidanceProviderProps {
  children: React.ReactNode;
}

const DEFER_MS = 2500;

function isMainAppPage(path: string | null): boolean {
  if (!path) return false;
  if (path === '/customer' || path === '/customer/') return true;
  if (path === '/pro' || path === '/pro/') return true;
  if (path?.startsWith('/occupations')) return true;
  if (path === '/customer/bookings') return true;
  if (path === '/customer/messages') return true;
  if (path?.startsWith('/pro/jobs')) return true;
  if (path?.startsWith('/pro/today')) return true;
  if (path?.startsWith('/pro/messages')) return true;
  return false;
}

/**
 * Wraps app content and shows one-time onboarding when appropriate.
 * Defers 2.5s so app paints first; only shows on main landing pages.
 */
export function GuidanceProvider({ children }: GuidanceProviderProps) {
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<'customer' | 'pro' | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [deferDone, setDeferDone] = useState(false);

  const {
    shouldShowOnboarding,
    loading: prefsLoading,
    completeOnboarding,
    skipOnboarding,
  } = useGuidancePreferences(userId);

  const inPlatformOnboarding = pathname?.includes('/onboarding');
  const onMainPage = isMainAppPage(pathname);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const user = await getCurrentUser();
      if (!mounted) return;
      setUserId(user?.id ?? null);
      setRole((user?.role as 'customer' | 'pro') ?? null);
      setAuthReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!authReady || prefsLoading || !shouldShowOnboarding || inPlatformOnboarding || !onMainPage) {
      setDeferDone(false);
      return;
    }
    const t = setTimeout(() => setDeferDone(true), DEFER_MS);
    return () => clearTimeout(t);
  }, [authReady, prefsLoading, shouldShowOnboarding, inPlatformOnboarding, onMainPage]);

  const ready = authReady && !prefsLoading;
  const showOnboarding =
    ready && shouldShowOnboarding && !inPlatformOnboarding && onMainPage && deferDone;

  async function handleComplete() {
    await completeOnboarding();
  }

  async function handleSkip() {
    await skipOnboarding();
  }

  return (
    <>
      {children}
      {showOnboarding && (
        <OnboardingGuide
          open
          role={role}
          onComplete={handleComplete}
          onSkip={handleSkip}
          isReplay={false}
        />
      )}
    </>
  );
}
