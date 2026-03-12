/**
 * POST /api/bookings/[bookingId]/reschedule/[requestId]/respond
 * Accept or decline a reschedule request (other party).
 */
import { NextResponse } from 'next/server';
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

  let body: { accept: boolean; response_note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminSupabaseClient();
  const { data: reqRow, error: rErr } = await admin
    .from('reschedule_requests')
    .select('id, booking_id, requested_by, requested_by_role, status, proposed_service_date, proposed_service_time, expires_at')
    .eq('id', rid)
    .eq('booking_id', bid)
    .maybeSingle();

  if (rErr || !reqRow) return NextResponse.json({ error: 'Reschedule request not found' }, { status: 404 });
  if (reqRow.status !== 'pending') return NextResponse.json({ error: 'Request already responded' }, { status: 409 });
  if (new Date(reqRow.expires_at) < new Date()) {
    await admin.from('reschedule_requests').update({ status: 'expired' }).eq('id', rid);
    return NextResponse.json({ error: 'Request expired' }, { status: 409 });
  }

  const { data: booking } = await admin
    .from('bookings')
    .select('customer_id, pro_id, service_date, service_time, original_service_date, original_service_time, status_history')
    .eq('id', bid)
    .maybeSingle();

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  const { data: pro } = await supabase.from('service_pros').select('id').eq('user_id', user.id).maybeSingle();
  const isPro = pro?.id === booking.pro_id;
  const isCustomer = booking.customer_id === user.id;

  if (!isPro && !isCustomer) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (reqRow.requested_by === user.id) return NextResponse.json({ error: 'Cannot respond to own request' }, { status: 403 });

  const now = new Date().toISOString();
  const newStatus = body.accept ? 'accepted' : 'declined';

  await admin
    .from('reschedule_requests')
    .update({
      status: newStatus,
      responded_by: user.id,
      responded_at: now,
      response_note: body.response_note?.trim() || null,
    })
    .eq('id', rid);

  if (body.accept) {
    const b = booking as { original_service_date?: string; original_service_time?: string; service_date?: string; service_time?: string; status_history?: unknown[] };
    const origDate = b.original_service_date ?? b.service_date;
    const origTime = b.original_service_time ?? b.service_time;
    const history = b.status_history ?? [];
    await admin
      .from('bookings')
      .update({
        service_date: reqRow.proposed_service_date,
        service_time: reqRow.proposed_service_time,
        reschedule_count: 1,
        original_service_date: origDate,
        original_service_time: origTime,
        status_history: [...history, { type: 'reschedule_accepted', at: now, from: `${origDate} ${origTime}`, to: `${reqRow.proposed_service_date} ${reqRow.proposed_service_time}` }],
      })
      .eq('id', bid);
  }

  return NextResponse.json({ ok: true, status: newStatus });
}
