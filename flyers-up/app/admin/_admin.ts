import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import type { User } from '@supabase/supabase-js';

/** Canonical admin contact: Hello.flyersup@gmail.com (also in privacy/terms). */
function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? '';
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  const adminEmails = getAdminEmails();
  const e = (email ?? '').trim().toLowerCase();
  return adminEmails.length > 0 && Boolean(e) && adminEmails.includes(e);
}

export async function requireAdminUser(nextPath: string): Promise<User> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/signin?next=${encodeURIComponent(nextPath)}`);
  }

  if (!isAdminEmail(user.email)) {
    // Redirect to admin home; admin pages should render access denied there too.
    redirect('/admin?denied=1');
  }

  return user;
}

