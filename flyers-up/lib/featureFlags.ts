/**
 * Feature flag helpers.
 *
 * Guardrails:
 * - Flags are used for rollout control and safety.
 * - Flags MUST NOT be used to infer or request immigration/citizenship status.
 */

import { createAdminSupabaseClient } from '@/lib/supabaseServer';

export const ITIN_FEATURE_FLAG_KEY = 'FEATURE_ITIN_ONBOARDING' as const;

export function envFlagEnabled(flagName: string): boolean {
  // Server-side env flag. For client-side gating, call the API route.
  return String(process.env[flagName] || '').toLowerCase() === 'true';
}

export async function dbFlagEnabled(flagKey: string): Promise<boolean> {
  try {
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from('feature_flags')
      .select('enabled')
      .eq('key', flagKey)
      .maybeSingle();

    if (error) return false;
    return Boolean(data?.enabled);
  } catch {
    // If Supabase isn't configured or table doesn't exist yet, fail closed.
    return false;
  }
}

/**
 * Combined gate: env + DB must both be enabled.
 *
 * This allows:
 * - Env to gate by environment (prod vs staging)
 * - DB to gate by rollout cohort / operational toggle
 */
export async function isFeatureEnabled(flagKey: string): Promise<boolean> {
  // Env is authoritative “master switch”
  if (!envFlagEnabled(flagKey)) return false;
  return dbFlagEnabled(flagKey);
}


