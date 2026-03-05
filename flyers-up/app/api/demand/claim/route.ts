/**
 * POST /api/demand/claim
 * Atomically claim a demand request. Pro-only. Uses RPC claim_demand_request.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { claimRequestSchema } from '@/lib/marketplace/schema';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = claimRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request_id', details: parsed.error.flatten() }, { status: 400 });
    }

    const { data, error } = await supabase.rpc('claim_demand_request', {
      p_request_id: parsed.data.request_id,
    });

    if (error) {
      if (error.message?.includes('already claimed') || error.message?.includes('not found')) {
        return NextResponse.json(
          { error: 'Job was claimed by another pro.', code: 'ALREADY_CLAIMED' },
          { status: 409 }
        );
      }
      if (error.message?.includes('Not a pro')) {
        return NextResponse.json({ error: 'Pro account required' }, { status: 403 });
      }
      console.error('[demand/claim] RPC error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, request: data });
  } catch (err) {
    console.error('[demand/claim] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
