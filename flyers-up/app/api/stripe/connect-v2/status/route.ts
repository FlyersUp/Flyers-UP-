/**
 * Stripe Connect V2 Account Status
 *
 * Fetches account status directly from Stripe API (not from DB).
 * Used to display onboarding progress and payment-ready state.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAccountStatusV2 } from '@/lib/stripeConnect';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export async function GET(req: NextRequest) {
  const accountId = req.nextUrl.searchParams.get('accountId');

  if (!accountId) {
    return NextResponse.json({ error: 'accountId required' }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user owns this account (service_pros or stripe_connect_accounts)
    const [proRes, accRes] = await Promise.all([
      supabase.from('service_pros').select('stripe_account_id').eq('user_id', user.id).maybeSingle(),
      supabase.from('stripe_connect_accounts').select('stripe_account_id').eq('user_id', user.id).maybeSingle(),
    ]);
    const userAccountId = (proRes.data as any)?.stripe_account_id ?? (accRes.data as any)?.stripe_account_id;
    if (userAccountId !== accountId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const status = await getAccountStatusV2(accountId);
    return NextResponse.json(status);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to get status' },
      { status: 500 }
    );
  }
}
