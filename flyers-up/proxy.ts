/**
 * Next.js Proxy for Route Protection
 * 
 * NOTE: Currently using simple token-based auth stored in localStorage.
 * Proxy runs on the server and cannot access localStorage, so route
 * protection is handled client-side in each dashboard page instead.
 * 
 * FUTURE IMPROVEMENTS:
 * - Switch to cookie-based auth (JWT in httpOnly cookie) for server-side protection
 * - Add role-based route protection
 * - Add admin route protection
 * - Add rate limiting
 */

import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  // For now, just pass through all requests
  // Auth protection is handled client-side since we use localStorage tokens
  return NextResponse.next();
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












