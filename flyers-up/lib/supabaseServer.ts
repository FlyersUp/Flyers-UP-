/**
 * Supabase Server Client
 * 
 * This file provides Supabase clients for SERVER-SIDE operations in Next.js App Router.
 * 
 * Use cases:
 * - Server Components (async components)
 * - Route Handlers (app/api/...)
 * - Server Actions
 * - Proxy
 * 
 * IMPORTANT: Never import this file in client components!
 * 
 * NOTE: Once your Supabase database is set up, you can regenerate types with:
 * npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
// Uncomment when you have generated types from your actual Supabase schema:
// import type { Database } from '@/types/database';

/**
 * Create a Supabase client for Server Components and Route Handlers.
 * This client reads/writes auth cookies automatically.
 * 
 * Usage in Server Component:
 * ```
 * import { createServerSupabaseClient } from '@/lib/supabaseServer';
 * 
 * export default async function Page() {
 *   const supabase = await createServerSupabaseClient();
 *   const { data } = await supabase.from('profiles').select();
 *   // ...
 * }
 * ```
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method is called from a Server Component
            // which cannot set cookies. This can be ignored if you have
            // proxy that refreshes user sessions.
          }
        },
      },
    }
  );
}

/**
 * Create a Supabase Admin client with Service Role key.
 * This bypasses RLS - USE WITH CAUTION!
 * 
 * Only use for:
 * - Creating profiles after signup (before RLS allows the user to do it)
 * - Admin operations that need to bypass RLS
 * - Server-side background jobs
 * 
 * NEVER expose this to the client!
 */
export function createAdminSupabaseClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY environment variable. ' +
      'This is required for admin operations.'
    );
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Get the currently authenticated user from the server.
 * Returns null if not authenticated.
 */
export async function getServerUser() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return user;
}

/**
 * Get the current user's profile from the database.
 * Includes role information.
 */
export async function getServerUserWithProfile() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return { user: null, profile: null };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Error fetching profile:', profileError);
    return { user, profile: null };
  }

  return { user, profile };
}
