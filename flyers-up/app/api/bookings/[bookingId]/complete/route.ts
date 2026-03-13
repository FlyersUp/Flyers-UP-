/**
 * POST /api/bookings/[bookingId]/complete
 * Pro submits job completion with 2 after photos (required before payment release).
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { createNotificationEvent } from '@/lib/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';

const MIN_AFTER_PHOTOS = 2;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;
  const id = normalizeUuidOrNull(bookingId);
  if (!id) return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });

  let body: { after_photo_urls: string[]; completion_note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const urls = Array.isArray(body.after_photo_urls) ? body.after_photo_urls : [];
  if (urls.length < MIN_AFTER_PHOTOS) {
    return NextResponse.json(
      { error: `At least ${MIN_AFTER_PHOTOS} after photos required` },
      { status: 400 }
    );
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
    .select('id, pro_id, customer_id, status')
    .eq('id', id)
    .eq('pro_id', proRow.id)
    .maybeSingle();

  if (bErr || !booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  if (String(booking.status) !== 'in_progress') {
    return NextResponse.json(
      { error: 'Booking must be in progress to complete' },
      { status: 409 }
    );
  }

  const { data: existing } = await admin
    .from('job_completions')
    .select('id')
    .eq('booking_id', id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, completionId: existing.id, alreadyRecorded: true });
  }

  const { data: completion, error: insertErr } = await admin
    .from('job_completions')
    .insert({
      booking_id: id,
      pro_id: proRow.id,
      after_photo_urls: urls.slice(0, 10),
      completion_note: body.completion_note?.trim() || null,
    })
    .select('id')
    .single();

  if (insertErr) {
    console.error('Job completion insert failed', insertErr);
    return NextResponse.json({ error: 'Failed to record completion' }, { status: 500 });
  }

  const now = new Date().toISOString();
  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const history = (booking as { status_history?: { status: string; at: string }[] }).status_history ?? [];
  const newHistory = [...history, { status: 'awaiting_remaining_payment', at: now }];

  const { data: statusUpdated } = await admin
    .from('bookings')
    .update({
      status: 'awaiting_remaining_payment',
      completed_at: now,
      completed_by_pro_at: now,
      remaining_due_at: in24h,
      auto_confirm_at: in24h,
      status_history: newHistory,
      status_updated_at: now,
      status_updated_by: user.id,
    })
    .eq('id', id)
    .eq('pro_id', proRow.id)
    .eq('status', 'in_progress')
    .select('id')
    .maybeSingle();

  if (!statusUpdated) {
    return NextResponse.json({
      ok: true,
      completionId: completion?.id,
      alreadyRecorded: true,
    });
  }

  const customerId = (booking as { customer_id?: string }).customer_id;
  if (customerId) {
    void createNotificationEvent({
      userId: customerId,
      type: NOTIFICATION_TYPES.BOOKING_COMPLETED,
      actorUserId: user.id,
      bookingId: id,
      titleOverride: 'Pro finished',
      bodyOverride: 'Confirm completion to release payout — or it auto-confirms in 24h',
      basePath: 'customer',
    });
  }

  try {
    await admin.from('booking_events').insert({
      booking_id: id,
      type: 'WORK_COMPLETED_BY_PRO',
      data: {},
    });
  } catch {
    // ignore
  }

  return NextResponse.json({
    ok: true,
    completionId: completion?.id,
  });
}
