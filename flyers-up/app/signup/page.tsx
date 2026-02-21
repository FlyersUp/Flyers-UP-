import { Suspense } from 'react';
import { SignUpClient } from './SignUpClient';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

type SearchParams = Record<string, string | string[] | undefined>;

function pickFirst(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function SignUpPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const roleRaw = pickFirst(sp.role);
  const initialRole = roleRaw === 'pro' ? 'pro' : 'customer';

  // Server-side redirect to prevent auth-page flicker for already-authed users.
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const role = (profile?.role as 'customer' | 'pro' | null) ?? ((user.user_metadata?.role as any) ?? null);
      redirect(role === 'pro' ? '/pro' : '/customer');
    }
  } catch {
    // ignore: if SSR auth isn't available, fall back to client behavior
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-bg flex items-center justify-center text-muted">Loading…</div>}>
      <SignUpClient initialRole={initialRole} />
    </Suspense>
  );
}
