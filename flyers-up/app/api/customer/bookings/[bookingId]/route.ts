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
      ', payment_status, paid_at, final_payment_status, fully_paid_at, payment_due_at, remaining_due_at, auto_confirm_at, paid_deposit_at, paid_remaining_at, payout_status, refund_status, platform_fee_cents, refunded_total_cents, total_amount_cents, amount_deposit, amount_remaining, amount_total, en_route_at, arrived_at, job_request_id, scope_confirmed_at, job_details_snapshot, photos_snapshot';

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
      if (role === 'customer') q = q.eq('customer_id', user.id);
      else if (role === 'pro' && proIdForQuery) q = q.eq('pro_id', proIdForQuery);
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

    // Fetch pro info separately (same pattern as list API)
    let serviceName = 'Service';
    let proName = 'Pro';
    let categoryName: string | undefined;
    let proPhotoUrl: string | null = null;
    if (booking.pro_id) {
      const { data: pro } = await admin
        .from('service_pros')
        .select('display_name, logo_url, category_id')
        .eq('id', booking.pro_id)
        .maybeSingle();
      if (pro) {
        proName = (pro as { display_name?: string }).display_name?.trim() || 'Pro';
        proPhotoUrl = (pro as { logo_url?: string | null }).logo_url ?? null;
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
      platform_fee_cents?: number | null;
      refunded_total_cents?: number | null;
      total_amount_cents?: number | null;
      amount_deposit?: number | null;
      amount_remaining?: number | null;
      amount_total?: number | null;
      en_route_at?: string | null;
      on_the_way_at?: string | null;
      arrived_at?: string | null;
      cancelled_at?: string | null;
    };

    return NextResponse.json(
      {
        booking: {
          id: booking.id,
          customerId: booking.customer_id,
          proId: booking.pro_id,
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
          platformFeeCents: b.platform_fee_cents ?? null,
          refundedTotalCents: b.refunded_total_cents ?? null,
          amountDeposit: b.amount_deposit ?? null,
          amountRemaining: b.amount_remaining ?? null,
          amountTotal: b.total_amount_cents ?? b.amount_total ?? null,
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
          proPhotoUrl,
          job_request_id: booking.job_request_id ?? null,
          scope_confirmed_at: booking.scope_confirmed_at ?? null,
          job_details_snapshot: booking.job_details_snapshot ?? null,
          photos_snapshot: booking.photos_snapshot ?? null,
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
        },
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('Booking API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
