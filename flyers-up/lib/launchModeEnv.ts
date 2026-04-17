/**
 * Launch mode env-only helpers (safe for client components).
 * Do not import server-only modules here — see {@link isLaunchModeEnabled} in `featureFlags.ts`.
 */

/** DB `feature_flags.key` and env `FEATURE_LAUNCH_MODE`. */
export const FEATURE_LAUNCH_MODE_KEY = 'FEATURE_LAUNCH_MODE' as const;

/**
 * Sync hint for client bundles: set `NEXT_PUBLIC_FEATURE_LAUNCH_MODE` to mirror
 * `FEATURE_LAUNCH_MODE`, or rely on default ON when both are unset.
 */
export function isLaunchModeEnabledSync(): boolean {
  const pub = process.env.NEXT_PUBLIC_FEATURE_LAUNCH_MODE;
  const server = process.env.FEATURE_LAUNCH_MODE;
  const v = String((pub !== undefined && pub !== '' ? pub : server) ?? '').toLowerCase().trim();
  if (v === '') return true;
  return !['false', '0', 'no', 'off'].includes(v);
}
