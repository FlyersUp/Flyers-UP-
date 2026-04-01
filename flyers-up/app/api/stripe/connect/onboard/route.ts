export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabaseServer';

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const nextParam = req.nextUrl.searchParams.get('next') || '/pro/settings/payments-payouts';
  // Use /pro/connect as intermediate so session has time to persist before API hit
  const onboardNext = `/pro/connect?next=${encodeURIComponent(nextParam)}`;

  const redirectWithConnectHint = (hint: string, logReason?: string) => {
    if (logReason) console.error('Stripe Connect onboard:', logReason);
    const dest = new URL(nextParam, origin);
    dest.searchParams.set('connect', hint);
    return NextResponse.redirect(dest);
  };

  try {
    if (!stripe) {
      return redirectWithConnectHint('not_configured');
    }

    let supabase;
    try {
      supabase = await createServerSupabaseClient();
    } catch (e) {
      return redirectWithConnectHint('error', String(e));
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(new URL(`/auth?next=${encodeURIComponent(onboardNext)}`, origin));
    }

    let profile, proRow;
    try {
      const { data: p } = await supabase.from('profiles').select('role, first_name, last_name, phone').eq('id', user.id).maybeSingle();
      profile = p;
      const { data: pr } = await supabase
        .from('service_pros')
        .select('user_id, stripe_account_id, display_name')
        .eq('user_id', user.id)
        .maybeSingle();
      proRow = pr;
    } catch (e) {
      return redirectWithConnectHint('error', String(e));
    }

    if (!profile || profile.role !== 'pro') {
      return NextResponse.redirect(new URL(`/onboarding/role?next=${encodeURIComponent(onboardNext)}`, origin));
    }

    if (!proRow) {
      return NextResponse.redirect(new URL(`/onboarding/pro?next=${encodeURIComponent(onboardNext)}`, origin));
    }

    let admin: ReturnType<typeof createAdminSupabaseClient> | null = null;
    try {
      admin = createAdminSupabaseClient();
    } catch {
      admin = null;
    }

    let accountId = proRow.stripe_account_id ?? null;
    if (!accountId) {
      try {
        // Prefill data we already have so Stripe skips those steps during onboarding
        const firstName = (profile as { first_name?: string })?.first_name?.trim();
        const lastName = (profile as { last_name?: string })?.last_name?.trim();
        const phone = (profile as { phone?: string })?.phone?.trim();
        const displayName = (proRow as { display_name?: string })?.display_name?.trim();
        const email = user.email?.trim();

        const account = await stripe.accounts.create({
          type: 'express',
          country: 'US',
          business_type: 'individual',
          email: email || undefined,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          metadata: {
            pro_user_id: user.id,
          },
          // Prefill so Connect Onboarding skips these
          ...(displayName && { business_profile: { name: displayName } }),
          ...(firstName || lastName || email || phone
            ? {
                individual: {
                  ...(firstName && { first_name: firstName }),
                  ...(lastName && { last_name: lastName }),
                  ...(email && { email }),
                  ...(phone && { phone }),
                },
              }
            : {}),
        });

        accountId = account.id;

        const client = admin ?? supabase;
        await client.from('service_pros').update({ stripe_account_id: accountId }).eq('user_id', user.id);
      } catch (e) {
        return redirectWithConnectHint('error', String(e));
      }
    }

    const returnUrl = new URL('/api/stripe/connect/return', origin);
    returnUrl.searchParams.set('next', nextParam);

    try {
      const link = await stripe.accountLinks.create({
        account: accountId,
        type: 'account_onboarding',
        refresh_url: `${origin}/api/stripe/connect/onboard?next=${encodeURIComponent(nextParam)}`,
        return_url: returnUrl.toString(),
      });

      if (!link?.url) {
        return redirectWithConnectHint('error', 'missing_account_link_url');
      }
      return NextResponse.redirect(link.url);
    } catch (err) {
      console.error('Stripe Connect onboard error:', err);
      return redirectWithConnectHint('error', err instanceof Error ? err.message : String(err));
    }
  } catch (err) {
    return redirectWithConnectHint('error', err instanceof Error ? err.message : String(err));
  }
}

