/**
 * GET /api/stripe/connect/account-update
 * Redirect pros with an existing Connect account to Stripe (login link or account link).
 * Prefer POST /api/pro/stripe/payout-update-link from the app UI (JSON URL + client redirect).
 */
export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createProPayoutManagementUrl, normalizeProStripeReturnPath } from '@/lib/stripe/createProPayoutManagementUrl';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const nextParam = normalizeProStripeReturnPath(
    req.nextUrl.searchParams.get('next') || '/pro/settings/payments-payouts'
  );

  if (!stripe) {
    const d = new URL(nextParam, origin);
    d.searchParams.set('connect', 'not_configured');
    return NextResponse.redirect(d);
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL(`/auth?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`, origin));
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'pro') {
    return NextResponse.redirect(new URL('/onboarding/role', origin));
  }

  const { data: proRow } = await supabase
    .from('service_pros')
    .select('stripe_account_id')
    .eq('user_id', user.id)
    .maybeSingle();

  const accountId = proRow?.stripe_account_id?.trim() ?? null;
  if (!accountId) {
    return NextResponse.redirect(new URL(`${nextParam}?connect=no_account`, origin));
  }

  const result = await createProPayoutManagementUrl(stripe, { accountId, origin, returnPath: nextParam });
  if (!result.ok) {
    console.error('Stripe payout management link (GET account-update):', result.error);
    const d = new URL(nextParam, origin);
    d.searchParams.set('connect', 'error');
    return NextResponse.redirect(d);
  }
  return NextResponse.redirect(result.url);
}
