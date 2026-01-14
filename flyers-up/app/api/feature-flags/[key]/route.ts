export const runtime = 'nodejs';

/**
 * Feature flag read endpoint (server-authoritative).
 *
 * - Uses env + DB gating.
 * - Fails closed (disabled) if anything is misconfigured.
 * - Does not expose any sensitive information.
 */

import { NextRequest } from 'next/server';
import { isFeatureEnabled } from '@/lib/featureFlags';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const enabled = await isFeatureEnabled(key);

  return Response.json(
    {
      ok: true,
      key,
      enabled,
    },
    {
      status: 200,
      headers: {
        // Safe short caching to reduce DB load at scale.
        // Flags still fail closed and can tolerate brief propagation delay.
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    }
  );
}


