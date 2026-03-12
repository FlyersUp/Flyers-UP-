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

  if (!profile || profile.role !== 'customer') return { error: 'forbidden' as const };

  const admin = createAdminSupabaseClient();

  // Fetch booking without join first (avoids service_pros/service_categories join issues)
  const { data: booking, error } = await admin
    .from('bookings')
    .select(
      'id, customer_id, pro_id, payment_status, paid_at, final_payment_status, fully_paid_at, payment_due_at, remaining_due_at, auto_confirm_at, paid_deposit_at, paid_remaining_at, payout_status, refund_status, platform_fee_cents, refunded_total_cents, total_amount_cents, amount_deposit, amount_remaining, amount_total, service_date, service_time, address, notes, status, price, created_at, accepted_at, en_route_at, on_the_way_at, started_at, completed_at, cancelled_at, status_history, job_request_id, scope_confirmed_at'
    )
    .eq('id', id)
    .eq('customer_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[getCustomerBooking] Supabase error:', error.message, { bookingId: id });
    return null;
  }
  if (!booking) return null;

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
    platform_fee_cents?: number | null;
    refunded_total_cents?: number | null;
    amount_deposit?: number | null;
    amount_remaining?: number | null;
    amount_total?: number | null;
    total_amount_cents?: number | null;
    en_route_at?: string | null;
    on_the_way_at?: string | null;
    cancelled_at?: string | null;
  };

  // Fetch pro info separately (avoids join failures; same pattern as list API)
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

  return {
    id: booking.id,
    customerId: booking.customer_id,
    proId: booking.pro_id,
    serviceDate: booking.service_date,
    serviceTime: booking.service_time,
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
    platformFeeCents: b.platform_fee_cents ?? null,
    refundedTotalCents: b.refunded_total_cents ?? null,
    amountDeposit: b.amount_deposit ?? null,
    amountRemaining: b.amount_remaining ?? null,
    amountTotal: b.total_amount_cents ?? b.amount_total ?? null,
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
