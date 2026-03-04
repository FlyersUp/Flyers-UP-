/**
 * GET /api/bookings/[bookingId]/events
 * Returns latest 5 booking_events for debugging.
 * Auth: caller must be customer or pro for this booking.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createSupabaseAdmin } from '@/lib/supabase/server-admin';
import { normalizeUuidOrNull } from '@/lib/isUuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const id = normalizeUuidOrNull(bookingId);
    if (!id) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createSupabaseAdmin();
    const { data: booking } = await admin
      .from('bookings')
      .select('customer_id, pro_id')
      .eq('id', id)
      .maybeSingle();

    if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: pro } = await admin
      .from('service_pros')
      .select('user_id')
      .eq('id', booking.pro_id)
      .maybeSingle();

    const proUserId = (pro as { user_id?: string })?.user_id;
    const isCustomer = booking.customer_id === user.id;
    const isPro = proUserId === user.id;
    if (!isCustomer && !isPro) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: events } = await admin
      .from('booking_events')
      .select('id, type, data, created_at')
      .eq('booking_id', id)
      .order('created_at', { ascending: false })
      .limit(5);

    return NextResponse.json({ events: events ?? [] });
  } catch (err) {
    console.error('[booking-events]', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
