'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getUserGuidancePreferences,
  markOnboardingCompleted,
  markOnboardingSkipped,
  dismissHint,
  resetDismissedHints,
} from '@/lib/guidance/preferences';
import type { UserGuidancePreferences } from '@/lib/guidance/types';
import { CURRENT_ONBOARDING_VERSION } from '@/lib/guidance/types';
import { perfLog, perfLoggingEnabled } from '@/lib/perfBoot';

export function useGuidancePreferences(userId: string | null) {
  const [prefs, setPrefs] = useState<UserGuidancePreferences | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setPrefs(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t0 = perfLoggingEnabled() && typeof performance !== 'undefined' ? performance.now() : 0;
    const p = await getUserGuidancePreferences(userId);
    if (perfLoggingEnabled() && typeof performance !== 'undefined') {
      perfLog('guidance prefs loaded', performance.now() - t0);
    }
    setPrefs(p);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const completeOnboarding = useCallback(async () => {
    if (!userId) return { success: false };
    const res = await markOnboardingCompleted(userId);
    if (res.success) {
      setPrefs((prev) =>
        prev
          ? {
              ...prev,
              onboardingCompletedAt: new Date().toISOString(),
              onboardingVersion: CURRENT_ONBOARDING_VERSION,
            }
          : null
      );
    }
    return res;
  }, [userId]);

  const skipOnboarding = useCallback(async () => {
    if (!userId) return { success: false };
    const res = await markOnboardingSkipped(userId);
    if (res.success) {
      setPrefs((prev) =>
        prev
          ? {
              ...prev,
              onboardingSkippedAt: new Date().toISOString(),
              onboardingVersion: CURRENT_ONBOARDING_VERSION,
            }
          : null
      );
    }
    return res;
  }, [userId]);

  const dismissHintKey = useCallback(
    async (hintKey: string) => {
      if (!userId) return { success: false };
      const res = await dismissHint(userId, hintKey);
      if (res.success) {
        setPrefs((prev) =>
          prev
            ? {
                ...prev,
                dismissedHintKeys: [...prev.dismissedHintKeys, hintKey],
              }
            : null
        );
      }
      return res;
    },
    [userId]
  );

  const resetHints = useCallback(async () => {
    if (!userId) return { success: false };
    const res = await resetDismissedHints(userId);
    if (res.success) {
      setPrefs((prev) =>
        prev ? { ...prev, dismissedHintKeys: [] } : null
      );
    }
    return res;
  }, [userId]);

  const shouldShowOnboarding =
    !loading &&
    Boolean(userId && prefs && !prefs.onboardingCompletedAt && !prefs.onboardingSkippedAt);

  return {
    prefs,
    loading,
    shouldShowOnboarding: Boolean(shouldShowOnboarding && userId),
    completeOnboarding,
    skipOnboarding,
    dismissHintKey,
    resetHints,
    refresh: load,
  };
}
