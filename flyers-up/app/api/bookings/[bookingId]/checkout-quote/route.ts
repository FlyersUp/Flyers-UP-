/**
 * GET /api/bookings/[bookingId]/checkout-quote
 * Returns computed quote for customer checkout (summary + deposit step).
 * Used when customer needs to see pricing before payment intent is created.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { computeQuote } from '@/lib/bookingQuote';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;
  const id = normalizeUuidOrNull(bookingId);
  if (!id) return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminSupabaseClient();

  // Same as deposit: allow any user who is the booking's customer (including pros who booked another pro).
  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select('id, customer_id, pro_id, status, price, payment_due_at, service_date, service_time, address, duration_hours, miles_distance')
    .eq('id', id)
    .eq('customer_id', user.id)
    .maybeSingle();

  if (bErr || !booking) {
    return NextResponse.json(
      { error: 'Booking not found or you do not have access', code: 'BOOKING_NOT_FOUND' },
      { status: 404 }
    );
  }

  const { data: proRow, error: proErr } = await admin
    .from('service_pros')
    .select('id, user_id, display_name, category_id')
    .eq('id', booking.pro_id)
    .maybeSingle();

  if (proErr) {
    console.error('[checkout-quote] service_pros query error', {
      proId: booking.pro_id,
      code: proErr.code,
      message: proErr.message,
    });
    return NextResponse.json(
      { error: 'Failed to load service pro', code: 'PRO_QUERY_FAILED' },
      { status: 500 }
    );
  }
  if (!proRow) {
    return NextResponse.json({ error: 'Service pro not found for this booking', code: 'PRO_NOT_FOUND' }, { status: 404 });
  }

  const { data: proPricing } = await admin
    .from('pro_profiles')
    .select('pricing_model, starting_price, starting_rate, hourly_rate, min_hours, travel_fee_enabled, travel_fee_base, travel_free_within_miles, travel_extra_per_mile, deposit_percent_default, deposit_percent_min, deposit_percent_max')
    .eq('user_id', (proRow as { user_id: string }).user_id)
    .maybeSingle();

  let serviceName = 'Service';
  const catId = (proRow as { category_id?: string | null }).category_id;
  if (catId) {
    const { data: catRow } = await admin
      .from('service_categories')
      .select('name')
      .eq('id', catId)
      .maybeSingle();
    if (catRow && typeof (catRow as { name?: string }).name === 'string') {
      serviceName = String((catRow as { name: string }).name).trim() || 'Service';
    }
  }
  const proName = ((proRow as { display_name?: string }).display_name ?? 'Pro').trim();

  const proUserId = (proRow as { user_id: string }).user_id;
  const { data: profileRow } = await admin
    .from('profiles')
    .select('avatar_url')
    .eq('id', proUserId)
    .maybeSingle();

  let proPhotoUrl: string | null = null;
  if (profileRow && typeof (profileRow as { avatar_url?: string | null }).avatar_url === 'string') {
    proPhotoUrl = (profileRow as { avatar_url: string }).avatar_url;
  }

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
      duration_hours: (booking as { duration_hours?: number | null }).duration_hours,
      miles_distance: (booking as { miles_distance?: number | null }).miles_distance,
    },
    proPricing,
    serviceName,
    proName,
    { paymentDueAt: (booking as { payment_due_at?: string | null }).payment_due_at }
  );

  return NextResponse.json({
    quote: {
      ...quoteResult,
      proPhotoUrl,
      address: booking.address ?? undefined,
      durationHours: (booking as { duration_hours?: number | null }).duration_hours ?? undefined,
      paymentDueAt: (booking as { payment_due_at?: string | null }).payment_due_at ?? undefined,
    },
  });
}
