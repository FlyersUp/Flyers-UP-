/**
 * POST /api/bookings/[bookingId]/contact-attempt
 * Log a contact attempt (in_app_message or call) for no-show evidence.
 * Pro must have at least 1 message + 1 call before marking customer no-show.
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

  let body: { attempt_type: 'in_app_message' | 'call' };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const attemptType = body.attempt_type;
  if (!attemptType || !['in_app_message', 'call'].includes(attemptType)) {
    return NextResponse.json({ error: 'attempt_type must be in_app_message or call' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminSupabaseClient();
  const { data: booking } = await admin
    .from('bookings')
    .select('id, pro_id, customer_id, status')
    .eq('id', id)
    .maybeSingle();

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  const { data: pro } = await supabase.from('service_pros').select('id').eq('user_id', user.id).maybeSingle();
  const isPro = pro?.id === booking.pro_id;
  const isCustomer = booking.customer_id === user.id;

  if (!isPro && !isCustomer) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error: insErr } = await admin.from('contact_attempts').insert({
    booking_id: id,
    initiated_by: user.id,
    attempt_type: attemptType,
  });

  if (insErr) {
    console.error('Contact attempt insert failed', insErr);
    return NextResponse.json({ error: 'Failed to log attempt' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, attempt_type: attemptType });
}
