/**
 * POST /api/bookings/[bookingId]/price-adjustment
 * Pro submits a price adjustment when job scope differs on arrival.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';

const REASONS = ['larger_space', 'extra_rooms', 'heavy_condition', 'additional_tasks', 'safety_concern'] as const;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;
  const id = normalizeUuidOrNull(bookingId);
  if (!id) return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });

  let body: { reason: string; new_price_cents: number; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const reason = body.reason;
  if (!REASONS.includes(reason as (typeof REASONS)[number])) {
    return NextResponse.json({ error: 'Invalid reason' }, { status: 400 });
  }

  const newPriceCents = Math.round(Number(body.new_price_cents) || 0);
  if (newPriceCents <= 0) {
    return NextResponse.json({ error: 'Invalid new price' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: proRow } = await supabase
    .from('service_pros')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!proRow?.id) return NextResponse.json({ error: 'Pro not found' }, { status: 403 });

  const admin = createAdminSupabaseClient();
  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select('id, pro_id, price, status')
    .eq('id', id)
    .eq('pro_id', proRow.id)
    .maybeSingle();

  if (bErr || !booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  const allowedStatuses = ['arrived', 'in_progress', 'pro_en_route', 'deposit_paid'];
  if (!allowedStatuses.includes(String(booking.status))) {
    return NextResponse.json({ error: 'Booking not in progress' }, { status: 409 });
  }

  const originalPriceCents = Math.round(Number(booking.price ?? 0) * 100);

  const { error: insertErr } = await admin.from('price_adjustments').insert({
    booking_id: id,
    pro_id: proRow.id,
    reason,
    original_price_cents: originalPriceCents,
    new_price_cents: newPriceCents,
    message: body.message?.trim() || null,
    status: 'pending',
  });

  if (insertErr) {
    console.error('Price adjustment insert failed', insertErr);
    return NextResponse.json({ error: 'Failed to submit adjustment' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
