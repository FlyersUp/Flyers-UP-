/**
 * GET /api/customer/verification-status
 * Signed-in customer: email/phone confirmation from Auth, saved card presence from Stripe.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { stripe } from '@/lib/stripe';
import { getOrCreateStripeCustomer } from '@/lib/stripeCustomer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type CustomerVerificationStatusPayload = {
  emailVerified: boolean;
  phoneVerified: boolean;
  hasPaymentMethod: boolean;
  /** Government ID / Stripe Identity — not used for customers yet */
  identityStatus: 'not_started' | 'pending' | 'verified';
  phoneHint: string | null;
};

export async function GET() {
  try {
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

    const emailVerified = Boolean(user.email_confirmed_at);
    const phoneConfirmed = Boolean(
      (user as { phone_confirmed_at?: string | null }).phone_confirmed_at
    );
    const phoneVerified = phoneConfirmed;

    let hasPaymentMethod = false;
    if (stripe) {
      try {
        const customerResult = await getOrCreateStripeCustomer(user.id, user.email ?? null);
        if (!('error' in customerResult)) {
          const pmList = await stripe.paymentMethods.list({
            customer: customerResult.stripeCustomerId,
            type: 'card',
          });
          hasPaymentMethod = pmList.data.length > 0;
        }
      } catch {
        // leave hasPaymentMethod false
      }
    }

    const phone = user.phone ?? null;
    const phoneHint =
      phone && phone.length >= 4 ? `•••• ${phone.replace(/\D/g, '').slice(-4)}` : null;

    const payload: CustomerVerificationStatusPayload = {
      emailVerified,
      phoneVerified,
      hasPaymentMethod,
      identityStatus: 'not_started',
      phoneHint,
    };

    return NextResponse.json(payload, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[customer/verification-status]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
