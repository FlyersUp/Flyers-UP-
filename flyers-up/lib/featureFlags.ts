/**
 * Feature flag helpers.
 *
 * Guardrails:
 * - Flags are used for rollout control and safety.
 * - Flags MUST NOT be used to infer or request immigration/citizenship status.
 */

import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { FEATURE_LAUNCH_MODE_KEY } from '@/lib/launchModeEnv';

export const ITIN_FEATURE_FLAG_KEY = 'FEATURE_ITIN_ONBOARDING' as const;

export { FEATURE_LAUNCH_MODE_KEY };

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

async function dbLaunchModeExplicitlyDisabled(): Promise<boolean> {
  try {
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from('feature_flags')
      .select('enabled')
      .eq('key', FEATURE_LAUNCH_MODE_KEY)
      .maybeSingle();
    if (error || !data) return false;
    return data.enabled === false;
  } catch {
    return false;
  }
}

function envLaunchModeExplicitlyOff(): boolean {
  const v = String(process.env.FEATURE_LAUNCH_MODE ?? '').toLowerCase().trim();
  return v === 'false' || v === '0' || v === 'no' || v === 'off';
}

/**
 * Launch simplification mode (default ON).
 *
 * - If `FEATURE_LAUNCH_MODE` is set in the environment to a falsey token → off.
 * - If env is **unset**: on by default, unless `feature_flags` has a row for
 *   {@link FEATURE_LAUNCH_MODE_KEY} with `enabled = false`.
 * - If env is set to any other non-off value → on (DB cannot disable).
 */
export async function isLaunchModeEnabled(): Promise<boolean> {
  const raw = process.env.FEATURE_LAUNCH_MODE;
  if (raw !== undefined && String(raw).trim() !== '') {
    return !envLaunchModeExplicitlyOff();
  }
  if (await dbLaunchModeExplicitlyDisabled()) return false;
  return true;
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


