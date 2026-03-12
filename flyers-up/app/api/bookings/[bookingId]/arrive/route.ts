/**
 * POST /api/bookings/[bookingId]/arrive
 * Pro submits arrival verification (GPS + optional photo) before starting job.
 * Required before transitioning to in_progress.
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

  let body: { lat: number; lng: number; arrival_photo_url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'Valid lat/lng required' }, { status: 400 });
  }

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
  if (Number.isFinite(jobLat) && Number.isFinite(jobLng)) {
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
      alreadyRecorded: true,
    });
  }

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
    .update({ arrived_at: new Date().toISOString(), status: 'arrived' })
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
  });
}
