/**
 * POST /api/bookings/[bookingId]/decline
 * Pro declines a pending booking. Sets status to declined.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';

export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];
export const dynamic = 'force-dynamic';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;
  const id = normalizeUuidOrNull(bookingId);
  if (!id) {
    return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'pro') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: proRow } = await supabase
    .from('service_pros')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!proRow?.id) {
    return NextResponse.json({ error: 'Pro profile not found' }, { status: 403 });
  }
  const proId = String(proRow.id);

  const admin = createAdminSupabaseClient();
  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select('id, status, status_history, pro_id')
    .eq('id', id)
    .single();

  if (bErr || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }
  if (booking.pro_id !== proId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (booking.status !== 'requested' && booking.status !== 'pending') {
    return NextResponse.json(
      { error: `Cannot decline booking with status: ${booking.status}` },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const history = ((booking as { status_history?: { status: string; at: string }[] }).status_history ?? []) as { status: string; at: string }[];
  const newHistory = [...history, { status: 'declined', at: now }];

  const { error: updateErr } = await admin
    .from('bookings')
    .update({
      status: 'declined',
      status_history: newHistory,
      status_updated_at: now,
      status_updated_by: user.id,
    })
    .eq('id', id)
    .eq('pro_id', proId);

  if (updateErr) {
    return NextResponse.json({ error: 'Failed to decline booking' }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
