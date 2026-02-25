/**
 * POST /api/stripe/customer/setup-intent
 * Creates a SetupIntent for adding a new payment method.
 * Returns { clientSecret } for Stripe Elements confirmSetup.
 */

import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { getOrCreateStripeCustomer } from '@/lib/stripeCustomer';

export const dynamic = 'force-dynamic';

export async function POST() {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'customer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const customerResult = await getOrCreateStripeCustomer(user.id, user.email ?? null);
  if ('error' in customerResult) {
    return NextResponse.json({ error: customerResult.error }, { status: 500 });
  }

  const setupIntent = await stripe.setupIntents.create({
    customer: customerResult.stripeCustomerId,
    payment_method_types: ['card'],
    usage: 'off_session',
  });

  return NextResponse.json({
    clientSecret: setupIntent.client_secret,
  });
}
