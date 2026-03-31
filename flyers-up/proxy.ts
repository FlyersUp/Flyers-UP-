/**
 * Next.js Proxy (middleware equivalent)
 *
 * - Per-IP rate limits for hot `/api/*` paths (in-memory per instance; use Redis/Upstash at scale).
 * - Supabase session refresh so Server Components and API routes see current auth cookies.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { checkFixedWindowRateLimit } from '@/lib/rate-limit/api-memory';

function clientIp(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) {
    const first = fwd.split(',')[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}

function apiRateLimitConfig(pathname: string): { limit: number; windowMs: number; name: string } | null {
  if (pathname.startsWith('/api/cron/')) return null;
  if (pathname.startsWith('/api/health')) return null;

  if (pathname.startsWith('/api/auth/')) {
    return { limit: 200, windowMs: 60_000, name: 'auth' };
  }
  if (pathname.startsWith('/api/bookings/')) {
    return { limit: 120, windowMs: 60_000, name: 'bookings' };
  }
  if (pathname.startsWith('/api/stripe/')) {
    if (pathname === '/api/stripe/webhook') return null;
    return { limit: 80, windowMs: 60_000, name: 'stripe' };
  }
  if (pathname.startsWith('/api/errors')) {
    return { limit: 30, windowMs: 60_000, name: 'errors' };
  }
  if (pathname.startsWith('/api/search/')) {
    return { limit: 60, windowMs: 60_000, name: 'search' };
  }
  if (pathname.includes('/messages')) {
    return { limit: 90, windowMs: 60_000, name: 'messages' };
  }
  return null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/')) {
    const cfg = apiRateLimitConfig(pathname);
    if (cfg) {
      const key = `${cfg.name}:${clientIp(request)}`;
      const result = checkFixedWindowRateLimit(key, cfg.limit, cfg.windowMs);
      if (!result.ok) {
        return NextResponse.json(
          { error: 'Too many requests' },
          {
            status: 429,
            headers: { 'Retry-After': String(result.retryAfterSec) },
          }
        );
      }
    }
  }

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (
    user &&
    pathname.startsWith('/pro') &&
    !pathname.startsWith('/pro/account-closed') &&
    !pathname.startsWith('/api/')
  ) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('role, account_status')
      .eq('id', user.id)
      .maybeSingle();
    const st = (prof as { account_status?: string | null } | null)?.account_status;
    if (prof?.role === 'pro' && st === 'closed') {
      const redir = NextResponse.redirect(new URL('/pro/account-closed', request.url));
      response.cookies.getAll().forEach((c) => {
        redir.cookies.set(c.name, c.value);
      });
      return redir;
    }
  }

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












