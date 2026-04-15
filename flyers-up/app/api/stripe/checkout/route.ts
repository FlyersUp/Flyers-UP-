/**
 * Hosted Stripe Checkout for bookings in `awaiting_payment`.
 * Charges the **platform** only (no `transfer_data` / destination charges).
 * Webhook `payment_intent.succeeded` → `applySucceededPaymentIntent` (legacy_full path).
 */
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { buildHostedCheckoutPaymentIntentData } from '@/lib/stripe/hosted-checkout-payment-intent-data';

export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];

function getOriginFromRequest(req: NextRequest): string {
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (!host) return 'https://www.flyersup.app';
  return `${proto}://${host}`;
}

function resolveCheckoutAmountCents(booking: {
  price?: number | null;
  customer_total_cents?: number | null;
  total_amount_cents?: number | null;
}): number {
  const frozen =
    typeof booking.customer_total_cents === 'number' && booking.customer_total_cents > 0
      ? Math.round(booking.customer_total_cents)
      : typeof booking.total_amount_cents === 'number' && booking.total_amount_cents > 0
        ? Math.round(booking.total_amount_cents)
        : null;
  if (frozen != null) return frozen;
  return Math.round(Number(booking.price ?? 0) * 100);
}

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 500 });
  }

  const { bookingId } = (await req.json().catch(() => ({}))) as { bookingId?: string };
  if (!bookingId) {
    return NextResponse.json({ error: 'Missing bookingId.' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'customer') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select(
      'id, customer_id, pro_id, status, price, customer_total_cents, total_amount_cents, subtotal_cents, fee_total_cents, platform_fee_cents, pricing_version'
    )
    .eq('id', bookingId)
    .maybeSingle();

  if (bErr || !booking || booking.customer_id !== user.id) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
  }

  if (booking.status !== 'awaiting_payment') {
    return NextResponse.json(
      { error: `Booking is not ready for payment (status: ${booking.status}).` },
      { status: 400 }
    );
  }

  const amountCents = resolveCheckoutAmountCents(booking);
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return NextResponse.json({ error: 'Booking total is not set yet.' }, { status: 400 });
  }

  const { data: proRow } = await admin
    .from('service_pros')
    .select('category_id, display_name')
    .eq('id', booking.pro_id)
    .maybeSingle();

  let serviceName = 'Service';
  const catId = (proRow as { category_id?: string | null } | null)?.category_id;
  if (catId) {
    const { data: catRow } = await admin.from('service_categories').select('name').eq('id', catId).maybeSingle();
    if (catRow && typeof (catRow as { name?: string }).name === 'string') {
      serviceName = String((catRow as { name: string }).name).trim() || 'Service';
    }
  }

  const bMoney = booking as {
    subtotal_cents?: number | null;
    fee_total_cents?: number | null;
    platform_fee_cents?: number | null;
    pricing_version?: string | null;
  };

  const paymentIntentData = buildHostedCheckoutPaymentIntentData({
    bookingId: booking.id,
    customerId: booking.customer_id,
    proId: booking.pro_id,
    serviceTitle: serviceName,
    amountCents,
    bookingMoneySnapshot: {
      pricingVersion: bMoney.pricing_version ?? null,
      subtotalCents: bMoney.subtotal_cents ?? null,
      platformFeeCents: bMoney.platform_fee_cents ?? null,
      feeTotalCents: bMoney.fee_total_cents ?? null,
    },
  });

  const origin = getOriginFromRequest(req);
  const successUrl = `${origin}/customer/booking/paid?bookingId=${encodeURIComponent(bookingId)}`;
  const cancelUrl = `${origin}/jobs/${encodeURIComponent(bookingId)}`;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    automatic_tax: { enabled: true },
    customer_email: user.email ?? undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: amountCents,
          product_data: {
            name: 'Flyers Up service',
          },
        },
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    payment_intent_data: {
      metadata: paymentIntentData.metadata,
      description: paymentIntentData.description,
      statement_descriptor_suffix: paymentIntentData.statement_descriptor_suffix,
    },
    metadata: {
      booking_id: booking.id,
    },
  });

  return NextResponse.json({ url: session.url }, { status: 200 });
}
