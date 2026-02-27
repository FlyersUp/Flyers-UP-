/**
 * Stripe Connect V2 – Return from Account Links onboarding
 *
 * Updates service_pros with status from Stripe API (getAccountStatusV2)
 * and redirects to next param.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAccountStatusV2, getStripeConnectClient } from '@/lib/stripeConnect';
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const nextParam = req.nextUrl.searchParams.get('next') ?? '/pro/earnings';

  if (!getStripeConnectClient()) {
    return NextResponse.redirect(new URL(`/pro/earnings?connect=not_configured`, origin));
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL(`/auth?next=${encodeURIComponent('/pro/earnings')}`, origin));
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'pro') {
    return NextResponse.redirect(new URL(`/pro/earnings?connect=unauthorized`, origin));
  }

  const { data: proRow } = await supabase
    .from('service_pros')
    .select('user_id, stripe_account_id')
    .eq('user_id', user.id)
    .maybeSingle();

  const accountId = proRow?.stripe_account_id ?? null;
  if (!accountId) {
    return NextResponse.redirect(new URL(`/pro/earnings?connect=missing_account`, origin));
  }

  const status = await getAccountStatusV2(accountId);
  const readyToReceivePayments = status.readyToReceivePayments ?? false;
  const onboardingComplete = status.onboardingComplete ?? false;

  let admin: ReturnType<typeof createAdminSupabaseClient> | null = null;
  try {
    admin = createAdminSupabaseClient();
  } catch {
    admin = null;
  }

  const client = admin ?? supabase;
  await client
    .from('service_pros')
    .update({
      stripe_details_submitted: onboardingComplete,
      stripe_charges_enabled: readyToReceivePayments,
      stripe_payouts_enabled: readyToReceivePayments,
    })
    .eq('user_id', user.id);

  const connectStatus = readyToReceivePayments ? 'complete' : 'pending';
  const dest = new URL(nextParam, origin);
  dest.searchParams.set('connect', connectStatus);
  return NextResponse.redirect(dest);
}
