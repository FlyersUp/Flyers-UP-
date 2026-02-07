import 'server-only';

import { createClient } from '@supabase/supabase-js';

function getSupabaseUrl(): string {
  return (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
}

function getAnonKey(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
}

/**
 * Create a Supabase client authenticated via an access token.
 *
 * This is useful in Server Actions / Route Handlers when you have an access token
 * but you might not have (or want to rely on) cookie-based sessions.
 */
export function createAuthedSupabaseClient(accessToken: string) {
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

