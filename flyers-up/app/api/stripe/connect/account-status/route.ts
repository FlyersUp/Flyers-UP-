/**
 * GET /api/stripe/connect/account-status
 * Pro-only: Stripe Connect state from service_pros + live Stripe Account (masked bank only).
 */
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import {
  resolveStripeConnectUiState,
  type StripeConnectUiState,
} from '@/lib/stripe/connectUiState';
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];
export const dynamic = 'force-dynamic';

export type { StripeConnectUiState };

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (profile?.role !== 'pro') {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    const { data: pro } = await supabase
      .from('service_pros')
      .select('stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled, stripe_details_submitted')
      .eq('user_id', user.id)
      .maybeSingle();

    const accountId = (pro?.stripe_account_id as string | null)?.trim() || null;
    const stripeConfigured = Boolean(stripe);

    if (!accountId) {
      const uiState = resolveStripeConnectUiState({
        accountId: null,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
      });
      return NextResponse.json({
        ok: true,
        stripeConfigured,
        uiState,
        accountId: null,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        bankLast4: null as string | null,
        bankName: null as string | null,
        disabledReason: null as string | null,
      });
    }

    let chargesEnabled = Boolean(pro?.stripe_charges_enabled);
    let payoutsEnabled = Boolean(pro?.stripe_payouts_enabled);
    let detailsSubmitted = Boolean(pro?.stripe_details_submitted);
    let bankLast4: string | null = null;
    let bankName: string | null = null;
    let disabledReason: string | null = null;

    if (stripe) {
      try {
        const acct = await stripe.accounts.retrieve(accountId, { expand: ['external_accounts'] });
        chargesEnabled = Boolean(acct.charges_enabled);
        payoutsEnabled = Boolean(acct.payouts_enabled);
        detailsSubmitted = Boolean(acct.details_submitted);
        const reqs = acct.requirements;
        if (reqs?.disabled_reason) {
          disabledReason = reqs.disabled_reason;
        }
        const ext = acct.external_accounts?.data ?? [];
        const bank = ext.find((x) => x.object === 'bank_account');
        if (bank && bank.object === 'bank_account') {
          bankLast4 = bank.last4 ?? null;
          bankName = bank.bank_name ?? null;
        }

        try {
          const admin = createAdminSupabaseClient();
          await admin
            .from('service_pros')
            .update({
              stripe_details_submitted: detailsSubmitted,
              stripe_charges_enabled: chargesEnabled,
              stripe_payouts_enabled: payoutsEnabled,
            })
            .eq('user_id', user.id);
        } catch {
          /* DB sync best-effort */
        }
      } catch {
        // Use DB snapshot only; disabledReason unknown
      }
    }

    const uiState = resolveStripeConnectUiState({
      accountId,
      chargesEnabled,
      payoutsEnabled,
      detailsSubmitted,
      disabledReason,
    });

    return NextResponse.json(
      {
        ok: true,
        stripeConfigured,
        uiState,
        accountId,
        chargesEnabled,
        payoutsEnabled,
        detailsSubmitted,
        bankLast4,
        bankName,
        disabledReason,
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Failed to load Connect status' },
      { status: 500 }
    );
  }
}
