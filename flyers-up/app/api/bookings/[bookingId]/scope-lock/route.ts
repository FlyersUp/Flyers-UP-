/**
 * POST /api/bookings/[bookingId]/scope-lock
 * Confirms scope before deposit. Required for bookings from job requests.
 * Deposit cannot be charged until scope is confirmed.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';

export const runtime = 'nodejs';
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'customer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminSupabaseClient();

  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select('id, customer_id, job_request_id, scope_confirmed_at, status')
    .eq('id', id)
    .eq('customer_id', user.id)
    .maybeSingle();

  if (bErr || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  if (booking.scope_confirmed_at) {
    return NextResponse.json({ ok: true, alreadyConfirmed: true });
  }

  const { error: updateErr } = await admin
    .from('bookings')
    .update({
      scope_confirmed_at: new Date().toISOString(),
      scope_confirmed_by: user.id,
    })
    .eq('id', id)
    .eq('customer_id', user.id);

  if (updateErr) {
    return NextResponse.json({ error: 'Failed to confirm scope' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
