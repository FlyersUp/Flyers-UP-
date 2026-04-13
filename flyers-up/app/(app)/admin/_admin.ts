/**
 * Admin access helpers. SERVER-ONLY: do not import from "use client" components.
 * Env-based allowlist lives in lib/admin/server-admin-access.ts (keep out of client bundle).
 */
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import type { User } from '@supabase/supabase-js';
import { isAdminUser } from '@/lib/admin/server-admin-access';

export { getAdminEmails, isAdminEmail, isAdminUser } from '@/lib/admin/server-admin-access';

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
