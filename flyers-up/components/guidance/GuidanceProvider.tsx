'use client';

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useOnboardingVisibility } from '@/hooks/useOnboardingVisibility';
import { OnboardingGuide } from './OnboardingGuide';
import {
  GuidanceContextProvider,
  type GuidanceContextValue,
} from '@/contexts/GuidanceContext';
import { clearSessionGuideDismissed } from '@/lib/onboarding/sessionGuideDismissal';
import { perfLoggingEnabled } from '@/lib/perfBoot';

interface GuidanceProviderProps {
  children: React.ReactNode;
}

/** Short delay after shell paint so layout settles; no interaction-cancel (newcomers still see the guide). */
const GUIDE_DEFER_MS = 700;

export function GuidanceProvider({ children }: GuidanceProviderProps) {
  const {
    userId,
    prefsLoading,
    resolution,
    autoShowProductGuide,
    showIncompletePlatformEntry,
    dismissProductGuideForSession,
    clearProductGuideSessionDismissal,
    incompletePlatformSetupHref,
    pathname,
    completeOnboarding,
  } = useOnboardingVisibility();

  const roleForGuide = resolution.role;

  const [deferDone, setDeferDone] = useState(false);
  const hasShownRef = useRef(false);

  useEffect(() => {
    hasShownRef.current = false;
  }, [userId]);

  const eligibleForDefer =
    autoShowProductGuide && !resolution.loading && !prefsLoading;

  useEffect(() => {
    if (!eligibleForDefer) {
      setDeferDone(false);
      return;
    }
    const t = window.setTimeout(() => setDeferDone(true), GUIDE_DEFER_MS);
    return () => {
      window.clearTimeout(t);
      setDeferDone(false);
    };
  }, [eligibleForDefer]);

  const showOnboarding =
    eligibleForDefer && deferDone && !hasShownRef.current;

  useEffect(() => {
    if (showOnboarding) hasShownRef.current = true;
  }, [showOnboarding]);

  useEffect(() => {
    if (!perfLoggingEnabled()) return;
    if (resolution.loading || prefsLoading) return;
    console.log(
      `[perf] onboarding resolved autoShow=${autoShowProductGuide} path=${pathname ?? ''} profile=${resolution.profilePhase}`
    );
  }, [
    resolution.loading,
    resolution.profilePhase,
    prefsLoading,
    autoShowProductGuide,
    pathname,
  ]);

  const slotRef = useRef<string | null>(null);
  const requestHintSlot = useCallback((hintKey: string) => {
    if (slotRef.current === null || slotRef.current === hintKey) {
      slotRef.current = hintKey;
      return true;
    }
    return false;
  }, []);
  const releaseHintSlot = useCallback(() => {
    slotRef.current = null;
  }, []);

  const suppressContextualHints =
    resolution.loading ||
    resolution.isProductGuideComplete ||
    resolution.isProductGuideSkippedForever ||
    resolution.isSessionGuideDismissed;

  const contextValue = useMemo((): GuidanceContextValue => {
    return {
      onboardingOpen: showOnboarding,
      suppressContextualHints,
      incompletePlatformSetupHref,
      showIncompletePlatformSetupInNav:
        showIncompletePlatformEntry && Boolean(incompletePlatformSetupHref),
      dismissProductGuideForSession,
      clearProductGuideSessionDismissal,
      requestHintSlot,
      releaseHintSlot,
    };
  }, [
    showOnboarding,
    suppressContextualHints,
    incompletePlatformSetupHref,
    showIncompletePlatformEntry,
    dismissProductGuideForSession,
    clearProductGuideSessionDismissal,
    requestHintSlot,
    releaseHintSlot,
  ]);

  async function handleComplete() {
    const res = await completeOnboarding();
    if (res.success && userId) clearSessionGuideDismissed(userId);
  }

  function handleSkipSession() {
    dismissProductGuideForSession();
  }

  return (
    <GuidanceContextProvider value={contextValue}>
      {children}
      {showOnboarding && (
        <OnboardingGuide
          open
          role={roleForGuide}
          onComplete={handleComplete}
          onSkip={handleSkipSession}
          isReplay={false}
        />
      )}
    </GuidanceContextProvider>
  );
}
