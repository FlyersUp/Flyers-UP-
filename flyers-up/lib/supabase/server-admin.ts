/**
 * Supabase Admin client for server routes only.
 * Uses SUPABASE_SERVICE_ROLE_KEY. Bypasses RLS.
 * Never import in client components.
 */

import { createClient } from '@supabase/supabase-js';

export function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url?.trim()) throw new Error('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL is required.');
  if (!key?.trim()) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required.');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
