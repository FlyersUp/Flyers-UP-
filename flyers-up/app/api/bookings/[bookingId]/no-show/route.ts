/**
 * POST /api/bookings/[bookingId]/no-show
 * Pro marks customer no-show. Requires: 1 in-app message + 1 call attempt logged
 * and wait timer expired.
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

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: proRow } = await supabase
    .from('service_pros')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!proRow?.id) return NextResponse.json({ error: 'Pro not found' }, { status: 403 });

  const admin = createAdminSupabaseClient();
  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select(
      'id, status, customer_id, pro_id, service_date, service_time, paid_deposit_at, paid_remaining_at, amount_deposit, amount_remaining, wait_timer_expires_at, evidence_bundle_id'
    )
    .eq('id', id)
    .eq('pro_id', proRow.id)
    .maybeSingle();

  if (bErr || !booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  const status = String(booking.status);
  if (!['arrived', 'pro_en_route', 'on_the_way'].includes(status)) {
    return NextResponse.json(
      { error: 'No-show can only be marked when Pro has arrived and customer is absent' },
      { status: 409 }
    );
  }

  const waitExpires = booking.wait_timer_expires_at ? new Date(booking.wait_timer_expires_at) : null;
  if (!waitExpires || waitExpires > new Date()) {
    return NextResponse.json(
      { error: 'Wait grace period has not expired yet. Please wait at least 15 minutes after arrival.' },
      { status: 409 }
    );
  }

  const { data: contactAttempts } = await admin
    .from('contact_attempts')
    .select('attempt_type, created_at')
    .eq('booking_id', id)
    .eq('initiated_by', user.id);

  const hasMessage = contactAttempts?.some((a) => a.attempt_type === 'in_app_message') ?? false;
  const hasCall = contactAttempts?.some((a) => a.attempt_type === 'call') ?? false;

  if (!hasMessage || !hasCall) {
    return NextResponse.json(
      {
        error: 'At least one in-app message and one call attempt required before marking no-show',
        hasMessage,
        hasCall,
      },
      { status: 409 }
    );
  }

  const scheduledStart = new Date(`${booking.service_date}T${booking.service_time || '12:00'}`);
  const now = new Date();
  const depositAmountCents = Number(booking.amount_deposit ?? 0) || 0;
  const depositPaidCents = booking.paid_deposit_at ? depositAmountCents : 0;
  const remainingPaidCents = booking.paid_remaining_at ? Number(booking.amount_remaining ?? 0) : 0;

  const decision = evaluateCancellationPolicy({
    canceledBy: 'pro' as CanceledBy,
    bookingStage: mapDbStatusToBookingStage(status),
    scheduledStartAt: scheduledStart,
    canceledAt: now,
    reasonCode: 'no_show_customer' as CancellationReasonCode,
    hasEvidence: true,
    depositPaidCents,
    remainingPaidCents,
    depositAmountCents,
  });

  const { data: existingBundle } = booking.evidence_bundle_id
    ? await admin.from('evidence_bundles').select('id, chat_attempts, call_attempts').eq('id', booking.evidence_bundle_id).maybeSingle()
    : { data: null };

  const attempts = contactAttempts ?? [];
  const chatAttempts = attempts
    .filter((a) => a.attempt_type === 'in_app_message')
    .map((a) => ({ type: 'in_app_message' as const, at: (a as { created_at?: string }).created_at ?? now.toISOString() }));
  const callAttempts = attempts
    .filter((a) => a.attempt_type === 'call')
    .map((a) => ({ type: 'call' as const, at: (a as { created_at?: string }).created_at ?? now.toISOString() }));

  let bundleId = booking.evidence_bundle_id;
  if (!bundleId) {
    const { data: newBundle } = await admin
      .from('evidence_bundles')
      .insert({
        booking_id: id,
        bundle_type: 'no_show',
        chat_attempts: chatAttempts,
        call_attempts: callAttempts,
        completeness_score: 80,
        status_changes: [{ status: 'customer_no_show', at: now.toISOString() }],
      })
      .select('id')
      .single();
    bundleId = newBundle?.id;
  } else {
    await admin
      .from('evidence_bundles')
      .update({
        chat_attempts: chatAttempts,
        call_attempts: callAttempts,
        completeness_score: 80,
        updated_at: now.toISOString(),
      })
      .eq('id', bundleId);
  }

  const { error: updErr } = await admin
    .from('bookings')
    .update({
      status: 'cancelled',
      cancelled_at: now.toISOString(),
      cancellation_policy_version: CANCELLATION_POLICY_VERSION,
      cancellation_reason_code: 'no_show_customer',
      canceled_by_user_id: user.id,
      canceled_at: now.toISOString(),
      no_show_status: 'customer_no_show',
      refund_type: decision.refundType,
      refund_amount_cents: decision.refundAmountCents,
      policy_decision_snapshot: {
        ruleFired: decision.ruleFired,
        refundType: decision.refundType,
        strikePro: decision.strikePro,
        manualReviewRequired: decision.manualReviewRequired,
      },
      policy_explanation: decision.explanation,
      strike_applied: decision.strikePro,
      manual_review_required: decision.manualReviewRequired,
      evidence_bundle_id: bundleId,
    })
    .eq('id', id);

  if (updErr) {
    console.error('No-show cancel update failed', updErr);
    return NextResponse.json({ error: 'Failed to cancel' }, { status: 500 });
  }

  if (decision.strikePro && booking.pro_id) {
    const { data: pro } = await admin.from('service_pros').select('user_id').eq('id', booking.pro_id).maybeSingle();
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
      reason: 'no_show_customer',
      refund_type: decision.refundType,
      policy_explanation: decision.explanation,
    },
  });

  return NextResponse.json({
    ok: true,
    refundType: decision.refundType,
    explanation: decision.explanation,
  });
}
