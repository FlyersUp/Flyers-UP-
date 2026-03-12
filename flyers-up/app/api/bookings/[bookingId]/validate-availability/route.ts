/**
 * GET /api/bookings/[bookingId]/validate-availability
 * Validate pro availability before deposit payment.
 * Returns instant_book_allowed, request_only_allowed, unavailable, rejection_reason.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { validateAvailability } from '@/lib/operations/availabilityValidation';

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
  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select('id, pro_id, service_date, service_time, address, address_lat, address_lng, status')
    .eq('id', id)
    .maybeSingle();

  if (bErr || !booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  const { data: pro } = await admin
    .from('service_pros')
    .select('id, user_id, available, travel_radius_miles, service_area_mode, service_area_values, lead_time_minutes, buffer_between_jobs_minutes, same_day_enabled')
    .eq('id', booking.pro_id)
    .maybeSingle();

  if (!pro) return NextResponse.json({ error: 'Pro not found' }, { status: 404 });

  const { data: blocked } = await admin
    .from('pro_blocked_dates')
    .select('blocked_date')
    .eq('pro_id', pro.id)
    .eq('blocked_date', booking.service_date);

  const { data: existing } = await admin
    .from('bookings')
    .select('id, service_date, service_time, started_at, completed_at, status')
    .eq('pro_id', pro.id)
    .eq('service_date', booking.service_date);

  const requestedStart = new Date(`${booking.service_date}T${booking.service_time || '12:00'}`);
  const activeBookings = (existing ?? []).filter(
    (b) => !['cancelled', 'declined'].includes(String(b.status)) && b.id !== id
  );
  const ranges = activeBookings.map((b) => {
    const start = new Date(`${b.service_date}T${b.service_time || '12:00'}`);
    const end = b.completed_at ? new Date(b.completed_at) : new Date(start.getTime() + 60 * 60 * 1000);
    return { start, end };
  });

  const result = validateAvailability({
    isActive: (pro as { available?: boolean }).available ?? true,
    travelRadiusMiles: Number((pro as { travel_radius_miles?: number }).travel_radius_miles) || null,
    serviceAreaMode: (pro as { service_area_mode?: string }).service_area_mode as 'radius' | 'boroughs' | 'zip_codes' | null,
    serviceAreaValues: ((pro as { service_area_values?: string[] }).service_area_values ?? []) as string[],
    leadTimeMinutes: Number((pro as { lead_time_minutes?: number }).lead_time_minutes) || 60,
    bufferBetweenJobsMinutes: Number((pro as { buffer_between_jobs_minutes?: number }).buffer_between_jobs_minutes) || 30,
    sameDayEnabled: Boolean((pro as { same_day_enabled?: boolean }).same_day_enabled),
    blockedDates: (blocked ?? []).map((b) => new Date(b.blocked_date)),
    existingBookingRanges: ranges,
    businessHours: {},
    requestedStart,
    estimatedDurationMinutes: 60,
    jobLat: (booking as { address_lat?: number }).address_lat,
    jobLng: (booking as { address_lng?: number }).address_lng,
    proLat: null,
    proLng: null,
  });

  if (result.allowed) {
    return NextResponse.json({
      allowed: true,
      instantBookAllowed: result.instantBookAllowed ?? true,
      requestOnlyAllowed: result.requestOnlyAllowed ?? true,
    });
  }

  return NextResponse.json({
    allowed: false,
    instantBookAllowed: false,
    requestOnlyAllowed: false,
    rejectionReason: result.rejectionReason,
  });
}
