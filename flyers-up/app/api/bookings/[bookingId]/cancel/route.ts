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
import {
  isCustomerCancelDuringPostCompletionReviewWindow,
  maybeRefundDepositAfterReviewWindowCancel,
  persistCustomerCancelDuringPostCompletionReview,
  type BookingRowForReviewCancel,
} from '@/lib/bookings/post-completion-review-cancel';
import {
  coalesceBookingDepositPaymentIntentId,
  type BookingFinalPaymentIntentIdRow,
} from '@/lib/bookings/money-state';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Row shape for `.select(...).maybeSingle()` — explicit so `data` is not inferred as `GenericStringError`. */
type CancelBookingQueryRow = {
  id: string;
  status: string;
  customer_id: string;
  pro_id: string | null;
  service_date: string;
  service_time: string | null;
  paid_deposit_at: string | null;
  paid_remaining_at: string | null;
  amount_deposit: number | null;
  amount_remaining: number | null;
  deposit_amount_cents?: number | null;
  total_amount_cents?: number | null;
  refunded_total_cents?: number | null;
  payment_lifecycle_status?: string | null;
  customer_review_deadline_at?: string | null;
  service_status?: string | null;
  stripe_payment_intent_deposit_id?: string | null;
  deposit_payment_intent_id?: string | null;
  payment_intent_id?: string | null;
  final_payment_intent_id?: string | null;
  stripe_payment_intent_remaining_id?: string | null;
  payout_released?: boolean | null;
  status_history?: unknown;
};

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
      [
        'id',
        'status',
        'customer_id',
        'pro_id',
        'service_date',
        'service_time',
        'paid_deposit_at',
        'paid_remaining_at',
        'amount_deposit',
        'amount_remaining',
        'deposit_amount_cents',
        'total_amount_cents',
        'refunded_total_cents',
        'payment_lifecycle_status',
        'customer_review_deadline_at',
        'service_status',
        'stripe_payment_intent_deposit_id',
        'deposit_payment_intent_id',
        'payment_intent_id',
        'final_payment_intent_id',
        'stripe_payment_intent_remaining_id',
        'payout_released',
        'status_history',
      ].join(', ')
    )
    .eq('id', id)
    .maybeSingle();

  if (bErr || !booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  const b = booking as unknown as CancelBookingQueryRow;
  const status = String(b.status);
  if (['cancelled', 'declined'].includes(status)) {
    return NextResponse.json({ error: 'Booking already canceled' }, { status: 409 });
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const role = profile?.role ?? 'customer';

  let canceledBy: CanceledBy = 'customer';
  if (role === 'admin') canceledBy = 'admin';
  else if (role === 'pro') {
    const { data: pro } = await supabase.from('service_pros').select('id').eq('user_id', user.id).maybeSingle();
    if (pro?.id === b.pro_id) canceledBy = 'pro';
  }

  if (canceledBy === 'customer' && b.customer_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (canceledBy === 'pro') {
    const { data: pro } = await supabase.from('service_pros').select('id').eq('user_id', user.id).maybeSingle();
    if (pro?.id !== b.pro_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const scheduledStart = new Date(`${b.service_date}T${b.service_time || '12:00'}`);
  const now = new Date();

  const depositAmountCents =
    Number((b as { deposit_amount_cents?: number }).deposit_amount_cents ?? b.amount_deposit ?? 0) || 0;
  const remainingAmountCents = Number(b.amount_remaining ?? 0) || 0;
  const depositPaidCents = b.paid_deposit_at ? depositAmountCents : 0;
  const remainingPaidCents = b.paid_remaining_at ? remainingAmountCents : 0;

  const reviewRow = b as unknown as BookingRowForReviewCancel;
  if (canceledBy === 'customer' && isCustomerCancelDuringPostCompletionReviewWindow(reviewRow)) {
    const decision = evaluateCancellationPolicy({
      canceledBy: 'customer',
      bookingStage: mapDbStatusToBookingStage(status),
      scheduledStartAt: scheduledStart,
      canceledAt: now,
      reasonCode,
      hasEvidence: false,
      depositPaidCents,
      remainingPaidCents,
      depositAmountCents,
      customerReviewDeadlineAt: reviewRow.customer_review_deadline_at
        ? new Date(String(reviewRow.customer_review_deadline_at))
        : null,
    });

    const persisted = await persistCustomerCancelDuringPostCompletionReview(admin, {
      booking: reviewRow,
      customerUserId: user.id,
      reasonCode,
      decision,
    });
    if (!persisted.ok) {
      return NextResponse.json({ error: persisted.error }, { status: 500 });
    }

    const depositPi = coalesceBookingDepositPaymentIntentId(b as BookingFinalPaymentIntentIdRow);

    const refundOut = await maybeRefundDepositAfterReviewWindowCancel(admin, {
      bookingId: id,
      decision,
      depositPaymentIntentId: depositPi,
      depositPaidCents,
      payoutReleased: (b as { payout_released?: boolean }).payout_released === true,
    });

    if (decision.strikePro && b.pro_id) {
      const { data: pro } = await admin
        .from('service_pros')
        .select('user_id')
        .eq('id', b.pro_id)
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
        context: 'post_completion_review_window',
        stripe_refund_id: refundOut.refundId,
      },
    });

    return NextResponse.json({
      ok: true,
      refundType: decision.refundType,
      refundAmountCents: decision.refundAmountCents,
      explanation: decision.explanation,
      manualReviewRequired: decision.manualReviewRequired,
      stripeRefundId: refundOut.refundId,
      refundError: refundOut.error,
    });
  }

  // Block cancel for completed/final states — use dispute flow instead
  const terminalStatuses = ['completed', 'awaiting_customer_confirmation', 'paid', 'fully_paid'];
  if (terminalStatuses.includes(status)) {
    return NextResponse.json(
      { error: 'Booking is completed. For refunds or disputes, please contact support.' },
      { status: 409 }
    );
  }

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
    customerReviewDeadlineAt: (b as { customer_review_deadline_at?: string | null })
      .customer_review_deadline_at
      ? new Date(String((b as { customer_review_deadline_at?: string | null }).customer_review_deadline_at))
      : null,
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
        ...((b as { status_history?: unknown[] }).status_history ?? []),
        { status: 'cancelled', at: now.toISOString(), policy: decision.ruleFired },
      ],
    })
    .eq('id', id);

  if (updErr) {
    console.error('Cancel update failed', updErr);
    return NextResponse.json({ error: 'Failed to cancel' }, { status: 500 });
  }

  if (decision.strikePro && b.pro_id) {
    const { data: pro } = await admin
      .from('service_pros')
      .select('user_id')
      .eq('id', b.pro_id)
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
