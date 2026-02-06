/**
 * Supabase Browser Client
 * 
 * This client is SAFE TO USE IN THE BROWSER.
 * It uses the anon key which has Row Level Security (RLS) applied.
 * 
 * Use this for:
 * - Client components ('use client')
 * - Auth operations (signIn, signUp, signOut)
 * - Data fetching with RLS policies applied
 * 
 * DO NOT use this for:
 * - Server-side admin operations
 * - Bypassing RLS policies
 * 
 * NOTE: Once your Supabase database is set up, you can regenerate types with:
 * npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
 * Then uncomment the generic type parameter below.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
// Uncomment when you have generated types from your actual Supabase schema:
// import type { Database } from '@/types/database';

// Singleton instance
let supabaseInstance: SupabaseClient | null = null;

/**
 * Create a Supabase client for browser-side operations.
 * This client respects RLS policies.
 * 
 * Throws an error if environment variables are not set (at runtime, not build time).
 */
export function createSupabaseClient(): SupabaseClient {
  // Get environment variables (may be undefined during build)
  const supabaseUrl =
    // In the browser, route Supabase traffic through our own domain to bypass
    // regional blocks on *.supabase.co.
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/supabase`
      : process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const upstreamUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  // Check for env vars at runtime
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
    );
  }

  // When proxying, Supabase can't infer the project ref from our domain.
  // Set `storageKey` explicitly so sessions/PKCE code verifiers remain stable.
  // (This is critical for OTP/magic-link + OAuth flows.)
  const projectRefMatch = upstreamUrl?.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co/i);
  const projectRef = projectRefMatch?.[1] ?? null;
  // Fallback to a stable key even if NEXT_PUBLIC_SUPABASE_URL is missing/misconfigured.
  // This prevents session storage from varying based on the proxy URL.
  const storageKey = projectRef ? `sb-${projectRef}-auth-token` : 'sb-flyersup-auth-token';

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storageKey,
    },
  });
}

function getBrowserSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient();
  }
  return supabaseInstance;
}

/**
 * Get the Supabase client singleton.
 * Creates a new instance if one doesn't exist.
 * 
 * NOTE: We intentionally avoid creating the client at import-time.
 * In production, missing env vars would otherwise crash the whole page (client-side exception)
 * before our API functions can handle the error gracefully.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (typeof window === 'undefined') {
      throw new Error(
        'Cannot use browser Supabase client on the server. ' +
        'Use createServerSupabaseClient() from lib/supabaseServer.ts instead.'
      );
    }

    const client = getBrowserSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (client as any)[prop];
    if (typeof value === 'function') return value.bind(client);
    return value;
  },
});
