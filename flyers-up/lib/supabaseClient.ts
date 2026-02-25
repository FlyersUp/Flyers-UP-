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

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
// Uncomment when you have generated types from your actual Supabase schema:
// import type { Database } from '@/types/database';

// Singleton instance
let supabaseInstance: SupabaseClient | null = null;

function getUpstreamSupabaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
}

function getSupabaseAnonKey(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
}

function getAuthCookieName(): string {
  // When proxying through /api/supabase, Supabase can't infer the project ref.
  // Use the upstream project ref to keep the cookie storage key stable.
  const upstreamUrl = getUpstreamSupabaseUrl();
  const projectRefMatch = upstreamUrl.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co/i);
  const projectRef = projectRefMatch?.[1] ?? null;
  return projectRef ? `sb-${projectRef}-auth-token` : 'sb-flyersup-auth-token';
}

/**
 * Create a Supabase client for browser-side operations.
 * This client respects RLS policies.
 * 
 * Throws an error if environment variables are not set (at runtime, not build time).
 */
export function createSupabaseClient(): SupabaseClient {
  // In the browser: use direct Supabase URL by default to avoid 504s from the proxy
  // (Vercel→Supabase can time out). Set NEXT_PUBLIC_SUPABASE_USE_PROXY=true to use
  // the proxy instead, e.g. when *.supabase.co is blocked in the user's region.
  const useProxy =
    typeof window !== 'undefined' &&
    (process.env.NEXT_PUBLIC_SUPABASE_USE_PROXY ?? '').toLowerCase() === 'true';
  const supabaseUrl =
    typeof window !== 'undefined' && useProxy
      ? `${window.location.origin}/api/supabase`
      : getUpstreamSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();

  // Check for env vars at runtime
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
    );
  }

  // Use @supabase/ssr's browser client so auth is stored in cookies.
  // This is required for server-rendered pages (like /pro) to see the session.
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: {
      name: getAuthCookieName(),
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
