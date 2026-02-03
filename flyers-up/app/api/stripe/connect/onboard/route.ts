export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabaseServer';

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;

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

  if (!proRow) {
    // Pro hasn't completed the minimal pro onboarding yet.
    return NextResponse.redirect(new URL('/onboarding/pro?next=%2Fpro%2Fearnings', origin));
  }

  let admin: ReturnType<typeof createAdminSupabaseClient> | null = null;
  try {
    admin = createAdminSupabaseClient();
  } catch {
    admin = null;
  }

  let accountId = proRow.stripe_account_id ?? null;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: user.email ?? undefined,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: {
        pro_user_id: user.id,
      },
    });

    accountId = account.id;

    const client = admin ?? supabase;
    await client.from('service_pros').update({ stripe_account_id: accountId }).eq('user_id', user.id);
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    type: 'account_onboarding',
    refresh_url: `${origin}/api/stripe/connect/onboard`,
    return_url: `${origin}/api/stripe/connect/return`,
  });

  return NextResponse.redirect(link.url);
}

