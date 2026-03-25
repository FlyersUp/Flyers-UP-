/**
 * POST /api/bookings/[bookingId]/arrive
 * Pro confirms arrival (optional photo; GPS optional — see arrivalGeolocationFuture.ts to re-enable).
 * Creates job_arrivals row required before transitioning to in_progress.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { haversineDistanceMeters, ARRIVAL_VERIFICATION_RADIUS_METERS } from '@/lib/geo';
import { createNotificationEvent } from '@/lib/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;
  const id = normalizeUuidOrNull(bookingId);
  if (!id) return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });

  let body: { lat?: number | null; lng?: number | null; arrival_photo_url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const latN = body.lat != null ? Number(body.lat) : NaN;
  const lngN = body.lng != null ? Number(body.lng) : NaN;
  const hasGps = Number.isFinite(latN) && Number.isFinite(lngN);
  const lat = hasGps ? latN : null;
  const lng = hasGps ? lngN : null;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: proRow } = await supabase
    .from('service_pros')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!proRow?.id) return NextResponse.json({ error: 'Pro not found' }, { status: 403 });

  const admin = createAdminSupabaseClient();
  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select('id, pro_id, customer_id, status, address, address_lat, address_lng')
    .eq('id', id)
    .eq('pro_id', proRow.id)
    .maybeSingle();

  if (bErr || !booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  const status = String(booking.status);
  if (!['pro_en_route', 'on_the_way', 'arrived'].includes(status)) {
    return NextResponse.json(
      { error: 'Booking must be en route or arrived before verifying arrival' },
      { status: 409 }
    );
  }

  const jobLat = Number((booking as { address_lat?: number | null }).address_lat);
  const jobLng = Number((booking as { address_lng?: number | null }).address_lng);
  let locationVerified = false;
  if (hasGps && Number.isFinite(jobLat) && Number.isFinite(jobLng) && lat != null && lng != null) {
    const dist = haversineDistanceMeters(lat, lng, jobLat, jobLng);
    locationVerified = dist <= ARRIVAL_VERIFICATION_RADIUS_METERS;
  }

  const { data: existing } = await admin
    .from('job_arrivals')
    .select('id')
    .eq('booking_id', id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      ok: true,
      arrivalId: existing.id,
      locationVerified,
      gpsCaptured: hasGps,
      alreadyRecorded: true,
    });
  }

  const now = new Date();
  const waitExpires = new Date(now.getTime() + 15 * 60 * 1000);

  const { data: arrival, error: insertErr } = await admin
    .from('job_arrivals')
    .insert({
      booking_id: id,
      pro_id: proRow.id,
      arrival_lat: lat,
      arrival_lng: lng,
      arrival_photo_url: body.arrival_photo_url?.trim() || null,
      location_verified: locationVerified,
    })
    .select('id')
    .single();

  if (insertErr) {
    console.error('Job arrival insert failed', insertErr);
    return NextResponse.json({ error: 'Failed to record arrival' }, { status: 500 });
  }

  await admin
    .from('bookings')
    .update({
      arrived_at: now.toISOString(),
      status: 'arrived',
      arrival_started_at: now.toISOString(),
      arrival_verified_at: locationVerified ? now.toISOString() : null,
      wait_timer_started_at: now.toISOString(),
      wait_timer_expires_at: waitExpires.toISOString(),
    })
    .eq('id', id)
    .eq('pro_id', proRow.id);

  const customerId = (booking as { customer_id?: string }).customer_id;
  if (customerId) {
    void createNotificationEvent({
      userId: customerId,
      type: NOTIFICATION_TYPES.BOOKING_ON_THE_WAY,
      actorUserId: user.id,
      bookingId: id,
      titleOverride: 'Your Pro has arrived',
      bodyOverride: locationVerified ? 'Your Pro has arrived and verified their location.' : 'Your Pro has arrived.',
      basePath: 'customer',
    });
  }

  return NextResponse.json({
    ok: true,
    arrivalId: arrival?.id,
    locationVerified,
    gpsCaptured: hasGps,
  });
}
