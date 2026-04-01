/**
 * Stripe Connect V2 – Return from Account Links onboarding
 *
 * Updates service_pros with status from Stripe API (getAccountStatusV2)
 * and redirects to next param.
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import {
  connectReturnQueryHint,
  resolveStripeConnectUiState,
} from '@/lib/stripe/connectUiState';
import { getAccountStatusV2, getStripeConnectClient } from '@/lib/stripeConnect';
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const nextParam = req.nextUrl.searchParams.get('next') ?? '/pro/settings/payments-payouts';
  const payoutsDefault = '/pro/settings/payments-payouts';

  if (!getStripeConnectClient()) {
    const d = new URL(nextParam, origin);
    d.searchParams.set('connect', 'not_configured');
    return NextResponse.redirect(d);
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL(`/auth?next=${encodeURIComponent(payoutsDefault)}`, origin));
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'pro') {
    const d = new URL(nextParam, origin);
    d.searchParams.set('connect', 'unauthorized');
    return NextResponse.redirect(d);
  }

  const { data: proRow } = await supabase
    .from('service_pros')
    .select('user_id, stripe_account_id')
    .eq('user_id', user.id)
    .maybeSingle();

  const accountId = proRow?.stripe_account_id ?? null;
  if (!accountId) {
    const d = new URL(nextParam, origin);
    d.searchParams.set('connect', 'missing_account');
    return NextResponse.redirect(d);
  }

  let detailsSubmitted = false;
  let chargesEnabled = false;
  let payoutsEnabled = false;
  let disabledReason: string | null = null;

  if (stripe) {
    try {
      const acct = await stripe.accounts.retrieve(accountId);
      detailsSubmitted = Boolean(acct.details_submitted);
      chargesEnabled = Boolean(acct.charges_enabled);
      payoutsEnabled = Boolean(acct.payouts_enabled);
      disabledReason = acct.requirements?.disabled_reason ?? null;
    } catch {
      const status = await getAccountStatusV2(accountId);
      const ready = status.readyToReceivePayments ?? false;
      detailsSubmitted = status.onboardingComplete ?? false;
      chargesEnabled = ready;
      payoutsEnabled = ready;
      disabledReason =
        status.requirementsStatus === 'past_due' || status.requirementsStatus === 'currently_due'
          ? (status.requirementsStatus ?? null)
          : null;
    }
  } else {
    const status = await getAccountStatusV2(accountId);
    const ready = status.readyToReceivePayments ?? false;
    detailsSubmitted = status.onboardingComplete ?? false;
    chargesEnabled = ready;
    payoutsEnabled = ready;
    disabledReason =
      status.requirementsStatus === 'past_due' || status.requirementsStatus === 'currently_due'
        ? (status.requirementsStatus ?? null)
        : null;
  }

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

  const uiState = resolveStripeConnectUiState({
    accountId,
    chargesEnabled,
    payoutsEnabled,
    detailsSubmitted,
    disabledReason,
  });
  const hint = connectReturnQueryHint(uiState);
  const dest = new URL(nextParam, origin);
  dest.searchParams.set('connect', hint);
  return NextResponse.redirect(dest);
}
