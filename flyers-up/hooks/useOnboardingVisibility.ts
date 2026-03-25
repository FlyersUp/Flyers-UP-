'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppSession } from '@/contexts/AppSessionContext';
import { useGuidancePreferences } from '@/hooks/useGuidancePreferences';
import {
  type OnboardingUiResolution,
  getProfileOnboardingPhase,
  isProductGuideCompleteInDb,
  isProductGuideSkippedForeverInDb,
  shouldAutoShowProductGuide,
  shouldShowIncompletePlatformEntry,
  hrefForIncompletePlatformOnboarding,
} from '@/lib/onboarding/onboardingState';
import {
  isSessionGuideDismissed,
  setSessionGuideDismissed,
  clearSessionGuideDismissed,
} from '@/lib/onboarding/sessionGuideDismissal';

/**
 * Single hook for product tour + platform onboarding UI flags.
 * Use inside AppSessionProvider (authenticated app shell).
 */
export function useOnboardingVisibility() {
  const pathname = usePathname();
  const { user, resolved: sessionResolved } = useAppSession();
  const userId = user?.id ?? null;
  const roleRaw = user?.role ?? null;
  const onboardingStep = user?.onboardingStep ?? null;
  const {
    prefs,
    loading: prefsLoading,
    completeOnboarding,
  } = useGuidancePreferences(userId);

  const [sessionDismissed, setSessionDismissedState] = useState(false);

  useEffect(() => {
    if (!userId) {
      setSessionDismissedState(false);
      return;
    }
    setSessionDismissedState(isSessionGuideDismissed(userId));
  }, [userId]);

  const loading = !sessionResolved || (Boolean(userId) && prefsLoading);

  const resolution: OnboardingUiResolution = useMemo(() => {
    const role =
      roleRaw === 'customer' || roleRaw === 'pro' ? roleRaw : null;
    const profilePhase = !userId
      ? 'complete'
      : getProfileOnboardingPhase(roleRaw, onboardingStep);
    return {
      loading,
      profilePhase,
      isProductGuideComplete: isProductGuideCompleteInDb(prefs),
      isProductGuideSkippedForever: isProductGuideSkippedForeverInDb(prefs),
      isSessionGuideDismissed: sessionDismissed,
      role,
    };
  }, [loading, userId, roleRaw, onboardingStep, prefs, sessionDismissed]);

  const dismissProductGuideForSession = useCallback(() => {
    if (!userId) return;
    setSessionGuideDismissed(userId);
    setSessionDismissedState(true);
  }, [userId]);

  const clearProductGuideSessionDismissal = useCallback(() => {
    if (!userId) return;
    clearSessionGuideDismissed(userId);
    setSessionDismissedState(false);
  }, [userId]);

  const autoShowProductGuide = shouldAutoShowProductGuide({ resolution, pathname });

  const showIncompletePlatformEntry = shouldShowIncompletePlatformEntry({ resolution });

  const incompletePlatformSetupHref = useMemo(() => {
    if (!userId) return null;
    const mode = roleRaw === 'pro' ? 'pro' : 'customer';
    const r = roleRaw === 'customer' || roleRaw === 'pro' ? roleRaw : null;
    return hrefForIncompletePlatformOnboarding(r, onboardingStep, mode);
  }, [userId, roleRaw, onboardingStep]);

  return {
    pathname,
    userId,
    prefs,
    prefsLoading,
    resolution,
    autoShowProductGuide,
    showIncompletePlatformEntry,
    dismissProductGuideForSession,
    clearProductGuideSessionDismissal,
    incompletePlatformSetupHref,
    completeOnboarding,
  };
}
