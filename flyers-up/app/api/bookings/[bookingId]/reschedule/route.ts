/**
 * POST /api/bookings/[bookingId]/reschedule
 * Create a reschedule request (customer or Pro).
 * Max 1 free reschedule; no reschedule after pro_en_route.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_RESCHEDULE_STATUSES = ['pro_en_route', 'on_the_way', 'arrived', 'in_progress', 'completed', 'paid', 'cancelled', 'declined'];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;
  const id = normalizeUuidOrNull(bookingId);
  if (!id) return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });

  let body: { proposed_service_date: string; proposed_service_time: string; reason_code?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { proposed_service_date, proposed_service_time, reason_code, message } = body;
  if (!proposed_service_date || !proposed_service_time) {
    return NextResponse.json({ error: 'proposed_service_date and proposed_service_time required' }, { status: 400 });
  }
  const validReasons = ['customer_schedule', 'pro_schedule', 'weather', 'emergency', 'other'];
  const reason = validReasons.includes(reason_code ?? '') ? reason_code : 'other';

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminSupabaseClient();
  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select('id, status, customer_id, pro_id, service_date, service_time, reschedule_count, original_service_date, original_service_time')
    .eq('id', id)
    .maybeSingle();

  if (bErr || !booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  if (NO_RESCHEDULE_STATUSES.includes(String(booking.status))) {
    return NextResponse.json(
      { error: 'Cannot reschedule after Pro is en route or job has started' },
      { status: 409 }
    );
  }

  const currentRescheduleCount = Number(booking.reschedule_count ?? 0);
  if (currentRescheduleCount >= 1) {
    return NextResponse.json({ error: 'Maximum 1 reschedule allowed' }, { status: 409 });
  }

  const { data: pro } = await supabase.from('service_pros').select('id').eq('user_id', user.id).maybeSingle();
  const isPro = pro?.id === booking.pro_id;
  const isCustomer = booking.customer_id === user.id;

  if (!isPro && !isCustomer) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const requestedByRole = isPro ? 'pro' : 'customer';
  const proposedStartAt = new Date(`${proposed_service_date}T${proposed_service_time}`);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  const { data: reschedule, error: insErr } = await admin
    .from('reschedule_requests')
    .insert({
      booking_id: id,
      requested_by: user.id,
      requested_by_role: requestedByRole,
      proposed_service_date: proposed_service_date,
      proposed_service_time: proposed_service_time,
      proposed_start_at: proposedStartAt.toISOString(),
      reason_code: reason,
      message: message?.trim() || null,
      reschedule_count: currentRescheduleCount + 1,
      status: 'pending',
      expires_at: expiresAt.toISOString(),
    })
    .select('id, status, expires_at')
    .single();

  if (insErr) {
    console.error('Reschedule insert failed', insErr);
    return NextResponse.json({ error: 'Failed to create reschedule request' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    rescheduleId: reschedule?.id,
    status: 'pending',
    expiresAt: reschedule?.expires_at,
  });
}
