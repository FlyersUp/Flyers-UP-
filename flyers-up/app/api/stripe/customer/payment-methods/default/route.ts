/**
 * POST /api/stripe/customer/payment-methods/default
 * Sets default payment method on Stripe customer.
 * Body: { paymentMethodId: string }
 */

import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { getOrCreateStripeCustomer } from '@/lib/stripeCustomer';

export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  let body: { paymentMethodId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const paymentMethodId = body?.paymentMethodId;
  if (!paymentMethodId || typeof paymentMethodId !== 'string') {
    return NextResponse.json({ error: 'Missing paymentMethodId' }, { status: 400 });
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

  const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
  if (pm.customer !== customerResult.stripeCustomerId) {
    return NextResponse.json({ error: 'Payment method does not belong to you' }, { status: 403 });
  }

  await stripe.customers.update(customerResult.stripeCustomerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  return NextResponse.json({ success: true });
}
