/**
 * Cron: milestone-auto-confirm
 * TypeScript guardrails (same as before), then booking_milestone_auto_confirm_atomic for the row update + event + booking progress (one transaction, row locks).
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/cron/auth';
import { createSupabaseAdmin } from '@/lib/supabase/server-admin';
import { isMilestoneAutoConfirmAllowed } from '@/lib/bookings/auto-confirm';
import { parseMilestoneAtomicRpc } from '@/lib/bookings/milestone-rpc';
import { createNotification } from '@/lib/notify/create-notification';
import { createNotificationEvent } from '@/lib/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authErr = requireCronSecret(req);
  if (authErr) return authErr;

  const admin = createSupabaseAdmin();
  const now = new Date().toISOString();

  const { data: rows, error } = await admin
    .from('booking_milestones')
    .select('id, booking_id, milestone_index, status, confirmation_due_at, dispute_open')
    .eq('status', 'completed_pending_confirmation')
    .eq('dispute_open', false)
    .not('confirmation_due_at', 'is', null)
    .lt('confirmation_due_at', now);

  if (error) {
    console.error('[cron/milestone-auto-confirm] query failed', error);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  let confirmed = 0;
  let skipped = 0;
  for (const row of rows ?? []) {
    const { data: booking } = await admin
      .from('bookings')
      .select(
        'id, customer_id, pro_id, dispute_open, cancellation_reason, suspicious_completion, arrived_at, arrival_verified, started_at, completed_at'
      )
      .eq('id', row.booking_id)
      .maybeSingle();

    if (!booking || booking.dispute_open) continue;

    const { data: proRow } = await admin
      .from('service_pros')
      .select('category_id, user_id')
      .eq('id', booking.pro_id)
      .maybeSingle();
    const catId = (proRow as { category_id?: string; user_id?: string } | null)?.category_id;
    const proUserIdForNotify = (proRow as { user_id?: string } | null)?.user_id;
    let categorySlug: string | null = null;
    if (catId) {
      const { data: cat } = await admin.from('service_categories').select('slug').eq('id', catId).maybeSingle();
      categorySlug = (cat as { slug?: string } | null)?.slug ?? null;
    }

    const { data: incidents } = await admin
      .from('pro_booking_incidents')
      .select('id')
      .eq('booking_id', booking.id)
      .limit(1);
    const hasLatenessIncident = (incidents?.length ?? 0) > 0;

    const { data: rel } = await admin
      .from('pro_reliability')
      .select('reliability_score')
      .eq('pro_id', booking.pro_id)
      .maybeSingle();

    const allowed = isMilestoneAutoConfirmAllowed({
      booking: {
        dispute_open: booking.dispute_open,
        cancellation_reason: (booking as { cancellation_reason?: string | null }).cancellation_reason ?? null,
        suspicious_completion: (booking as { suspicious_completion?: boolean }).suspicious_completion,
        arrived_at: (booking as { arrived_at?: string | null }).arrived_at ?? null,
        arrival_verified: (booking as { arrival_verified?: boolean }).arrival_verified,
        started_at: (booking as { started_at?: string | null }).started_at ?? null,
        completed_at: (booking as { completed_at?: string | null }).completed_at ?? null,
        category_slug: categorySlug,
      },
      proReliability: rel,
      hasLatenessIncidentOnBooking: hasLatenessIncident,
      jobCompletion: null,
    });

    if (!allowed.allowed) continue;

    const { data: rpcData, error: rpcErr } = await admin.rpc('booking_milestone_auto_confirm_atomic', {
      p_booking_id: row.booking_id,
      p_milestone_index: row.milestone_index,
    });

    if (rpcErr) {
      console.error('[cron/milestone-auto-confirm] rpc', row.booking_id, row.milestone_index, rpcErr);
      skipped++;
      continue;
    }

    const parsed = parseMilestoneAtomicRpc(rpcData);
    if (!parsed.ok) {
      skipped++;
      continue;
    }

    if (parsed.idempotent) {
      skipped++;
      continue;
    }

    await createNotification({
      userId: booking.customer_id,
      bookingId: booking.id,
      type: 'booking_auto_confirmed',
      title: 'Milestone auto-confirmed',
      body: 'A milestone was auto-confirmed after the review window.',
    });

    if (proUserIdForNotify) {
      void createNotificationEvent({
        userId: proUserIdForNotify,
        type: NOTIFICATION_TYPES.BOOKING_CONFIRMED,
        bookingId: booking.id,
        titleOverride: 'Milestone auto-confirmed',
        bodyOverride: 'A milestone was auto-confirmed after the review window.',
        basePath: 'pro',
      });
    }

    confirmed++;
  }

  return NextResponse.json({ confirmed, skipped, total: rows?.length ?? 0 });
}
