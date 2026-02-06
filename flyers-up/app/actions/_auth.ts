'use server';

import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

function getSupabaseUrl(): string {
  return (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
}

function getAnonKey(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
}

function createAuthedClient(accessToken: string) {
  const url = getSupabaseUrl();
  const anon = getAnonKey();
  if (!url || !anon) throw new Error('Supabase env not configured');

  return createClient(url, anon, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

export async function requireUser(opts?: { accessToken?: string }): Promise<{ userId: string }> {
  // Prefer access token when provided (works even when server cookies aren't present).
  if (opts?.accessToken) {
    const authed = createAuthedClient(opts.accessToken);
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
    const authed = createAuthedClient(opts.accessToken);
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
    const authed = createAuthedClient(opts.accessToken);
    const { data: profile } = await authed.from('profiles').select('role').eq('id', userId).maybeSingle();
    if (!profile || profile.role !== 'customer') throw new Error('Unauthorized');
    return { userId };
  }

  const supabase = await createServerSupabaseClient();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
  if (!profile || profile.role !== 'customer') throw new Error('Unauthorized');
  return { userId };
}

