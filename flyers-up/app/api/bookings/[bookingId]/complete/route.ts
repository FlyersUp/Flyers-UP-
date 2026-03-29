/**
 * POST /api/bookings/[bookingId]/complete
 * Pro submits job completion with 2 after photos (required before payment release).
 * Sets suspicious_completion when start->complete duration is below category minimum.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { createNotificationEvent } from '@/lib/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';
import { getMinimumDurationMinutes } from '@/lib/bookings/category-rules';
import { allMilestonesReadyForProFinalCompletion } from '@/lib/bookings/milestone-workflow';

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
    .select('id, pro_id, customer_id, status, started_at, status_history, is_multi_day, auto_confirm_window_hours')
    .eq('id', id)
    .eq('pro_id', proRow.id)
    .maybeSingle();

  if (bErr || !booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  let categorySlug: string | null = null;
  const { data: proRow2 } = await admin
    .from('service_pros')
    .select('category_id')
    .eq('id', booking.pro_id)
    .maybeSingle();
  const catId = (proRow2 as { category_id?: string } | null)?.category_id;
  if (catId) {
    const { data: cat } = await admin.from('service_categories').select('slug').eq('id', catId).maybeSingle();
    categorySlug = (cat as { slug?: string } | null)?.slug ?? null;
  }

  if (String(booking.status) !== 'in_progress') {
    return NextResponse.json(
      { error: 'Booking must be in progress to complete' },
      { status: 409 }
    );
  }

  const isMulti = (booking as { is_multi_day?: boolean }).is_multi_day === true;
  if (isMulti) {
    const { data: ms } = await admin
      .from('booking_milestones')
      .select('milestone_index, status, dispute_open')
      .eq('booking_id', id);
    const list = ms ?? [];
    if (list.length === 0) {
      return NextResponse.json(
        { error: 'Multi-day jobs need at least one milestone before final completion', code: 'milestones_required' },
        { status: 409 }
      );
    }
    if (!allMilestonesReadyForProFinalCompletion(list)) {
      return NextResponse.json(
        {
          error: 'All milestones must be customer- or auto-confirmed before final completion',
          code: 'milestones_incomplete',
        },
        { status: 409 }
      );
    }
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

  const now = new Date();
  const nowIso = now.toISOString();
  const winH = Math.max(
    1,
    Math.min(168, Number((booking as { auto_confirm_window_hours?: number }).auto_confirm_window_hours ?? 24) || 24)
  );
  const inConfirm = new Date(now.getTime() + winH * 60 * 60 * 1000).toISOString();
  const history = (booking as { status_history?: { status: string; at: string }[] }).status_history ?? [];
  const newHistory = [...history, { status: 'awaiting_remaining_payment', at: nowIso }];

  const startedAt = (booking as { started_at?: string | null }).started_at;
  const minDuration = getMinimumDurationMinutes(categorySlug);
  let suspiciousCompletion = false;
  let suspiciousCompletionReason: string | null = null;
  if (startedAt) {
    const startTs = new Date(startedAt).getTime();
    const durationMinutes = (now.getTime() - startTs) / (60 * 1000);
    if (durationMinutes < minDuration) {
      suspiciousCompletion = true;
      suspiciousCompletionReason = 'too_fast';
    }
  }
  const updatePayload: Record<string, unknown> = {
    status: 'awaiting_remaining_payment',
    completed_at: nowIso,
    completed_by_pro_at: nowIso,
    remaining_due_at: inConfirm,
    auto_confirm_at: inConfirm,
    status_history: newHistory,
    status_updated_at: nowIso,
    status_updated_by: user.id,
    completion_submitted_at: nowIso,
    suspicious_completion: suspiciousCompletion,
    suspicious_completion_reason: suspiciousCompletionReason,
    minimum_expected_duration_minutes: minDuration,
  };

  if (isMulti) {
    updatePayload.final_completion_requested_at = nowIso;
    updatePayload.final_auto_confirm_at = inConfirm;
    updatePayload.progress_status = 'final_pending_confirmation';
  }

  const { data: statusUpdated } = await admin
    .from('bookings')
    .update(updatePayload)
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

  if (suspiciousCompletion) {
    try {
      await admin.from('payout_review_queue').upsert(
        {
          booking_id: id,
          reason: 'suspicious_completion',
          details: { reason: suspiciousCompletionReason, minDuration },
          status: 'pending',
        },
        { onConflict: 'booking_id' }
      );
    } catch {
      // ignore; table may not exist yet
    }
  }

  return NextResponse.json({
    ok: true,
    completionId: completion?.id,
  });
}
