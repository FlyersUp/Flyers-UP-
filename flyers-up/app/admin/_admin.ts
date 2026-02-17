/**
 * Admin access helpers. SERVER-ONLY: do not import from "use client" components.
 * process.env.ADMIN_EMAILS is read only here (and in admin page); keep it out of client bundle.
 */
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import type { User } from '@supabase/supabase-js';

export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? '';
  return raw
    .split(/[,\n]/g)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const admins = getAdminEmails();
  return admins.includes(email.trim().toLowerCase());
}

/**
 * Returns true if the user is an admin: listed in ADMIN_EMAILS OR profile.role === 'admin'.
 * Use this when you already have the user and can run a DB query (server-only).
 */
export async function isAdminUser(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  user: User | null
): Promise<boolean> {
  if (!user) return false;
  if (isAdminEmail(user.email)) return true;
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  return profile?.role === 'admin';
}

export async function requireAdminUser(nextPath: string): Promise<User> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth?next=${encodeURIComponent(nextPath)}`);
  }

  if (!(await isAdminUser(supabase, user))) {
    redirect('/auth?denied=1');
  }

  return user;
}

