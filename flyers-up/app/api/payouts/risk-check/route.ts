export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];

/**
 * Payout risk check endpoint (scaffolding).
 *
 * Admin-only: returns current payout risk state for a pro.
 * TODO: In future, this can be used by internal tooling / cron jobs.
 */

import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { evaluatePayoutRiskForPro } from '@/lib/payoutRisk';

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ ok: false, error: 'Not authenticated' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'admin') {
    return Response.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const proUserId = req.nextUrl.searchParams.get('proUserId');
  if (!proUserId) return Response.json({ ok: false, error: 'Missing proUserId' }, { status: 400 });

  const state = await evaluatePayoutRiskForPro(proUserId);
  return Response.json({ ok: true, state }, { status: 200 });
}


