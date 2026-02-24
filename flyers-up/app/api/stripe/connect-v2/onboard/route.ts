/**
 * Stripe Connect V2 Onboarding
 *
 * 1. Creates a V2 connected account (platform responsible for fees) if none exists
 * 2. Stores mapping: user/pro → account ID in service_pros.stripe_account_id
 * 3. Creates Account Link for onboarding
 * 4. Redirects user to Stripe hosted onboarding
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createConnectedAccountV2,
  createAccountLinkV2,
  getStripeConnectClient,
} from '@/lib/stripeConnect';
import { stripe } from '@/lib/stripe';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const nextParam = req.nextUrl.searchParams.get('next') ?? '/pro/earnings';

  const redirectError = (msg: string) =>
    NextResponse.redirect(new URL(`/pro/earnings?connect=error&msg=${encodeURIComponent(msg)}`, origin));

  try {
    if (!getStripeConnectClient()) {
      return redirectError('Stripe is not configured. Set STRIPE_SECRET_KEY in .env.local');
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(new URL(`/auth?next=${encodeURIComponent(req.url)}`, origin));
    }

    // Get or create pro row (sample uses service_pros for account mapping)
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (!profile || profile.role !== 'pro') {
      return NextResponse.redirect(new URL(`/onboarding/role?next=${encodeURIComponent(req.url)}`, origin));
    }

    const { data: proRow } = await supabase
      .from('service_pros')
      .select('id, user_id, stripe_account_id, display_name')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!proRow) {
      return NextResponse.redirect(new URL(`/onboarding/pro?next=${encodeURIComponent(req.url)}`, origin));
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .maybeSingle();

    const displayName =
      (proRow as any)?.display_name ||
      [profileData?.first_name, profileData?.last_name].filter(Boolean).join(' ') ||
      user.email?.split('@')[0] ||
      'Pro';
    const contactEmail = user.email?.trim() ?? '';

    let accountId = (proRow as any)?.stripe_account_id ?? null;

    if (!accountId) {
      const result = await createConnectedAccountV2({
        displayName,
        contactEmail,
        country: 'us',
      });
      if ('error' in result) return redirectError(result.error);
      accountId = result.accountId;

      const admin = createAdminSupabaseClient();
      await admin.from('service_pros').update({ stripe_account_id: accountId }).eq('user_id', user.id);
    }

    const refreshUrl = `${origin}/api/stripe/connect-v2/onboard?next=${encodeURIComponent(nextParam)}`;
    const returnUrl = `${origin}/api/stripe/connect-v2/return?next=${encodeURIComponent(nextParam)}`;

    let linkUrl: string | null = null;

    const linkResult = await createAccountLinkV2(accountId, refreshUrl, returnUrl);
    if ('error' in linkResult) {
      // Existing accounts may be V1 (created before we switched to V2). Stripe rejects: "V1 Accounts cannot be used in V2 Account APIs"
      const errMsg = (linkResult.error ?? '').toLowerCase();
      const isV1AccountError = errMsg.includes('v1') && errMsg.includes('v2');
      if (isV1AccountError && stripe) {
        try {
          const link = await stripe.accountLinks.create({
            account: accountId,
            type: 'account_onboarding',
            refresh_url: refreshUrl,
            return_url: `${origin}/api/stripe/connect/return?next=${encodeURIComponent(nextParam)}`,
          });
          linkUrl = link?.url ?? null;
        } catch {
          // fall through to redirectError
        }
      }
      if (!linkUrl) return redirectError(linkResult.error);
    } else {
      linkUrl = linkResult.url;
    }

    return NextResponse.redirect(linkUrl!);
  } catch (err) {
    return redirectError(err instanceof Error ? err.message : 'Onboarding failed');
  }
}
