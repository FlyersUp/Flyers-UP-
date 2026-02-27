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
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
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
      service_date,
      service_time,
      address,
      notes,
      status,
      price,
      created_at,
      accepted_at,
      on_the_way_at,
      started_at,
      completed_at,
      cancelled_at,
      status_history,
      service_pros (
        id,
        display_name,
        service_categories (
          name
        )
      )
    `
    )
    .eq('id', id)
    .eq('customer_id', user.id)
    .maybeSingle();

  if (error || !booking) return null;

  const sp = booking.service_pros as { display_name?: string; service_categories?: { name?: string } | null } | null;
  const cat = sp?.service_categories;
  const serviceName = (cat && typeof cat === 'object' && 'name' in cat && cat.name) || 'Service';
  const proName = sp?.display_name?.trim() || 'Pro';

  return {
    id: booking.id,
    customerId: booking.customer_id,
    proId: booking.pro_id,
    serviceDate: booking.service_date,
    serviceTime: booking.service_time,
    address: booking.address ?? undefined,
    notes: booking.notes ?? undefined,
    status: booking.status,
    paymentStatus: (booking as { payment_status?: string }).payment_status ?? 'UNPAID',
    paidAt: (booking as { paid_at?: string | null }).paid_at ?? null,
    price: booking.price ?? undefined,
    createdAt: booking.created_at,
    acceptedAt: booking.accepted_at ?? null,
    onTheWayAt: booking.on_the_way_at ?? null,
    startedAt: booking.started_at ?? null,
    completedAt: booking.completed_at ?? null,
    cancelledAt: (booking as { cancelled_at?: string | null }).cancelled_at ?? null,
    statusHistory: (booking.status_history as { status: string; at: string }[]) ?? undefined,
    serviceName,
    proName,
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
