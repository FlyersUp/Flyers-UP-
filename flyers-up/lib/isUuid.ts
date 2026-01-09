/**
 * UUID Validation Utility
 * Type guard to check if a value is a valid UUID (v1, v4, or v5).
 *
 * No DEV_UUID / mock fallbacks. If it's not a UUID, treat it as invalid.
 */

export function isUuid(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export function normalizeUuidOrNull(value: unknown): string | null {
  if (isUuid(value)) return value;
  return null;
}






