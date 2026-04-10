/**
 * Customer Booking Details Page (Track Booking)
 *
 * Server tries to fetch; if null (session/cookie edge case), client fetches from API
 * (client fetch includes cookies). This ensures View details works when server
 * doesn't receive session.
 */
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { CustomerBookingPageClient } from './CustomerBookingPageClient';
import { mapRescheduleRowToPending } from '@/lib/bookings/pending-reschedule';
import {
  computeCustomerRemainingDueCents,
  resolveTotalBookingCentsFromRow,
  type BookingMoneySnapshot,
} from '@/lib/bookings/remaining-balance-cents';
import { getUnifiedBookingPaymentAmountsForBooking } from '@/lib/bookings/booking-receipt-service';
import { resolveFinalPaymentIntentStripeSnapshotForCustomerUi } from '@/lib/stripe/verify-final-payment-intent-status';

async function getCustomerBooking(bookingId: string) {
  const id = normalizeUuidOrNull(bookingId);
  if (!id) return null;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'unauthorized' as const };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) return { error: 'forbidden' as const };

  const role = profile.role ?? 'customer';
  const admin = createAdminSupabaseClient();

  let bookingQuery = admin
    .from('bookings')
    .select(
      'id, customer_id, pro_id, payment_status, paid_at, final_payment_status, fully_paid_at, payment_due_at, remaining_due_at, auto_confirm_at, paid_deposit_at, paid_remaining_at, payout_status, refund_status, customer_fees_retained_cents, refunded_total_cents, total_amount_cents, amount_subtotal, amount_deposit, amount_remaining, amount_total, service_date, service_time, booking_timezone, address, notes, status, price, created_at, accepted_at, en_route_at, on_the_way_at, arrived_at, started_at, completed_at, cancelled_at, status_history, job_request_id, scope_confirmed_at, no_show_eligible_at, scheduled_start_at, grace_period_minutes, customer_confirmed, confirmed_by_customer_at, payment_lifecycle_status, customer_review_deadline_at, payout_released, requires_admin_review, payout_hold_reason, suspicious_completion, suspicious_completion_reason, admin_hold, final_payment_intent_id, stripe_payment_intent_remaining_id'
    )
    .eq('id', id);

  if (role === 'pro') {
    const { data: proRow } = await admin
      .from('service_pros')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!proRow?.id) return { error: 'forbidden' as const };
    bookingQuery = bookingQuery.or(`customer_id.eq.${user.id},pro_id.eq.${proRow.id}`);
  } else {
    bookingQuery = bookingQuery.eq('customer_id', user.id);
  }

  const { data: booking, error } = await bookingQuery.maybeSingle();

  if (error) {
    console.error('[getCustomerBooking] Supabase error:', error.message, { bookingId: id });
    return null;
  }
  if (!booking) return null;

  const { data: pendRow } = await admin
    .from('reschedule_requests')
    .select(
      'id, proposed_service_date, proposed_service_time, proposed_start_at, requested_by_role, message, expires_at'
    )
    .eq('booking_id', id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: arrival } = await admin
    .from('job_arrivals')
    .select('arrival_timestamp, arrival_photo_url, location_verified')
    .eq('booking_id', id)
    .maybeSingle();

  const { data: completion } = await admin
    .from('job_completions')
    .select('id, after_photo_urls, completion_note, completed_at')
    .eq('booking_id', id)
    .maybeSingle();

  const { data: customerReviewRow } = await admin
    .from('booking_reviews')
    .select('id')
    .eq('booking_id', id)
    .maybeSingle();

  const b = booking as {
    payment_status?: string;
    paid_at?: string | null;
    paid_deposit_at?: string | null;
    paid_remaining_at?: string | null;
    final_payment_status?: string;
    fully_paid_at?: string | null;
    payment_due_at?: string | null;
    remaining_due_at?: string | null;
    auto_confirm_at?: string | null;
    payout_status?: string | null;
    refund_status?: string | null;
    customer_fees_retained_cents?: number | null;
    refunded_total_cents?: number | null;
    amount_deposit?: number | null;
    amount_remaining?: number | null;
    amount_total?: number | null;
    total_amount_cents?: number | null;
    en_route_at?: string | null;
    on_the_way_at?: string | null;
    cancelled_at?: string | null;
    customer_confirmed?: boolean | null;
    confirmed_by_customer_at?: string | null;
    payment_lifecycle_status?: string | null;
    customer_review_deadline_at?: string | null;
    payout_released?: boolean | null;
    requires_admin_review?: boolean | null;
    payout_hold_reason?: string | null;
    suspicious_completion?: boolean | null;
    suspicious_completion_reason?: string | null;
    admin_hold?: boolean | null;
    final_payment_intent_id?: string | null;
    stripe_payment_intent_remaining_id?: string | null;
  };

  const remainingMoney: BookingMoneySnapshot = {
    total_amount_cents: b.total_amount_cents,
    amount_total: b.amount_total,
    amount_deposit: b.amount_deposit,
    amount_remaining: b.amount_remaining,
    price: booking.price as number | null | undefined,
    payment_status: b.payment_status,
    final_payment_status: b.final_payment_status,
    paid_deposit_at: b.paid_deposit_at,
    paid_remaining_at: b.paid_remaining_at,
    fully_paid_at: b.fully_paid_at,
    status: String(booking.status ?? ''),
  };
  const fallbackTotal = resolveTotalBookingCentsFromRow(remainingMoney);
  const fallbackRemaining = computeCustomerRemainingDueCents(remainingMoney);
  const unifiedAmounts = await getUnifiedBookingPaymentAmountsForBooking(admin, id);
  const paymentAmounts =
    unifiedAmounts ?? {
      totalAmountCents: fallbackTotal,
      paidAmountCents: Math.max(0, fallbackTotal - fallbackRemaining),
      remainingAmountCents: fallbackRemaining,
    };

  // Fetch pro info separately (avoids join failures; same pattern as list API)
  let serviceName = 'Service';
  let proName = 'Pro';
  let categoryName: string | undefined;
  let proPhotoUrl: string | null = null;
  let proUserId: string | null = null;

  if (booking.pro_id) {
    const { data: pro } = await admin
      .from('service_pros')
      .select('display_name, logo_url, category_id, user_id')
      .eq('id', booking.pro_id)
      .maybeSingle();
    if (pro) {
      proName = (pro as { display_name?: string }).display_name?.trim() || 'Pro';
      proPhotoUrl = (pro as { logo_url?: string | null }).logo_url ?? null;
      proUserId = (pro as { user_id?: string }).user_id ?? null;
      const catId = (pro as { category_id?: string }).category_id;
      if (catId) {
        const { data: cat } = await admin
          .from('service_categories')
          .select('name')
          .eq('id', catId)
          .maybeSingle();
        if (cat) {
          serviceName = (cat as { name?: string }).name || 'Service';
          categoryName = (cat as { name?: string }).name;
        }
      }
    }
  }

  const finalPaymentIntentId =
    (typeof b.final_payment_intent_id === 'string' && b.final_payment_intent_id.trim()) ||
    (typeof b.stripe_payment_intent_remaining_id === 'string' && b.stripe_payment_intent_remaining_id.trim()) ||
    null;

  const stripeSnapshot = await resolveFinalPaymentIntentStripeSnapshotForCustomerUi({
    paymentLifecycleStatus: b.payment_lifecycle_status ?? null,
    finalPaymentIntentId,
  });

  return {
    id: booking.id,
    customerId: booking.customer_id,
    proId: booking.pro_id,
    proUserId,
    serviceDate: booking.service_date,
    serviceTime: booking.service_time,
    bookingTimezone: (booking as { booking_timezone?: string | null }).booking_timezone ?? null,
    address: booking.address ?? undefined,
    notes: booking.notes ?? undefined,
    status: booking.status,
    paymentStatus: b.payment_status ?? 'UNPAID',
    paidAt: b.paid_at ?? null,
    finalPaymentStatus: b.final_payment_status ?? null,
    fullyPaidAt: b.fully_paid_at ?? null,
    paymentDueAt: b.payment_due_at ?? null,
    remainingDueAt: b.remaining_due_at ?? null,
    autoConfirmAt: b.auto_confirm_at ?? null,
    paidDepositAt: b.paid_deposit_at ?? null,
    paidRemainingAt: b.paid_remaining_at ?? null,
    payoutStatus: b.payout_status ?? null,
    refundStatus: b.refund_status ?? null,
    platformFeeCents: b.customer_fees_retained_cents ?? null,
    refundedTotalCents: b.refunded_total_cents ?? null,
    amountDeposit: b.amount_deposit ?? null,
    amountRemaining: paymentAmounts.remainingAmountCents,
    amountTotal:
      paymentAmounts.totalAmountCents > 0
        ? paymentAmounts.totalAmountCents
        : (b.total_amount_cents ?? b.amount_total ?? null),
    paidAmountCents: paymentAmounts.paidAmountCents,
    amountSubtotalCents: (booking as { amount_subtotal?: number | null }).amount_subtotal ?? null,
    price: booking.price ?? undefined,
    createdAt: booking.created_at,
    acceptedAt: booking.accepted_at ?? null,
    onTheWayAt: b.en_route_at ?? booking.on_the_way_at ?? null,
    arrivedAt: (booking as { arrived_at?: string | null }).arrived_at ?? null,
    startedAt: booking.started_at ?? null,
    completedAt: booking.completed_at ?? null,
    cancelledAt: b.cancelled_at ?? null,
    statusHistory: (booking.status_history as { status: string; at: string }[]) ?? undefined,
    serviceName,
    proName,
    categoryName,
    proPhotoUrl,
    job_request_id: (booking as { job_request_id?: string | null }).job_request_id ?? null,
    scope_confirmed_at: (booking as { scope_confirmed_at?: string | null }).scope_confirmed_at ?? null,
    arrival: arrival
      ? {
          arrivalTimestamp: arrival.arrival_timestamp,
          arrivalPhotoUrl: arrival.arrival_photo_url,
          locationVerified: arrival.location_verified,
        }
      : null,
    completion: completion
      ? {
          id: completion.id,
          afterPhotoUrls: (completion.after_photo_urls ?? []) as string[],
          completionNote: completion.completion_note,
          completedAt: completion.completed_at,
        }
      : null,
    noShowEligibleAt: (booking as { no_show_eligible_at?: string | null }).no_show_eligible_at ?? null,
    scheduledStartAt: (booking as { scheduled_start_at?: string | null }).scheduled_start_at ?? null,
    gracePeriodMinutes: (booking as { grace_period_minutes?: number | null }).grace_period_minutes ?? 60,
    pendingReschedule: mapRescheduleRowToPending(pendRow as Record<string, unknown> | null),
    hasCustomerReview: Boolean(customerReviewRow),
    customerConfirmed: b.customer_confirmed === true,
    confirmedByCustomerAt: b.confirmed_by_customer_at ?? null,
    paymentLifecycleStatus: b.payment_lifecycle_status ?? null,
    customerReviewDeadlineAt: b.customer_review_deadline_at ?? null,
    payoutReleased: b.payout_released === true,
    requiresAdminReview: b.requires_admin_review === true,
    payoutHoldReason: b.payout_hold_reason ?? null,
    suspiciousCompletion: b.suspicious_completion === true,
    suspiciousCompletionReason: b.suspicious_completion_reason ?? null,
    adminHold: b.admin_hold === true,
    finalPaymentIntentId,
    ...stripeSnapshot,
  };
}

export const dynamic = 'force-dynamic';

export default async function CustomerBookingDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const result = await getCustomerBooking(bookingId);

  const serverBooking = result && !('error' in result) ? result : null;
  const serverError =
    result && 'error' in result
      ? (result.error === 'unauthorized' ? 'unauthorized' : 'forbidden')
      : null;

  return (
    <CustomerBookingPageClient
      bookingId={bookingId}
      serverBooking={serverBooking}
      serverError={serverError}
    />
  );
}
