/**
 * Pure auth/onboarding routing (safe for server components — no client Supabase).
 */

import { hrefForIncompletePlatformOnboarding } from '@/lib/onboarding/onboardingState';

export type AuthRoutingProfile = {
  role: 'customer' | 'pro' | 'admin' | null;
  first_name: string | null;
  last_name: string | null;
  zip_code: string | null;
  onboarding_step: string | null;
  account_status?: string | null;
  scheduled_deletion_at?: string | null;
};

function isSafeNext(next: string | null): string | null {
  if (!next) return null;
  if (!next.startsWith('/')) return null;
  if (next.startsWith('/auth')) return null;
  return next;
}

/** Same rules as client `routeAfterAuth` in onboarding.ts */
export function routeAfterAuthFromProfile(profile: AuthRoutingProfile, next?: string | null): string {
  if (profile.account_status === 'deleted') {
    return '/account/deleted';
  }
  if (profile.account_status === 'deactivated') {
    return '/account/deactivated';
  }

  const safeNext = isSafeNext(next ?? null);
  const roleSafeNext =
    profile.role === 'customer'
      ? safeNext && (safeNext.startsWith('/pro') || safeNext.startsWith('/dashboard/pro'))
        ? null
        : safeNext
      : profile.role === 'pro'
        ? safeNext && (safeNext.startsWith('/customer') || safeNext.startsWith('/dashboard/customer'))
          ? null
          : safeNext
        : safeNext;

  if (profile.onboarding_step === 'role' || profile.role == null) {
    return safeNext ? `/onboarding/role?next=${encodeURIComponent(safeNext)}` : '/onboarding/role';
  }

  const firstNameMissing = !profile.first_name || profile.first_name.trim().length === 0;
  const lastNameMissing = !profile.last_name || profile.last_name.trim().length === 0;
  const zipMissing = !profile.zip_code || profile.zip_code.trim().length === 0;

  if (profile.role === 'customer') {
    const resume = hrefForIncompletePlatformOnboarding(profile.role, profile.onboarding_step, 'customer');
    if (resume) return resume;
    return roleSafeNext ?? '/customer';
  }

  if (profile.role === 'pro') {
    const resume = hrefForIncompletePlatformOnboarding(profile.role, profile.onboarding_step, 'pro');
    if (resume) return resume;
    if (profile.onboarding_step === 'pro_profile' || firstNameMissing || lastNameMissing || zipMissing) {
      return roleSafeNext ? `/onboarding/pro?next=${encodeURIComponent(roleSafeNext)}` : '/onboarding/pro';
    }
    return roleSafeNext ?? '/pro';
  }

  return '/onboarding/role';
}
