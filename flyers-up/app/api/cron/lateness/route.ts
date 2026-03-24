/**
 * Cron: lateness
 * Scans active bookings around scheduled start time. Applies lateness thresholds:
 * +15 min: first warning to pro
 * +30 min: severe warning to pro + customer notice
 * +60 min: no_show_eligible_at set (customer can cancel penalty-free)
 *
 * Idempotent: does not duplicate warning sends.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/cron/auth';
import { createSupabaseAdmin } from '@/lib/supabase/server-admin';
import { createNotificationEvent } from '@/lib/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GRACE_MINUTES = 60;
const WARNING_15_MIN = 15;
const WARNING_30_MIN = 30;

export async function GET(req: NextRequest) {
  const authErr = requireCronSecret(req);
  if (authErr) return authErr;

  const admin = createSupabaseAdmin();
  const now = new Date();
  const nowIso = now.toISOString();

  // Bookings: deposit_paid, no arrived_at, scheduled_start in the past
  const { data: lateBookings, error } = await admin
    .from('bookings')
    .select(
      'id, pro_id, customer_id, scheduled_start_at, grace_period_minutes, late_warning_sent_at, severe_late_warning_sent_at, no_show_eligible_at, service_pros(user_id)'
    )
    .in('status', ['deposit_paid', 'awaiting_pro_arrival', 'pro_en_route', 'on_the_way'])
    .is('arrived_at', null)
    .not('scheduled_start_at', 'is', null)
    .lt('scheduled_start_at', nowIso);

  if (error) {
    console.error('[cron/lateness] query failed', error);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  let warnings15 = 0;
  let warnings30 = 0;
  let noShowEligible = 0;

  for (const b of lateBookings ?? []) {
    const scheduledStart = new Date((b.scheduled_start_at as string));
    const graceMins = (b.grace_period_minutes as number) ?? GRACE_MINUTES;
    const minutesLate = (now.getTime() - scheduledStart.getTime()) / (60 * 1000);

    const proUserId = (b.service_pros as { user_id?: string } | null)?.user_id;
    const customerId = b.customer_id as string;

    // +15 min: first warning (idempotent)
    if (minutesLate >= WARNING_15_MIN && !(b.late_warning_sent_at as string | null)) {
      const { error: updErr } = await admin
        .from('bookings')
        .update({ late_warning_sent_at: nowIso })
        .eq('id', b.id)
        .is('late_warning_sent_at', null);

      if (!updErr) {
        if (proUserId) {
          void createNotificationEvent({
            userId: proUserId,
            type: NOTIFICATION_TYPES.BOOKING_ON_THE_WAY,
            bookingId: b.id,
            titleOverride: 'Your customer is waiting',
            bodyOverride:
              'Arrive or update your ETA now. Repeated lateness lowers your ranking.',
            basePath: 'pro',
          });
        }
        warnings15++;
      }
    }

    // +30 min: severe warning (idempotent)
    if (minutesLate >= WARNING_30_MIN && !(b.severe_late_warning_sent_at as string | null)) {
      const { error: updErr } = await admin
        .from('bookings')
        .update({ severe_late_warning_sent_at: nowIso })
        .eq('id', b.id)
        .is('severe_late_warning_sent_at', null);

      if (!updErr) {
        if (proUserId) {
          void createNotificationEvent({
            userId: proUserId,
            type: NOTIFICATION_TYPES.BOOKING_ON_THE_WAY,
            bookingId: b.id,
            titleOverride: 'You are significantly late',
            bodyOverride: `If you do not check in by ${graceMins} minutes after the scheduled start, the customer may cancel without penalty and this may count as a no-show.`,
            basePath: 'pro',
          });
        }
        if (customerId) {
          const noShowAt = new Date(scheduledStart.getTime() + graceMins * 60 * 1000);
          void createNotificationEvent({
            userId: customerId,
            type: NOTIFICATION_TYPES.BOOKING_ON_THE_WAY,
            bookingId: b.id,
            titleOverride: 'Your pro appears delayed',
            bodyOverride: `We've notified them. You can cancel penalty-free if they do not arrive by ${noShowAt.toLocaleTimeString()}.`,
            basePath: 'customer',
          });
        }
        warnings30++;
      }
    }

    // +grace: no_show_eligible (idempotent)
    if (minutesLate >= graceMins && !(b.no_show_eligible_at as string | null)) {
      const noShowAt = new Date(scheduledStart.getTime() + graceMins * 60 * 1000);
      const { error: updErr } = await admin
        .from('bookings')
        .update({ no_show_eligible_at: noShowAt.toISOString() })
        .eq('id', b.id)
        .is('no_show_eligible_at', null);

      if (!updErr) {
        if (proUserId) {
          void createNotificationEvent({
            userId: proUserId,
            type: NOTIFICATION_TYPES.BOOKING_ON_THE_WAY,
            bookingId: b.id,
            titleOverride: 'No-show risk',
            bodyOverride: 'This booking is now at risk of cancellation due to no-show. Your reliability score may be reduced.',
            basePath: 'pro',
          });
        }
        if (customerId) {
          void createNotificationEvent({
            userId: customerId,
            type: NOTIFICATION_TYPES.BOOKING_ON_THE_WAY,
            bookingId: b.id,
            titleOverride: 'Pro has not arrived',
            bodyOverride: 'You can now cancel penalty-free.',
            basePath: 'customer',
          });
        }
        noShowEligible++;
      }
    }
  }

  return NextResponse.json({
    warnings15,
    warnings30,
    noShowEligible,
    total: lateBookings?.length ?? 0,
  });
}
