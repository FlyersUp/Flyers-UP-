export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabaseServer';

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const nextParam = req.nextUrl.searchParams.get('next') || '/pro/earnings';

  if (!stripe) {
    return NextResponse.redirect(new URL('/pro/earnings?connect=not_configured', origin));
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL('/auth?next=%2Fpro%2Fearnings', origin));
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'pro') {
    return NextResponse.redirect(new URL('/onboarding/role?next=%2Fpro%2Fearnings', origin));
  }

  const { data: proRow } = await supabase
    .from('service_pros')
    .select('user_id, stripe_account_id')
    .eq('user_id', user.id)
    .maybeSingle();

  const accountId = proRow?.stripe_account_id ?? null;
  if (!accountId) {
    return NextResponse.redirect(new URL('/pro/earnings?connect=missing_account', origin));
  }

  const acct = await stripe.accounts.retrieve(accountId);

  const detailsSubmitted = Boolean((acct as any).details_submitted);
  const chargesEnabled = Boolean((acct as any).charges_enabled);
  const payoutsEnabled = Boolean((acct as any).payouts_enabled);

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
      stripe_details_submitted: detailsSubmitted,
      stripe_charges_enabled: chargesEnabled,
      stripe_payouts_enabled: payoutsEnabled,
    })
    .eq('user_id', user.id);

  const status = detailsSubmitted && chargesEnabled ? 'complete' : 'pending';
  const dest = new URL(nextParam, origin);
  dest.searchParams.set('connect', status);
  return NextResponse.redirect(dest);
}

