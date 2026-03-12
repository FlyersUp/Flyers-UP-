/**
 * POST /api/rebook
 * Create a new booking from a previous one (rebook same Pro).
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: { previous_booking_id: string; date: string; time: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { previous_booking_id, date, time } = body;
  if (!previous_booking_id || !date || !time) {
    return NextResponse.json({ error: 'previous_booking_id, date, time required' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'customer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminSupabaseClient();
  const { data: prev } = await admin
    .from('bookings')
    .select('id, customer_id, pro_id, address, notes, price, service_date, service_time')
    .eq('id', previous_booking_id)
    .eq('customer_id', user.id)
    .in('status', ['completed', 'paid', 'awaiting_customer_confirmation'])
    .maybeSingle();

  if (!prev) return NextResponse.json({ error: 'Previous booking not found' }, { status: 404 });

  const { data: newBooking, error: insertErr } = await admin
    .from('bookings')
    .insert({
      customer_id: user.id,
      pro_id: prev.pro_id,
      service_date: date,
      service_time: time,
      address: prev.address,
      notes: prev.notes,
      price: prev.price,
      status: 'requested',
      status_history: [{ status: 'requested', at: new Date().toISOString() }],
    })
    .select('id')
    .single();

  if (insertErr) {
    console.error('Rebook insert failed', insertErr);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }

  await admin.from('rebook_events').insert({
    customer_id: user.id,
    pro_id: prev.pro_id,
    previous_booking_id: previous_booking_id,
    new_booking_id: newBooking.id,
  });

  return NextResponse.json({ ok: true, bookingId: newBooking.id });
}
