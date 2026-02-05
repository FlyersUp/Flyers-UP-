import { SignInClient } from './SignInClient';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

type SearchParams = Record<string, string | string[] | undefined>;

function pickFirst(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function SignInPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const roleRaw = pickFirst(sp.role);
  const modeRaw = pickFirst(sp.mode);
  const nextRaw = pickFirst(sp.next);

  const initialRole = roleRaw === 'pro' ? 'pro' : 'customer';
  const initialMode = modeRaw === 'signup' ? 'signup' : null;

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
      const defaultDest = role === 'pro' ? '/pro' : '/customer';

      let nextDest: string | null = null;
      if (nextRaw && nextRaw.startsWith('/')) {
        try {
          nextDest = decodeURIComponent(nextRaw);
        } catch {
          nextDest = nextRaw;
        }
      }

      // Prevent role-mismatch bounce
      const dest =
        nextDest &&
        !((nextDest.startsWith('/pro') && role !== 'pro') || (nextDest.startsWith('/customer') && role !== 'customer'))
          ? nextDest
          : defaultDest;

      redirect(dest);
    }
  } catch {
    // ignore: if SSR auth isn't available, fall back to client behavior
  }

  return <SignInClient initialRole={initialRole} initialMode={initialMode} nextParam={nextRaw ?? null} />;
}
