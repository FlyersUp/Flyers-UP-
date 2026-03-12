/**
 * POST /api/bookings/[bookingId]/cancel
 * Cancel a booking with policy engine evaluation.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import {
  evaluateCancellationPolicy,
  mapDbStatusToBookingStage,
  CANCELLATION_POLICY_VERSION,
  type CanceledBy,
  type CancellationReasonCode,
} from '@/lib/operations/cancellationPolicy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;
  const id = normalizeUuidOrNull(bookingId);
  if (!id) return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });

  let body: { reason_code?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const reasonCode = (body.reason_code ?? 'other') as CancellationReasonCode;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminSupabaseClient();
  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select(
      'id, status, customer_id, pro_id, service_date, service_time, paid_deposit_at, paid_remaining_at, amount_deposit, amount_remaining, total_amount_cents, refunded_total_cents'
    )
    .eq('id', id)
    .maybeSingle();

  if (bErr || !booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  const status = String(booking.status);
  if (['cancelled', 'declined'].includes(status)) {
    return NextResponse.json({ error: 'Booking already canceled' }, { status: 409 });
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const role = profile?.role ?? 'customer';

  let canceledBy: CanceledBy = 'customer';
  if (role === 'admin') canceledBy = 'admin';
  else if (role === 'pro') {
    const { data: pro } = await supabase.from('service_pros').select('id').eq('user_id', user.id).maybeSingle();
    if (pro?.id === booking.pro_id) canceledBy = 'pro';
  }

  if (canceledBy === 'customer' && booking.customer_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (canceledBy === 'pro') {
    const { data: pro } = await supabase.from('service_pros').select('id').eq('user_id', user.id).maybeSingle();
    if (pro?.id !== booking.pro_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const scheduledStart = new Date(`${booking.service_date}T${booking.service_time || '12:00'}`);
  const now = new Date();

  const depositAmountCents = Number(booking.amount_deposit ?? 0) || 0;
  const remainingAmountCents = Number(booking.amount_remaining ?? 0) || 0;
  const depositPaidCents = booking.paid_deposit_at ? depositAmountCents : 0;
  const remainingPaidCents = booking.paid_remaining_at ? remainingAmountCents : 0;

  const decision = evaluateCancellationPolicy({
    canceledBy,
    bookingStage: mapDbStatusToBookingStage(status),
    scheduledStartAt: scheduledStart,
    canceledAt: now,
    reasonCode,
    hasEvidence: false,
    depositPaidCents,
    remainingPaidCents,
    depositAmountCents,
  });

  const { error: updErr } = await admin
    .from('bookings')
    .update({
      status: 'cancelled',
      cancelled_at: now.toISOString(),
      cancellation_policy_version: CANCELLATION_POLICY_VERSION,
      cancellation_reason_code: reasonCode,
      canceled_by_user_id: user.id,
      canceled_at: now.toISOString(),
      refund_type: decision.refundType,
      refund_amount_cents: decision.refundAmountCents,
      policy_decision_snapshot: {
        ruleFired: decision.ruleFired,
        refundType: decision.refundType,
        refundAmountCents: decision.refundAmountCents,
        strikePro: decision.strikePro,
        manualReviewRequired: decision.manualReviewRequired,
      },
      policy_explanation: decision.explanation,
      strike_applied: decision.strikePro,
      manual_review_required: decision.manualReviewRequired,
      status_history: [
        ...((booking as { status_history?: unknown[] }).status_history ?? []),
        { status: 'cancelled', at: now.toISOString(), policy: decision.ruleFired },
      ],
    })
    .eq('id', id);

  if (updErr) {
    console.error('Cancel update failed', updErr);
    return NextResponse.json({ error: 'Failed to cancel' }, { status: 500 });
  }

  if (decision.strikePro && booking.pro_id) {
    const { data: pro } = await admin
      .from('service_pros')
      .select('user_id')
      .eq('id', booking.pro_id)
      .maybeSingle();
    if (pro?.user_id) {
      const { data: existing } = await admin
        .from('pro_safety_compliance_settings')
        .select('strike_count')
        .eq('pro_user_id', pro.user_id)
        .maybeSingle();
      const newCount = ((existing as { strike_count?: number })?.strike_count ?? 0) + 1;
      const payload = { strike_count: newCount, updated_at: now.toISOString() };
      if (existing) {
        await admin.from('pro_safety_compliance_settings').update(payload).eq('pro_user_id', pro.user_id);
      } else {
        await admin.from('pro_safety_compliance_settings').insert({
          pro_user_id: pro.user_id,
          guidelines_acknowledged: false,
          strike_count: newCount,
          updated_at: now.toISOString(),
          created_at: now.toISOString(),
        });
      }
    }
  }

  await admin.from('booking_events').insert({
    booking_id: id,
    type: 'BOOKING_CANCELLED',
    data: {
      canceled_by: canceledBy,
      reason_code: reasonCode,
      refund_type: decision.refundType,
      refund_amount_cents: decision.refundAmountCents,
      policy_explanation: decision.explanation,
    },
  });

  return NextResponse.json({
    ok: true,
    refundType: decision.refundType,
    refundAmountCents: decision.refundAmountCents,
    explanation: decision.explanation,
    manualReviewRequired: decision.manualReviewRequired,
  });
}
