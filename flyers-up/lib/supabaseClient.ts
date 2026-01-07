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

// Get environment variables (may be undefined during build)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Singleton instance
let supabaseInstance: SupabaseClient | null = null;

/**
 * Create a Supabase client for browser-side operations.
 * This client respects RLS policies.
 * 
 * Throws an error if environment variables are not set (at runtime, not build time).
 */
export function createSupabaseClient(): SupabaseClient {
  // Check for env vars at runtime
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Get the Supabase client singleton.
 * Creates a new instance if one doesn't exist.
 * 
 * NOTE: During SSR/build, this will throw if env vars are not set.
 * This is intentional - the app won't work without Supabase configured.
 */
export const supabase = (() => {
  // Return a proxy that lazily initializes the client
  // This prevents errors during build/SSR when env vars might not be available
  if (typeof window === 'undefined') {
    // Server-side: return a placeholder that throws on use
    // Real server-side code should use supabaseServer.ts instead
    return new Proxy({} as SupabaseClient, {
      get: () => {
        throw new Error(
          'Cannot use browser Supabase client on the server. ' +
          'Use createServerSupabaseClient() from lib/supabaseServer.ts instead.'
        );
      },
    });
  }

  // Client-side: create real client
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient();
  }
  return supabaseInstance;
})();
