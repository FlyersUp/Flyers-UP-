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

export async function requireAdminUser(nextPath: string): Promise<User> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth?next=${encodeURIComponent(nextPath)}`);
  }

  if (!isAdminEmail(user.email)) {
    // Redirect to admin home; admin pages should render access denied there too.
    redirect('/admin?denied=1');
  }

  return user;
}

