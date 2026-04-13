/**
 * POST /api/pro/stripe/payout-update-link
 * Returns a Stripe-hosted URL (Express login link or Connect account link) for payout/bank/tax updates.
 */
export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createProPayoutManagementUrl, normalizeProStripeReturnPath } from '@/lib/stripe/createProPayoutManagementUrl';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  const origin = req.nextUrl.origin;

  if (!stripe) {
    return NextResponse.json(
      { ok: false, error: 'Stripe is not configured on this environment.', code: 'not_configured' },
      { status: 503 }
    );
  }

  let returnPath = '/pro/settings/payments-payouts';
  try {
    const body = (await req.json()) as { returnPath?: string } | null;
    if (body && typeof body.returnPath === 'string') {
      returnPath = normalizeProStripeReturnPath(body.returnPath);
    }
  } catch {
    /* use default */
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized', code: 'unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'pro') {
    return NextResponse.json({ ok: false, error: 'Forbidden', code: 'forbidden' }, { status: 403 });
  }

  const { data: proRow } = await supabase
    .from('service_pros')
    .select('stripe_account_id')
    .eq('user_id', user.id)
    .maybeSingle();

  const accountId = proRow?.stripe_account_id?.trim() ?? null;
  if (!accountId) {
    return NextResponse.json(
      { ok: false, error: 'No Stripe Connect account is linked yet. Start payout setup first.', code: 'no_account' },
      { status: 400 }
    );
  }

  const result = await createProPayoutManagementUrl(stripe, { accountId, origin, returnPath });
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, code: result.code },
      { status: result.code === 'stripe_retrieve_failed' ? 502 : 500 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      url: result.url,
      linkKind: result.linkKind,
      accountLinkType: result.accountLinkType,
    },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );
}
