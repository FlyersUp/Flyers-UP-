export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];

/**
 * Client-readable launch mode (server-authoritative).
 * Mirrors {@link isLaunchModeEnabled} including DB override when env is unset.
 */
import { NextResponse } from 'next/server';
import { isLaunchModeEnabled } from '@/lib/featureFlags';

export async function GET() {
  const enabled = await isLaunchModeEnabled();
  return NextResponse.json(
    { ok: true, key: 'FEATURE_LAUNCH_MODE', enabled },
    {
      status: 200,
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
      },
    }
  );
}
