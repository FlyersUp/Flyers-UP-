/**
 * GET /api/bookings/[bookingId]/quote
 * Returns price breakdown for a booking. Customer must own the booking.
 * Used by checkout page to display transparent pricing.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { computeQuote } from '@/lib/bookingQuote';

export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];
export const dynamic = 'force-dynamic';

const ELIGIBLE_STATUSES = ['accepted', 'pro_en_route', 'in_progress', 'completed_pending_payment', 'awaiting_payment'];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;
  const id = normalizeUuidOrNull(bookingId);
  if (!id) {
    return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'customer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminSupabaseClient();

  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select('id, customer_id, pro_id, service_date, service_time, address, price, status')
    .eq('id', id)
    .eq('customer_id', user.id)
    .maybeSingle();

  if (bErr || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  const status = String(booking.status);
  if (!ELIGIBLE_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `Booking is not ready for checkout (status: ${status})` },
      { status: 409 }
    );
  }

  const paymentStatus = String((booking as { payment_status?: string }).payment_status ?? 'UNPAID');
  if (paymentStatus === 'PAID') {
    return NextResponse.json(
      { error: 'Booking is already paid' },
      { status: 409 }
    );
  }

  // Load pro + service + pro_profiles
  const { data: proRow } = await admin
    .from('service_pros')
    .select('id, user_id, display_name, stripe_account_id, stripe_charges_enabled, service_categories(name)')
    .eq('id', booking.pro_id)
    .maybeSingle();

  if (!proRow) {
    return NextResponse.json({ error: 'Pro not found' }, { status: 404 });
  }

  const { data: proPricing } = await admin
    .from('pro_profiles')
    .select('pricing_model, starting_price, starting_rate, hourly_rate, min_hours, travel_fee_enabled, travel_fee_base, travel_free_within_miles, travel_extra_per_mile, profile_photo_path')
    .eq('user_id', proRow.user_id)
    .maybeSingle();

  const cat = proRow.service_categories as { name?: string } | null;
  const serviceName = (cat?.name ?? 'Service').trim();
  const proName = (proRow.display_name ?? 'Pro').trim();

  const proPayoutReady =
    Boolean(proRow.stripe_account_id) && proRow.stripe_charges_enabled === true;

  if (!proPayoutReady) {
    return NextResponse.json(
      { error: 'Pro is not ready to receive payments yet.' },
      { status: 409 }
    );
  }

  const profilePhotoPath = (proPricing as { profile_photo_path?: string } | null)?.profile_photo_path;
  const proPhotoUrl =
    profilePhotoPath && profilePhotoPath.trim()
      ? admin.storage.from('avatars').getPublicUrl(profilePhotoPath).data.publicUrl
      : null;

  const quoteResult = computeQuote(
    {
      id: booking.id,
      customer_id: booking.customer_id,
      pro_id: booking.pro_id,
      service_date: booking.service_date,
      service_time: booking.service_time,
      address: booking.address,
      price: booking.price,
      status: booking.status,
    },
    proPricing,
    serviceName,
    proName
  );

  const { quote } = quoteResult;
  if (quote.amountTotal <= 0) {
    return NextResponse.json(
      { error: 'Booking total is not set' },
      { status: 400 }
    );
  }

  return NextResponse.json(
    { quote: { ...quoteResult, proPhotoUrl } },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
