/**
 * GET /api/stripe/customer/payment-methods
 * Loads saved payment methods from Stripe Customer (type=card).
 * Uses getOrCreateStripeCustomer for Stripe Customer + profiles.stripe_customer_id.
 */

import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { getOrCreateStripeCustomer } from '@/lib/stripeCustomer';

export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];
export const dynamic = 'force-dynamic';

export async function GET() {
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
    .select('role, stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'customer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const customerResult = await getOrCreateStripeCustomer(user.id, user.email ?? null);
  if ('error' in customerResult) {
    return NextResponse.json({ error: customerResult.error }, { status: 500 });
  }

  const pmList = await stripe.paymentMethods.list({
    customer: customerResult.stripeCustomerId,
    type: 'card',
  });

  const customer = await stripe.customers.retrieve(customerResult.stripeCustomerId);
  const defaultPmId =
    customer && !customer.deleted && 'invoice_settings' in customer
      ? (customer.invoice_settings?.default_payment_method as string | null) ?? null
      : null;

  const paymentMethods = pmList.data.map((pm) => {
    const card = pm.card;
    return {
      id: pm.id,
      brand: card?.brand ?? 'card',
      last4: card?.last4 ?? '0000',
      exp_month: card?.exp_month ?? 0,
      exp_year: card?.exp_year ?? 0,
      isDefault: pm.id === defaultPmId,
    };
  });

  return NextResponse.json({
    paymentMethods,
    defaultPaymentMethodId: defaultPmId,
  });
}
