/**
 * Single source of truth for onboarding-related UI flags (pure functions).
 * Separates: platform profile onboarding vs product tour (guide) vs nav entry points.
 */

import type { UserGuidancePreferences } from '@/lib/guidance/types';

/** Auto-show product guide only on these paths (normalized, no query). */
export const PRODUCT_GUIDE_AUTO_SHOW_PATHS = new Set(['/customer', '/pro', '/occupations']);

export function normalizeAppPathname(pathname: string | null): string {
  if (!pathname) return '';
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1);
  return pathname;
}

export function isProductGuideAutoShowPath(pathname: string | null): boolean {
  return PRODUCT_GUIDE_AUTO_SHOW_PATHS.has(normalizeAppPathname(pathname));
}

export function isInPlatformOnboardingPath(pathname: string | null): boolean {
  return (pathname ?? '').includes('/onboarding');
}

/** Platform signup flow: role + profile steps in `profiles.onboarding_step`. */
export function isPlatformProfileOnboardingIncomplete(
  role: string | null | undefined,
  onboardingStep: string | null | undefined
): boolean {
  if (role == null || role === '') return true;
  if (onboardingStep == null || onboardingStep === '') return false;
  return true;
}

export type ProfileOnboardingPhase = 'incomplete' | 'complete';

export function getProfileOnboardingPhase(
  role: string | null | undefined,
  onboardingStep: string | null | undefined
): ProfileOnboardingPhase {
  return isPlatformProfileOnboardingIncomplete(role, onboardingStep) ? 'incomplete' : 'complete';
}

/** Product tour finished in DB (Get started on last step). */
export function isProductGuideCompleteInDb(prefs: UserGuidancePreferences | null): boolean {
  return Boolean(prefs?.onboardingCompletedAt);
}

/**
 * Legacy permanent skip in DB — do not auto-show again.
 * New "Skip for now" uses session storage only (see sessionGuideDismissal).
 */
export function isProductGuideSkippedForeverInDb(prefs: UserGuidancePreferences | null): boolean {
  return Boolean(prefs?.onboardingSkippedAt);
}

/** First-time / never finished tour in DB (not completed, not legacy skipped). */
export function isFirstTimeProductGuideInDb(prefs: UserGuidancePreferences | null): boolean {
  if (!prefs) return false;
  return !prefs.onboardingCompletedAt && !prefs.onboardingSkippedAt;
}

export function hrefForIncompletePlatformOnboarding(
  role: string | null | undefined,
  onboardingStep: string | null | undefined,
  mode: 'customer' | 'pro'
): string | null {
  if (!isPlatformProfileOnboardingIncomplete(role, onboardingStep)) return null;
  const next = mode === 'pro' ? '/pro' : '/customer';
  if (!role || onboardingStep === 'role' || role === null) {
    return `/onboarding/role?next=${encodeURIComponent(next)}`;
  }
  if (role === 'customer' && onboardingStep === 'customer_profile') {
    return `/onboarding/customer?next=${encodeURIComponent(next)}`;
  }
  if (role === 'pro' && onboardingStep === 'pro_profile') {
    return `/onboarding/pro?next=${encodeURIComponent(next)}`;
  }
  return `/onboarding/role?next=${encodeURIComponent(next)}`;
}

export type OnboardingUiResolution = {
  /** Session + prefs still loading (hide all onboarding chrome). */
  loading: boolean;
  profilePhase: ProfileOnboardingPhase;
  /** True when DB says user finished the modal tour. */
  isProductGuideComplete: boolean;
  /** Legacy DB skip — never auto-show. */
  isProductGuideSkippedForever: boolean;
  /** Session-only dismiss — no auto-show until next session. */
  isSessionGuideDismissed: boolean;
  role: 'customer' | 'pro' | null;
};

/**
 * Whether the Welcome modal may auto-open on allowlisted routes.
 */
export function shouldAutoShowProductGuide(args: {
  resolution: OnboardingUiResolution;
  pathname: string | null;
}): boolean {
  const { resolution, pathname } = args;
  if (resolution.loading) return false;
  if (resolution.profilePhase !== 'complete') return false;
  if (resolution.isProductGuideComplete) return false;
  if (resolution.isProductGuideSkippedForever) return false;
  if (resolution.isSessionGuideDismissed) return false;
  if (isInPlatformOnboardingPath(pathname)) return false;
  return isProductGuideAutoShowPath(pathname);
}

/** Nav / banners: "continue profile setup" (platform flow, not the product tour). */
export function shouldShowIncompletePlatformEntry(args: {
  resolution: OnboardingUiResolution;
}): boolean {
  const { resolution } = args;
  if (resolution.loading) return false;
  return resolution.profilePhase === 'incomplete';
}

/**
 * Help / settings: replay walkthrough is appropriate (tour was finished or skipped forever).
 */
export function shouldOfferReplayGuideAction(args: {
  resolution: OnboardingUiResolution;
}): boolean {
  const { resolution } = args;
  if (resolution.loading) return false;
  return resolution.isProductGuideComplete || resolution.isProductGuideSkippedForever;
}
