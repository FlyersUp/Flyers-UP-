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

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
    .select('id, customer_id, status, service_date, service_time, paid_deposit_at, paid_remaining_at, amount_deposit, amount_remaining, total_amount_cents')
    .eq('id', id)
    .eq('customer_id', user.id)
    .maybeSingle();

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  const status = String(booking.status);
  if (['cancelled', 'declined'].includes(status)) {
    return NextResponse.json({ error: 'Booking already cancelled' }, { status: 409 });
  }
  if (['completed', 'awaiting_customer_confirmation', 'paid', 'fully_paid'].includes(status)) {
    return NextResponse.json({ error: 'Cannot cancel completed booking' }, { status: 409 });
  }

  const depositAmountCents = Number(booking.amount_deposit ?? 0) || 0;
  const depositPaidCents = booking.paid_deposit_at ? depositAmountCents : 0;
  const remainingPaidCents = booking.paid_remaining_at ? Number(booking.amount_remaining ?? 0) : 0;

  const scheduledStart = new Date(`${booking.service_date}T${booking.service_time || '12:00'}`);
  const now = new Date();

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
  });

  return NextResponse.json({
    refundType: decision.refundType,
    refundAmountCents: decision.refundAmountCents,
    explanation: decision.explanation,
    manualReviewRequired: decision.manualReviewRequired,
  });
}
