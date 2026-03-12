/**
 * POST /api/bookings/[bookingId]/price-adjustment/respond
 * Customer accepts or rejects a price adjustment.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;
  const id = normalizeUuidOrNull(bookingId);
  if (!id) return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });

  let body: { action: 'accept' | 'reject' };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (body.action !== 'accept' && body.action !== 'reject') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'customer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminSupabaseClient();
  const { data: booking } = await admin
    .from('bookings')
    .select('id, customer_id')
    .eq('id', id)
    .eq('customer_id', user.id)
    .maybeSingle();

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  const { data: adjustment } = await admin
    .from('price_adjustments')
    .select('id, new_price_cents')
    .eq('booking_id', id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!adjustment) return NextResponse.json({ error: 'No pending adjustment' }, { status: 404 });

  const newStatus = body.action === 'accept' ? 'accepted' : 'rejected';

  await admin
    .from('price_adjustments')
    .update({
      status: newStatus,
      customer_response_at: new Date().toISOString(),
    })
    .eq('id', adjustment.id);

  if (body.action === 'accept') {
    const newPriceDollars = (adjustment.new_price_cents as number) / 100;
    await admin
      .from('bookings')
      .update({ price: newPriceDollars })
      .eq('id', id);
  } else {
    await admin
      .from('bookings')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', id);
  }

  return NextResponse.json({ ok: true, action: body.action });
}
