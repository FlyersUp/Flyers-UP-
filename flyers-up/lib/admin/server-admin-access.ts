/**
 * Server-only admin access: must match app/(app)/admin/_admin.ts behavior so
 * pages (requireAdminUser) and API routes authorize the same users.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? '';
  return raw
    .split(/[,\n]/g)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Canonical admin account that always has access (no env or DB required). */
const CANONICAL_ADMIN_EMAIL = 'hello.flyersup@gmail.com';

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (normalized === CANONICAL_ADMIN_EMAIL) return true;
  const admins = getAdminEmails();
  return admins.includes(normalized);
}

/**
 * True if the user is an admin: listed in ADMIN_EMAILS / canonical email OR profiles.role === 'admin'.
 */
export async function isAdminUser(supabase: SupabaseClient, user: User | null): Promise<boolean> {
  if (!user) return false;
  if (isAdminEmail(user.email)) return true;
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  return profile?.role === 'admin';
}
