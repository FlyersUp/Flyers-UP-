/**
 * Onboarding helpers (client-safe).
 *
 * Goals:
 * - Speed-to-value: create minimal profile quickly
 * - Resume incomplete onboarding via `profiles.onboarding_step`
 * - Route users to the correct dashboard based on `profiles.role`
 *
 * Compliance/privacy guardrails:
 * - Do not collect or infer immigration status
 * - Keep onboarding minimal and role-based
 */

import { supabase } from '@/lib/supabaseClient';

export type AppRole = 'customer' | 'pro';

export type OnboardingStep =
  | null
  | 'role'
  | 'customer_profile'
  | 'pro_profile';

export interface ProfileRow {
  id: string;
  email: string | null;
  role: AppRole | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  phone: string | null;
  zip_code: string | null;
  onboarding_step: string | null;
}

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, role, first_name, last_name, phone, zip_code, onboarding_step')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    // Useful in diagnosing auth/RLS/schema issues during onboarding.
    console.error('getProfile error:', error);
    return null;
  }
  return (data as ProfileRow) || null;
}

export async function getOrCreateProfile(userId: string, email: string | null): Promise<ProfileRow | null> {
  const existing = await getProfile(userId);
  if (existing) return existing;

  // Insert minimal row. role intentionally NULL to force role selection.
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      email: email,
      role: null,
      onboarding_step: 'role',
    })
    .select('id, email, role, first_name, last_name, phone, zip_code, onboarding_step')
    .single();

  if (error) {
    console.error('getOrCreateProfile insert error:', error);
    return null;
  }
  return data as ProfileRow;
}

export async function upsertProfile(input: Partial<ProfileRow> & { id: string }): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('profiles').upsert(input, { onConflict: 'id' });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function upsertServicePro(input: {
  user_id: string;
  display_name: string;
  category_id: string;
  secondary_category_id?: string | null;
  service_area_zip: string;
}): Promise<{ success: boolean; error?: string }> {
  // service_pros has UNIQUE(user_id)
  const { error } = await supabase.from('service_pros').upsert(
    {
      user_id: input.user_id,
      display_name: input.display_name,
      category_id: input.category_id,
      secondary_category_id: input.secondary_category_id ?? null,
      service_area_zip: input.service_area_zip,
      // keep existing defaults for the rest
    },
    { onConflict: 'user_id' }
  );

  if (error) return { success: false, error: error.message };
  return { success: true };
}

function isSafeNext(next: string | null): string | null {
  if (!next) return null;
  if (!next.startsWith('/')) return null;
  // avoid open redirects and auth loops
  if (next.startsWith('/auth')) return null;
  return next;
}

export function routeAfterAuth(profile: ProfileRow, next?: string | null): string {
  const safeNext = isSafeNext(next ?? null);
  // Prevent cross-role redirect loops (e.g. customer being sent to /pro).
  const roleSafeNext =
    profile.role === 'customer'
      ? safeNext && (safeNext.startsWith('/pro') || safeNext.startsWith('/dashboard/pro')) ? null : safeNext
      : profile.role === 'pro'
        ? safeNext && (safeNext.startsWith('/customer') || safeNext.startsWith('/dashboard/customer')) ? null : safeNext
        : safeNext;

  // If onboarding_step is set, route there (resume).
  if (profile.onboarding_step === 'role' || profile.role == null) {
    return safeNext ? `/onboarding/role?next=${encodeURIComponent(safeNext)}` : '/onboarding/role';
  }

  const firstNameMissing = !profile.first_name || profile.first_name.trim().length === 0;
  const lastNameMissing = !profile.last_name || profile.last_name.trim().length === 0;
  const zipMissing = !profile.zip_code || profile.zip_code.trim().length === 0;

  if (profile.role === 'customer') {
    // Send new customers to request flow first; collect name there before booking.
    if (profile.onboarding_step === 'customer_profile' || firstNameMissing || lastNameMissing) {
      return roleSafeNext ? `/customer/request/start?next=${encodeURIComponent(roleSafeNext)}` : '/customer/request/start';
    }
    return roleSafeNext ?? '/customer';
  }

  if (profile.role === 'pro') {
    // Pro requires first_name + last_name + later service_pros fields (collected on /onboarding/pro)
    if (profile.onboarding_step === 'pro_profile' || firstNameMissing || lastNameMissing || zipMissing) {
      return roleSafeNext ? `/onboarding/pro?next=${encodeURIComponent(roleSafeNext)}` : '/onboarding/pro';
    }
    return roleSafeNext ?? '/pro';
  }

  // Fallback
  return '/onboarding/role';
}


