/**
 * Get or create Stripe Customer for a user.
 * Persists stripe_customer_id on profiles. Used by payment methods + checkout.
 */

import { stripe } from '@/lib/stripe';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';

export async function getOrCreateStripeCustomer(
  userId: string,
  email: string | null
): Promise<{ stripeCustomerId: string } | { error: string }> {
  if (!stripe) {
    return { error: 'Stripe is not configured' };
  }

  const admin = createAdminSupabaseClient();

  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .maybeSingle();

  if (profileErr) {
    console.error('stripeCustomer: profile fetch error', profileErr);
    return { error: 'Failed to load profile' };
  }

  const existing = profile?.stripe_customer_id;
  if (existing && typeof existing === 'string' && existing.trim()) {
    return { stripeCustomerId: existing.trim() };
  }

  const customer = await stripe.customers.create({
    email: email?.trim() || undefined,
    metadata: { userId },
  });

  const { error: updateErr } = await admin
    .from('profiles')
    .update({ stripe_customer_id: customer.id, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (updateErr) {
    console.error('stripeCustomer: failed to persist stripe_customer_id', updateErr);
    return { error: 'Failed to save Stripe customer' };
  }

  return { stripeCustomerId: customer.id };
}
