/**
 * Phone number utilities for auth (E.164 format).
 * Supabase requires E.164 for signInWithOtp({ phone }).
 */

/**
 * Normalize US/NA phone to E.164.
 * Accepts: (555) 123-4567, 555-123-4567, 5551234567, +15551234567
 * Returns: +15551234567 or null if invalid
 */
export function toE164(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  return null;
}

/**
 * Format for display: (555) 123-4567
 */
export function formatDisplay(e164: string): string {
  const digits = e164.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return e164;
}

export function isValidPhone(raw: string): boolean {
  return toE164(raw) !== null;
}
