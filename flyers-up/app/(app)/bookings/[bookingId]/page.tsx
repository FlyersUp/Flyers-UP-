/**
 * Canonical booking URL: /bookings/[id]
 * Redirects to /customer/bookings/[id] or /pro/bookings/[id] based on user role and ownership.
 * If customer and booking needs payment (awaiting_payment/completed_pending_payment), redirect to checkout.
 * If not signed in, redirects to signin with next=/bookings/[id].
 */
import { redirect, notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { CUSTOMER_FINAL_PAY_CHECKOUT_STATUSES } from '@/lib/bookings/customer-booking-actions';

const PAYMENT_ELIGIBLE_STATUSES = ['completed_pending_payment', 'awaiting_payment'];

export default async function BookingRedirectPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const id = normalizeUuidOrNull(bookingId);
  if (!id) notFound();

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/signin?next=${encodeURIComponent(`/bookings/${bookingId}`)}`);
  }

  const admin = createAdminSupabaseClient();
  const { data: booking, error } = await admin
    .from('bookings')
    .select(
      'id, customer_id, pro_id, status, payment_status, final_payment_status, fully_paid_at, amount_remaining, price, service_pros(user_id)'
    )
    .eq('id', id)
    .maybeSingle();

  if (error || !booking) notFound();

  const proUserId = (booking.service_pros as { user_id?: string } | null)?.user_id;

  if (booking.customer_id === user.id) {
    const status = String(booking.status);
    const paymentStatus = String((booking as { payment_status?: string }).payment_status ?? 'UNPAID');
    const finalPaymentStatus = String(
      (booking as { final_payment_status?: string | null }).final_payment_status ?? 'UNPAID'
    ).toUpperCase();
    const fullyPaidAt = (booking as { fully_paid_at?: string | null }).fully_paid_at;
    const remaining = Math.round(Number((booking as { amount_remaining?: number | null }).amount_remaining ?? 0));

    if (
      CUSTOMER_FINAL_PAY_CHECKOUT_STATUSES.includes(status) &&
      remaining > 0 &&
      finalPaymentStatus !== 'PAID' &&
      !fullyPaidAt
    ) {
      redirect(`/bookings/${bookingId}/checkout?phase=final`);
    }

    if (
      PAYMENT_ELIGIBLE_STATUSES.includes(status) &&
      paymentStatus !== 'PAID' &&
      (booking as { price?: number }).price != null
    ) {
      redirect(`/bookings/${bookingId}/checkout`);
    }
    redirect(`/customer/bookings/${bookingId}`);
  }
  if (proUserId === user.id) {
    redirect(`/pro/bookings/${bookingId}`);
  }

  notFound();
}
