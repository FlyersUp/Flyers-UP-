/**
 * Shared copy for messaging block enforcement (API + client RLS error hint).
 * Keep in sync with `blockEnforcement` 403 responses (`error` text + `code: messaging_blocked`).
 */
export const MESSAGING_BLOCKED_USER_MESSAGE =
  "Messaging isn't available with this person right now.";

/** Supabase/PostgREST typically surfaces RLS failures with this substring. */
export function isLikelyMessagingBlockedSupabaseError(
  error: { message?: string; code?: string } | null | undefined
): boolean {
  const m = error?.message?.toLowerCase() ?? '';
  return m.includes('row-level security') || m.includes('violates row-level security');
}
