/**
 * POST /api/bookings/[bookingId]/complete
 * Pro marks work complete.
 * 1. Update status = completed_pending_payment, completed_at
 * 2. Capture Stripe PaymentIntent
 * 3. On success: status = paid, paid_at = now()
 */
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { isValidTransition } from '@/components/jobs/jobStatus';
import { createNotification, bookingDeepLinkCustomer, bookingDeepLinkPro } from '@/lib/notifications';

export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];
export const dynamic = 'force-dynamic';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;
  const id = normalizeUuidOrNull(bookingId);
  if (!id) {
    return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'pro') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: proRow } = await supabase
    .from('service_pros')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!proRow?.id) {
    return NextResponse.json({ error: 'Pro profile not found' }, { status: 403 });
  }
  const proId = String(proRow.id);

  const admin = createAdminSupabaseClient();
  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select('id, status, status_history, pro_id, customer_id, payment_intent_id')
    .eq('id', id)
    .single();

  if (bErr || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }
  if (booking.pro_id !== proId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!isValidTransition(String(booking.status), 'completed_pending_payment')) {
    return NextResponse.json(
      { error: `Cannot complete booking with status: ${booking.status}` },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const history = ((booking as { status_history?: { status: string; at: string }[] }).status_history ?? []) as { status: string; at: string }[];
  const newHistory = [...history, { status: 'completed_pending_payment', at: now }];

  const { data: updated, error: updateErr } = await admin
    .from('bookings')
    .update({
      status: 'completed_pending_payment',
      status_history: newHistory,
      completed_at: now,
      status_updated_at: now,
      status_updated_by: user.id,
    })
    .eq('id', id)
    .eq('pro_id', proId)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
  }

  const piId = booking.payment_intent_id && typeof booking.payment_intent_id === 'string'
    ? booking.payment_intent_id.trim()
    : null;

  if (piId && stripe) {
    try {
      const pi = await stripe.paymentIntents.capture(piId);
      if (pi.status === 'succeeded') {
        const paidNow = new Date().toISOString();
        const paidHistory = [...newHistory, { status: 'paid', at: paidNow }];
        await admin
          .from('bookings')
          .update({
            status: 'paid',
            status_history: paidHistory,
            paid_at: paidNow,
            payment_status: 'PAID',
          })
          .eq('id', id);
        // Notify BOTH customer and pro: Payment completed
        const custId = booking.customer_id;
        if (custId) {
          void createNotification({
            user_id: custId,
            type: 'payment_captured',
            title: 'Payment completed',
            body: 'Your payment has been processed successfully.',
            booking_id: id,
            deep_link: bookingDeepLinkCustomer(id),
          });
        }
        const { data: proRow } = await admin.from('service_pros').select('user_id').eq('id', booking.pro_id).maybeSingle();
        const proUserId = (proRow as { user_id?: string } | null)?.user_id;
        if (proUserId) {
          void createNotification({
            user_id: proUserId,
            type: 'payment_captured',
            title: 'Payment completed',
            body: 'Payment for this booking has been captured.',
            booking_id: id,
            deep_link: bookingDeepLinkPro(id),
          });
        }
      }
    } catch (captureErr) {
      console.error('Complete: Payment capture failed', captureErr);
      return NextResponse.json({
        error: 'Payment capture failed. The booking is marked complete but payment could not be processed. Customer may need to add a payment method.',
        booking: {
          id: updated.id,
          status: 'completed_pending_payment',
          completed_at: updated.completed_at,
        },
      }, { status: 207 });
    }
  } else if (!piId) {
    return NextResponse.json({
      error: 'No payment authorization found. Booking marked complete but payment could not be captured.',
      booking: {
        id: updated.id,
        status: 'completed_pending_payment',
        completed_at: updated.completed_at,
      },
    }, { status: 207 });
  }

  const { data: final } = await admin
    .from('bookings')
    .select('id, status, status_history, completed_at, paid_at')
    .eq('id', id)
    .single();

  return NextResponse.json({
    booking: {
      id: final?.id ?? updated.id,
      status: final?.status ?? updated.status,
      status_history: final?.status_history ?? updated.status_history,
      completed_at: final?.completed_at ?? updated.completed_at,
      paid_at: final?.paid_at ?? null,
    },
  }, { status: 200 });
}
