/**
 * GET /api/customer/bookings/[bookingId]/cancel-preview
 * Returns expected refund impact for cancellation without actually cancelling.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import {
  evaluateCancellationPolicy,
  mapDbStatusToBookingStage,
  type CancellationReasonCode,
} from '@/lib/operations/cancellationPolicy';
import {
  isCustomerCancelDuringPostCompletionReviewWindow,
  type BookingRowForReviewCancel,
} from '@/lib/bookings/post-completion-review-cancel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CancelPreviewBookingRow = {
  id: string;
  customer_id: string;
  status: string;
  service_date: string;
  service_time: string | null;
  paid_deposit_at: string | null;
  paid_remaining_at: string | null;
  amount_deposit: number | null;
  amount_remaining: number | null;
  deposit_amount_cents?: number | null;
  total_amount_cents?: number | null;
  payment_lifecycle_status?: string | null;
  customer_review_deadline_at?: string | null;
  service_status?: string | null;
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;
  const id = normalizeUuidOrNull(bookingId);
  if (!id) return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });

  const url = new URL(req.url);
  const reasonCode = (url.searchParams.get('reason') ?? 'other') as CancellationReasonCode;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminSupabaseClient();
  const { data: booking } = await admin
    .from('bookings')
    .select(
      [
        'id',
        'customer_id',
        'status',
        'service_date',
        'service_time',
        'paid_deposit_at',
        'paid_remaining_at',
        'amount_deposit',
        'amount_remaining',
        'deposit_amount_cents',
        'total_amount_cents',
        'payment_lifecycle_status',
        'customer_review_deadline_at',
        'service_status',
      ].join(', ')
    )
    .eq('id', id)
    .eq('customer_id', user.id)
    .maybeSingle();

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  const b = booking as unknown as CancelPreviewBookingRow;
  const status = String(b.status);
  if (['cancelled', 'declined'].includes(status)) {
    return NextResponse.json({ error: 'Booking already cancelled' }, { status: 409 });
  }

  const depositAmountCents =
    Number((b as { deposit_amount_cents?: number }).deposit_amount_cents ?? b.amount_deposit ?? 0) || 0;
  const depositPaidCents = b.paid_deposit_at ? depositAmountCents : 0;
  const remainingPaidCents = b.paid_remaining_at ? Number(b.amount_remaining ?? 0) : 0;

  const scheduledStart = new Date(`${b.service_date}T${b.service_time || '12:00'}`);
  const now = new Date();

  const reviewRow = b as unknown as BookingRowForReviewCancel;
  if (isCustomerCancelDuringPostCompletionReviewWindow(reviewRow)) {
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
    return NextResponse.json({
      refundType: decision.refundType,
      refundAmountCents: decision.refundAmountCents,
      explanation: decision.explanation,
      manualReviewRequired: decision.manualReviewRequired,
      context: 'post_completion_review_window',
    });
  }

  if (['completed', 'awaiting_customer_confirmation', 'paid', 'fully_paid'].includes(status)) {
    return NextResponse.json({ error: 'Cannot cancel completed booking' }, { status: 409 });
  }

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
    customerReviewDeadlineAt: (b as { customer_review_deadline_at?: string | null })
      .customer_review_deadline_at
      ? new Date(String((b as { customer_review_deadline_at?: string | null }).customer_review_deadline_at))
      : null,
  });

  return NextResponse.json({
    refundType: decision.refundType,
    refundAmountCents: decision.refundAmountCents,
    explanation: decision.explanation,
    manualReviewRequired: decision.manualReviewRequired,
  });
}
