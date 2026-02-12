/**
 * Next.js Proxy for Route Protection
 * 
 * Supabase session proxy (middleware equivalent).
 *
 * This runs before rendering and keeps Supabase auth cookies up to date.
 * It's required so Server Components can see the signed-in user and we don't
 * get redirect loops like: /auth?next=/pro -> /pro -> /auth?next=/pro.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
  if (!supabaseUrl || !supabaseAnonKey) return response;

  const projectRefMatch = supabaseUrl.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co/i);
  const projectRef = projectRefMatch?.[1] ?? null;
  const cookieName = projectRef ? `sb-${projectRef}-auth-token` : 'sb-flyersup-auth-token';

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: { name: cookieName },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Refresh session cookies if needed.
  await supabase.auth.getUser();

  return response;
}

// Configure which routes the proxy runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};












