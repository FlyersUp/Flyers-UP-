/**
 * Guidance system types: onboarding and contextual hints.
 */

export const CURRENT_ONBOARDING_VERSION = 1;

export type UserGuidancePreferences = {
  onboardingCompletedAt: string | null;
  onboardingSkippedAt: string | null;
  onboardingVersion: number;
  dismissedHintKeys: string[];
};
