'use server';

import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAuthedSupabaseClient } from '@/lib/authedSupabaseServer';

export async function requireUser(opts?: { accessToken?: string }): Promise<{ userId: string }> {
  // Prefer access token when provided (works even when server cookies aren't present).
  if (opts?.accessToken) {
    const authed = createAuthedSupabaseClient(opts.accessToken);
    const {
      data: { user },
    } = await authed.auth.getUser();
    if (!user) throw new Error('Unauthorized');
    return { userId: user.id };
  }

  // Fallback to cookie-based server session (works when SSR auth cookies exist).
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  return { userId: user.id };
}

export async function requireProUser(opts?: { accessToken?: string }): Promise<{ userId: string }> {
  const { userId } = await requireUser(opts);

  if (opts?.accessToken) {
    const authed = createAuthedSupabaseClient(opts.accessToken);
    const { data: profile } = await authed.from('profiles').select('role').eq('id', userId).maybeSingle();
    if (!profile || profile.role !== 'pro') throw new Error('Unauthorized');
    return { userId };
  }

  const supabase = await createServerSupabaseClient();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
  if (!profile || profile.role !== 'pro') throw new Error('Unauthorized');
  return { userId };
}

export async function requireCustomerUser(opts?: { accessToken?: string }): Promise<{ userId: string }> {
  const { userId } = await requireUser(opts);

  if (opts?.accessToken) {
    const authed = createAuthedSupabaseClient(opts.accessToken);
    const { data: profile } = await authed.from('profiles').select('role').eq('id', userId).maybeSingle();
    if (!profile || profile.role !== 'customer') throw new Error('Unauthorized');
    return { userId };
  }

  const supabase = await createServerSupabaseClient();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
  if (!profile || profile.role !== 'customer') throw new Error('Unauthorized');
  return { userId };
}

