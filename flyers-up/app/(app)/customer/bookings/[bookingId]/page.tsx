/**
 * Customer Booking Details Page
 *
 * SECTIONS (top to bottom):
 * A) Top bar: Back, title, status badge
 * B) Header card: Service name, Pro name, date/time, status
 * C) Progress: Vertical timeline (BookingTimeline)
 * D) Latest update card
 * E) Payment: Total, status, Pay now link if unpaid
 * F) Service details: Collapsible (address, notes, booking ID)
 * G) Actions: Message pro, Leave review (if completed)
 *
 * DATA: Fetched server-side via getCustomerBooking(). Ownership enforced:
 * booking.customer_id must equal auth user. Redirects to signin if unauthenticated,
 * 404 if not found or not owner.
 */
import { redirect, notFound } from 'next/navigation';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { BookingDetailContent } from './BookingDetailContent';
import { AppLayout } from '@/components/layouts/AppLayout';

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

  // Use admin client for booking query (same as list API) to avoid RLS/session edge cases
  const admin = createAdminSupabaseClient();
  const { data: booking, error } = await admin
    .from('bookings')
    .select(
      `
      id,
      customer_id,
      pro_id,
      payment_status,
      paid_at,
      final_payment_status,
      fully_paid_at,
      payment_due_at,
      remaining_due_at,
      auto_confirm_at,
      paid_deposit_at,
      paid_remaining_at,
      payout_status,
      refund_status,
      platform_fee_cents,
      refunded_total_cents,
      total_amount_cents,
      amount_deposit,
      amount_remaining,
      amount_total,
      service_date,
      service_time,
      address,
      notes,
      status,
      price,
      created_at,
      accepted_at,
      en_route_at,
      on_the_way_at,
      started_at,
      completed_at,
      cancelled_at,
      status_history,
      service_pros (
        id,
        display_name,
        logo_url,
        service_categories (
          name
        )
      )
    `
    )
    .eq('id', id)
    .eq('customer_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[getCustomerBooking] Supabase error:', error.message, { bookingId: id });
    return null;
  }
  if (!booking) return null;

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

  const sp = booking.service_pros as {
    display_name?: string;
    logo_url?: string | null;
    service_categories?: { name?: string } | null;
  } | null;
  const cat = sp?.service_categories;
  const serviceName = (cat && typeof cat === 'object' && 'name' in cat && cat.name) || 'Service';
  const proName = sp?.display_name?.trim() || 'Pro';
  const categoryName = (cat && typeof cat === 'object' && 'name' in cat && cat.name) || undefined;
  const proPhotoUrl = sp?.logo_url ?? null;

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
    startedAt: booking.started_at ?? null,
    completedAt: booking.completed_at ?? null,
    cancelledAt: b.cancelled_at ?? null,
    statusHistory: (booking.status_history as { status: string; at: string }[]) ?? undefined,
    serviceName,
    proName,
    categoryName,
    proPhotoUrl,
  };
}

export default async function CustomerBookingDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const result = await getCustomerBooking(bookingId);

  if (result === null) {
    notFound();
  }
  if (result && 'error' in result) {
    if (result.error === 'unauthorized') {
      redirect(`/signin?next=${encodeURIComponent(`/customer/bookings/${bookingId}`)}`);
    }
    notFound();
  }

  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <BookingDetailContent booking={result} bookingId={bookingId} />
      </div>
    </AppLayout>
  );
}
