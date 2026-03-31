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
import { routeAfterAuthFromProfile } from '@/lib/authRouting';

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
  account_status?: string | null;
}

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, role, first_name, last_name, phone, zip_code, onboarding_step, account_status')
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
    .select('id, email, role, first_name, last_name, phone, zip_code, onboarding_step, account_status')
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
  occupation_id?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  // service_pros has UNIQUE(user_id)
  const { error } = await supabase.from('service_pros').upsert(
    {
      user_id: input.user_id,
      display_name: input.display_name,
      category_id: input.category_id,
      secondary_category_id: input.secondary_category_id ?? null,
      service_area_zip: input.service_area_zip,
      occupation_id: input.occupation_id ?? null,
    },
    { onConflict: 'user_id' }
  );

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export function routeAfterAuth(profile: ProfileRow, next?: string | null): string {
  return routeAfterAuthFromProfile(profile, next);
}


