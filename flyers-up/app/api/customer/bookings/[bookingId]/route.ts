/**
 * GET /api/customer/bookings/[bookingId]
 * Fetch a single booking for the authenticated customer or assigned pro.
 * Customers: must be the booking's customer. Pros: must be the assigned pro.
 * Returns fields needed for Track Booking page: status, timestamps, pro info, service info.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { mapRescheduleRowToPending } from '@/lib/bookings/pending-reschedule';
import {
  computeCustomerRemainingDueCents,
  resolveTotalBookingCentsFromRow,
  type BookingMoneySnapshot,
} from '@/lib/bookings/remaining-balance-cents';
import { getUnifiedBookingPaymentAmountsForBooking } from '@/lib/bookings/booking-receipt-service';
import type { CustomerRemainingPaymentUiInput } from '@/lib/bookings/customer-remaining-payment-ui';
import { getBookingFinalPaymentIntentIdOrNull } from '@/lib/bookings/money-state';
import { resolveFinalPaymentIntentStripeSnapshotForCustomerUi } from '@/lib/stripe/verify-final-payment-intent-status';

export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const id = normalizeUuidOrNull(bookingId);
    if (!id) {
      return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });
    }

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

    if (!profile) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Treat null/undefined role as customer (incomplete onboarding); ownership enforced by customer_id filter
    const role = profile.role ?? 'customer';

    const admin = createAdminSupabaseClient();

    // Minimal columns (base schema + 002) - always exist
    const MINIMAL_COLUMNS =
      'id, customer_id, pro_id, service_date, service_time, address, notes, status, price, created_at, status_history';
    // Core columns (migrations 028-032) - usually exist
    const CORE_COLUMNS =
      'id, customer_id, pro_id, service_date, service_time, address, notes, status, price, created_at, accepted_at, on_the_way_at, started_at, completed_at, cancelled_at, status_history';
    // Extended columns (migrations 031+) - may not exist if migrations not applied
    const EXTENDED_COLUMNS =
      ', payment_status, paid_at, final_payment_status, fully_paid_at, payment_due_at, remaining_due_at, auto_confirm_at, paid_deposit_at, paid_remaining_at, payout_status, refund_status, customer_fees_retained_cents, refunded_total_cents, amount_paid_cents, refund_after_payout, total_amount_cents, amount_subtotal, amount_deposit, amount_remaining, amount_total, booking_timezone, en_route_at, arrived_at, job_request_id, scope_confirmed_at, job_details_snapshot, photos_snapshot, no_show_eligible_at, scheduled_start_at, grace_period_minutes, customer_confirmed, confirmed_by_customer_at, payment_lifecycle_status, customer_review_deadline_at, payout_released, payout_transfer_id, requires_admin_review, payout_hold_reason, suspicious_completion, suspicious_completion_reason, admin_hold, final_payment_intent_id, stripe_payment_intent_remaining_id, payment_intent_id, stripe_payment_intent_deposit_id, deposit_payment_intent_id, charge_model, hourly_selected, flat_fee_selected, duration_hours, hourly_rate_cents, minimum_job_cents, flat_fee_cents, base_fee_cents, included_hours, overage_hourly_rate_cents, actual_hours_estimate, app_review_demo';

    let proIdForQuery: string | null = null;
    if (role === 'pro') {
      const { data: proRow } = await admin
        .from('service_pros')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!proRow?.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      proIdForQuery = String(proRow.id);
    }

    const runBookingQuery = async (columns: string) => {
      let q = admin.from('bookings').select(columns).eq('id', id);
      if (role === 'customer') {
        q = q.eq('customer_id', user.id);
      } else if (role === 'pro' && proIdForQuery) {
        // Pro may view jobs they serve OR bookings they made as a customer (another pro's service).
        q = q.or(`customer_id.eq.${user.id},pro_id.eq.${proIdForQuery}`);
      }
      return q.maybeSingle();
    };

    let result = await runBookingQuery(CORE_COLUMNS + EXTENDED_COLUMNS);
    let booking = result.data as Record<string, unknown> | null;
    let error = result.error as { code?: string; message?: string } | null;

    // Fallback: if column doesn't exist, retry with fewer columns
    if (error) {
      const errMsg = error.message ?? '';
      const isColumnError = errMsg.includes('does not exist') || error.code === 'PGRST204';
      if (isColumnError) {
        result = await runBookingQuery(CORE_COLUMNS);
        booking = result.data as Record<string, unknown> | null;
        error = result.error as { code?: string; message?: string } | null;
        if (error && (error.message?.includes('does not exist') || error.code === 'PGRST204')) {
          result = await runBookingQuery(MINIMAL_COLUMNS);
          booking = result.data as Record<string, unknown> | null;
          error = result.error as { code?: string; message?: string } | null;
        }
      }
    }

    if (error) {
      const errObj = error;
      console.error('Error fetching booking:', {
        code: errObj.code,
        message: errObj.message,
        bookingId: id,
      });
      return NextResponse.json(
        {
          error: 'Failed to load booking',
          code: errObj.code,
          message: errObj.message,
        },
        { status: 500 }
      );
    }

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Fetch job arrival (for ArrivalVerificationCard)
    const { data: arrival } = await admin
      .from('job_arrivals')
      .select('arrival_timestamp, arrival_photo_url, location_verified')
      .eq('booking_id', id)
      .maybeSingle();

    // Fetch job completion (for JobCompletedFlyer)
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

    // Fetch pro info separately (same pattern as list API)
    let serviceName = 'Service';
    let proName = 'Pro';
    let categoryName: string | undefined;
    let serviceCategorySlug: string | undefined;
    let proPhotoUrl: string | null = null;
    let proUserId: string | null = null;
    let proMinHours: number | null = null;
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
        if (proUserId) {
          const { data: pp } = await admin
            .from('pro_profiles')
            .select('min_hours')
            .eq('user_id', proUserId)
            .maybeSingle();
          const mh = Number((pp as { min_hours?: number } | null)?.min_hours);
          if (Number.isFinite(mh) && mh > 0) proMinHours = mh;
        }
        const catId = (pro as { category_id?: string }).category_id;
        if (catId) {
          const { data: cat } = await admin
            .from('service_categories')
            .select('name, slug')
            .eq('id', catId)
            .maybeSingle();
          if (cat) {
            serviceName = (cat as { name?: string }).name || 'Service';
            categoryName = (cat as { name?: string }).name;
            serviceCategorySlug = (cat as { slug?: string }).slug ?? undefined;
          }
        }
      }
    }

    const b = booking as {
      payment_status?: string;
      paid_at?: string | null;
      final_payment_status?: string;
      fully_paid_at?: string | null;
      payment_due_at?: string | null;
      remaining_due_at?: string | null;
      auto_confirm_at?: string | null;
      paid_deposit_at?: string | null;
      paid_remaining_at?: string | null;
      payout_status?: string | null;
      refund_status?: string | null;
      customer_fees_retained_cents?: number | null;
      refunded_total_cents?: number | null;
      amount_paid_cents?: number | null;
      refund_after_payout?: boolean | null;
      total_amount_cents?: number | null;
      amount_deposit?: number | null;
      amount_remaining?: number | null;
      amount_total?: number | null;
      en_route_at?: string | null;
      on_the_way_at?: string | null;
      arrived_at?: string | null;
      completed_at?: string | null;
      cancelled_at?: string | null;
      customer_confirmed?: boolean | null;
      confirmed_by_customer_at?: string | null;
      payment_lifecycle_status?: string | null;
      customer_review_deadline_at?: string | null;
      booking_timezone?: string | null;
      payout_released?: boolean | null;
      payout_transfer_id?: string | null;
      requires_admin_review?: boolean | null;
      payout_hold_reason?: string | null;
      suspicious_completion?: boolean | null;
      suspicious_completion_reason?: string | null;
      admin_hold?: boolean | null;
      final_payment_intent_id?: string | null;
      stripe_payment_intent_remaining_id?: string | null;
      payment_intent_id?: string | null;
      stripe_payment_intent_deposit_id?: string | null;
      deposit_payment_intent_id?: string | null;
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

    const finalPaymentIntentId = getBookingFinalPaymentIntentIdOrNull(b);

    const deriveMoneyInput: CustomerRemainingPaymentUiInput = {
      status: String(booking.status ?? ''),
      paymentStatus: b.payment_status ?? null,
      finalPaymentStatus: b.final_payment_status ?? null,
      paymentLifecycleStatus: b.payment_lifecycle_status ?? null,
      paidDepositAt: b.paid_deposit_at ?? null,
      paidAt: b.paid_at ?? null,
      paidRemainingAt: b.paid_remaining_at ?? null,
      fullyPaidAt: b.fully_paid_at ?? null,
      completedAt: b.completed_at ?? null,
      remainingDueAt: b.remaining_due_at ?? null,
      customerReviewDeadlineAt: b.customer_review_deadline_at ?? null,
      amountRemaining: paymentAmounts.remainingAmountCents,
      finalPaymentIntentId,
      payoutReleased: b.payout_released === true,
      payoutTransferId: b.payout_transfer_id ?? null,
      refundedTotalCents: b.refunded_total_cents ?? null,
      amountPaidCents: b.amount_paid_cents ?? paymentAmounts.paidAmountCents,
      refundAfterPayout: b.refund_after_payout === true,
    };

    const stripeSnapshot = await resolveFinalPaymentIntentStripeSnapshotForCustomerUi({
      paymentLifecycleStatus: b.payment_lifecycle_status ?? null,
      finalPaymentIntentId,
      deriveMoneyInput,
    });

    return NextResponse.json(
      {
        booking: {
          id: booking.id,
          customerId: booking.customer_id,
          proId: booking.pro_id,
          proUserId,
          serviceDate: booking.service_date,
          serviceTime: booking.service_time,
          address: booking.address,
          notes: booking.notes,
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
          pendingReschedule: mapRescheduleRowToPending(pendRow as Record<string, unknown> | null),
          price: booking.price,
          createdAt: booking.created_at,
          acceptedAt: booking.accepted_at,
          onTheWayAt: b.en_route_at ?? booking.on_the_way_at,
          enRouteAt: b.en_route_at ?? booking.on_the_way_at,
          arrivedAt: b.arrived_at ?? null,
          startedAt: booking.started_at,
          completedAt: booking.completed_at,
          cancelledAt: b.cancelled_at ?? null,
          statusHistory: booking.status_history,
          serviceName,
          proName,
          categoryName,
          serviceCategorySlug,
          proPhotoUrl,
          job_request_id: booking.job_request_id ?? null,
          scope_confirmed_at: booking.scope_confirmed_at ?? null,
          job_details_snapshot: booking.job_details_snapshot ?? null,
          photos_snapshot: booking.photos_snapshot ?? null,
          noShowEligibleAt: (booking as { no_show_eligible_at?: string | null }).no_show_eligible_at ?? null,
          scheduledStartAt: (booking as { scheduled_start_at?: string | null }).scheduled_start_at ?? null,
          gracePeriodMinutes: (booking as { grace_period_minutes?: number | null }).grace_period_minutes ?? 60,
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
          hasCustomerReview: Boolean(customerReviewRow),
          customerConfirmed: b.customer_confirmed === true,
          confirmedByCustomerAt: b.confirmed_by_customer_at ?? null,
          paymentLifecycleStatus: b.payment_lifecycle_status ?? null,
          customerReviewDeadlineAt: b.customer_review_deadline_at ?? null,
          bookingTimezone: b.booking_timezone ?? null,
          payoutReleased: b.payout_released === true,
          payoutTransferId: b.payout_transfer_id ?? null,
          refundAfterPayout: b.refund_after_payout === true,
          requiresAdminReview: b.requires_admin_review === true,
          payoutHoldReason: b.payout_hold_reason ?? null,
          suspiciousCompletion: b.suspicious_completion === true,
          suspiciousCompletionReason: b.suspicious_completion_reason ?? null,
          adminHold: b.admin_hold === true,
          finalPaymentIntentId,
          ...stripeSnapshot,
          finalPaymentIntentStatus: stripeSnapshot.finalPaymentIntentStripeStatus ?? null,
          appReviewDemo: (booking as { app_review_demo?: boolean | null }).app_review_demo === true,
          receiptPricingSnapshot: {
            chargeModel: (booking as { charge_model?: string | null }).charge_model ?? null,
            hourlySelected:
              (booking as { hourly_selected?: boolean | null }).hourly_selected === true
                ? true
                : (booking as { hourly_selected?: boolean | null }).hourly_selected === false
                  ? false
                  : null,
            flatFeeSelected:
              (booking as { flat_fee_selected?: boolean | null }).flat_fee_selected === true
                ? true
                : (booking as { flat_fee_selected?: boolean | null }).flat_fee_selected === false
                  ? false
                  : null,
            durationHours:
              typeof (booking as { duration_hours?: number | null }).duration_hours === 'number'
                ? (booking as { duration_hours: number }).duration_hours
                : null,
            hourlyRateCents:
              typeof (booking as { hourly_rate_cents?: number | null }).hourly_rate_cents === 'number'
                ? (booking as { hourly_rate_cents: number }).hourly_rate_cents
                : null,
            minimumJobCents:
              typeof (booking as { minimum_job_cents?: number | null }).minimum_job_cents === 'number'
                ? (booking as { minimum_job_cents: number }).minimum_job_cents
                : null,
            flatFeeCents:
              typeof (booking as { flat_fee_cents?: number | null }).flat_fee_cents === 'number'
                ? (booking as { flat_fee_cents: number }).flat_fee_cents
                : null,
            baseFeeCents:
              typeof (booking as { base_fee_cents?: number | null }).base_fee_cents === 'number'
                ? (booking as { base_fee_cents: number }).base_fee_cents
                : null,
            includedHours:
              typeof (booking as { included_hours?: number | null }).included_hours === 'number'
                ? (booking as { included_hours: number }).included_hours
                : null,
            overageHourlyRateCents:
              typeof (booking as { overage_hourly_rate_cents?: number | null }).overage_hourly_rate_cents ===
              'number'
                ? (booking as { overage_hourly_rate_cents: number }).overage_hourly_rate_cents
                : null,
            actualHoursEstimate:
              typeof (booking as { actual_hours_estimate?: number | null }).actual_hours_estimate === 'number'
                ? (booking as { actual_hours_estimate: number }).actual_hours_estimate
                : null,
            proMinHours,
          },
        },
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('Booking API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
