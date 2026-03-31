/**
 * POST /api/bookings/[bookingId]/reschedule/[requestId]/respond
 * Pro or Customer accepts/declines a reschedule request.
 */
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ bookingId: string; requestId: string }> }
) {
  const { bookingId, requestId } = await params;
  const bid = normalizeUuidOrNull(bookingId);
  const rid = normalizeUuidOrNull(requestId);
  if (!bid || !rid) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  let body: { action: 'accept' | 'decline'; response_note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const action = body.action === 'accept' ? 'accepted' : 'declined';
  const responseNote = body.response_note?.trim() || null;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminSupabaseClient();
  const { data: reschedule, error: rErr } = await admin
    .from('reschedule_requests')
    .select('id, booking_id, status, requested_by_role, proposed_service_date, proposed_service_time, proposed_start_at')
    .eq('id', rid)
    .eq('booking_id', bid)
    .maybeSingle();

  if (rErr || !reschedule) return NextResponse.json({ error: 'Reschedule request not found' }, { status: 404 });
  if (reschedule.status !== 'pending') return NextResponse.json({ error: 'Request already responded' }, { status: 409 });

  const { data: booking } = await admin
    .from('bookings')
    .select('id, customer_id, pro_id, status, service_date, service_time, original_service_date, original_service_time, reschedule_count')
    .eq('id', bid)
    .maybeSingle();

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  const { data: pro } = await supabase.from('service_pros').select('id, user_id').eq('id', booking.pro_id).maybeSingle();
  const isPro = pro?.user_id === user.id;
  const isCustomer = booking.customer_id === user.id;

  // Responder must be the other party (customer requested -> pro responds, pro requested -> customer responds)
  const responderRole = reschedule.requested_by_role === 'pro' ? 'customer' : 'pro';
  if (responderRole === 'pro' && !isPro) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (responderRole === 'customer' && !isCustomer) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const now = new Date();

  const { error: updErr } = await admin
    .from('reschedule_requests')
    .update({
      status: action,
      responded_by: user.id,
      responded_at: now.toISOString(),
      response_note: responseNote,
    })
    .eq('id', rid);

  if (updErr) {
    console.error('Reschedule respond failed', updErr);
    return NextResponse.json({ error: 'Failed to respond' }, { status: 500 });
  }

  if (action === 'accepted') {
    const rescheduleCount = Number((booking as { reschedule_count?: number }).reschedule_count ?? 0) + 1;
    const proposedStart = new Date(
      `${reschedule.proposed_service_date}T${reschedule.proposed_service_time || '09:00'}`
    );
    const updatePayload: Record<string, unknown> = {
      service_date: reschedule.proposed_service_date,
      service_time: reschedule.proposed_service_time,
      reschedule_count: rescheduleCount,
      scheduled_start_at: proposedStart.toISOString(),
      late_warning_sent_at: null,
      severe_late_warning_sent_at: null,
      no_show_eligible_at: null,
      eta_minutes: null,
      eta_note: null,
      eta_updated_at: null,
    };
    if (!(booking as { original_service_date?: string | null }).original_service_date) {
      updatePayload.original_service_date = booking.service_date;
      updatePayload.original_service_time = booking.service_time;
    }
    const { error: bUpdErr } = await admin
      .from('bookings')
      .update(updatePayload)
      .eq('id', bid);

    if (bUpdErr) {
      console.error('Booking reschedule update failed', bUpdErr);
    }
    try {
      revalidatePath('/pro/calendar');
      revalidatePath('/customer/calendar');
      revalidatePath('/pro/today');
      revalidatePath('/pro/bookings');
      revalidatePath(`/pro/bookings/${bid}`);
      revalidatePath(`/pro/jobs/${bid}`);
      revalidatePath(`/customer/bookings/${bid}`);
    } catch {
      // ignore
    }
  }

  return NextResponse.json({
    ok: true,
    action,
    rescheduleId: rid,
  });
}
