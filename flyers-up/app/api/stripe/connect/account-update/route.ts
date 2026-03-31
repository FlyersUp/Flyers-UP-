/**
 * GET /api/stripe/connect/account-update
 * Redirect pros with an existing Connect account to Stripe (account_update link).
 */
export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const nextParam = req.nextUrl.searchParams.get('next') || '/pro/settings/payments-payouts';

  if (!stripe) {
    return NextResponse.redirect(new URL(`${nextParam}?connect=not_configured`, origin));
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

  const returnUrl = new URL('/api/stripe/connect/return', origin);
  returnUrl.searchParams.set('next', nextParam);

  try {
    const link = await stripe.accountLinks.create({
      account: accountId,
      type: 'account_update',
      refresh_url: `${origin}/api/stripe/connect/account-update?next=${encodeURIComponent(nextParam)}`,
      return_url: returnUrl.toString(),
    });
    if (!link?.url) {
      return NextResponse.redirect(new URL(`${nextParam}?connect=error`, origin));
    }
    return NextResponse.redirect(link.url);
  } catch (err) {
    console.error('Stripe account_update link:', err);
    return NextResponse.redirect(new URL(`${nextParam}?connect=error`, origin));
  }
}
