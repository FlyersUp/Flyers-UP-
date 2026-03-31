import { NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * Lightweight liveness for load balancers / uptime checks. No DB or Stripe calls.
 */
export function GET() {
  return NextResponse.json(
    { ok: true, service: 'flyers-up' },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
