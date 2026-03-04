/**
 * Canonical booking URL: /bookings/[id]
 * Redirects to /customer/bookings/[id] or /pro/bookings/[id] based on user role and ownership.
 * If not signed in, redirects to signin with next=/bookings/[id].
 */
import { redirect, notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';

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
    .select('id, customer_id, pro_id, service_pros(user_id)')
    .eq('id', id)
    .maybeSingle();

  if (error || !booking) notFound();

  const proUserId = (booking.service_pros as { user_id?: string } | null)?.user_id;

  if (booking.customer_id === user.id) {
    redirect(`/customer/bookings/${bookingId}`);
  }
  if (proUserId === user.id) {
    redirect(`/pro/bookings/${bookingId}`);
  }

  notFound();
}
