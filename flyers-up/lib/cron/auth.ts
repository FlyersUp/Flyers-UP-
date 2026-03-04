/**
 * Cron endpoint auth. Checks x-cron-secret header or ?secret= query param.
 * Returns 401 Response if mismatch.
 */

import { NextRequest } from 'next/server';

export function requireCronSecret(req: NextRequest): Response | null {
  const secret = process.env.CRON_SECRET;
  if (!secret?.trim()) {
    console.error('[cron] CRON_SECRET not set');
    return new Response(JSON.stringify({ error: 'Cron not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const headerSecret = req.headers.get('x-cron-secret');
  const querySecret = req.nextUrl.searchParams.get('secret');
  const provided = headerSecret ?? querySecret;

  if (provided !== secret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return null;
}
