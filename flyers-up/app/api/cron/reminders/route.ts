/**
 * Cron: reminders
 * Deposit: expiring in 10 min.
 * Remaining: due within 2h, or overdue.
 * Idempotent. Secured by CRON_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/cron/auth';
import { createSupabaseAdmin } from '@/lib/supabase/server-admin';
import { createNotification } from '@/lib/notify/create-notification';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEPOSIT_WINDOW_MINUTES = 10;
const REMAINING_SOON_HOURS = 2;
const REMINDER_COOLDOWN_MINUTES = 30;

export async function GET(req: NextRequest) {
  const authErr = requireCronSecret(req);
  if (authErr) return authErr;

  const admin = createSupabaseAdmin();
  const now = new Date();
  const cooldownStart = new Date(now.getTime() - REMINDER_COOLDOWN_MINUTES * 60 * 1000);
  let sent = 0;

  // 1) Deposit: awaiting_deposit_payment, payment_due_at within next 10 min
  const depositWindowEnd = new Date(now.getTime() + DEPOSIT_WINDOW_MINUTES * 60 * 1000);
  const { data: depositUpcoming, error: e1 } = await admin
    .from('bookings')
    .select('id, customer_id')
    .in('status', ['awaiting_deposit_payment', 'payment_required', 'accepted'])
    .is('paid_deposit_at', null)
    .gte('payment_due_at', now.toISOString())
    .lte('payment_due_at', depositWindowEnd.toISOString());

  if (!e1) {
    for (const b of depositUpcoming ?? []) {
      const { data: recent } = await admin
        .from('booking_events')
        .select('id')
        .eq('booking_id', b.id)
        .eq('type', 'DEPOSIT_REMINDER_SENT')
        .gte('created_at', cooldownStart.toISOString())
        .limit(1);
      if (recent?.length) continue;
      await admin.from('booking_events').insert({ booking_id: b.id, type: 'DEPOSIT_REMINDER_SENT', data: {} });
      await createNotification({ userId: b.customer_id, bookingId: b.id, type: 'deposit_reminder', title: 'Deposit expires soon', body: 'Deposit expires in 10 minutes' });
      sent++;
    }
  }

  // 2) Remaining: awaiting_remaining_payment, remaining_due_at within next 2 hours
  const remainingSoonEnd = new Date(now.getTime() + REMAINING_SOON_HOURS * 60 * 60 * 1000);
  const { data: remainingSoon, error: e2 } = await admin
    .from('bookings')
    .select('id, customer_id')
    .eq('status', 'awaiting_remaining_payment')
    .is('paid_remaining_at', null)
    .gte('remaining_due_at', now.toISOString())
    .lte('remaining_due_at', remainingSoonEnd.toISOString());

  if (!e2) {
    for (const b of remainingSoon ?? []) {
      const { data: recent } = await admin
        .from('booking_events')
        .select('id')
        .eq('booking_id', b.id)
        .eq('type', 'REMAINING_REMINDER_SOON')
        .gte('created_at', cooldownStart.toISOString())
        .limit(1);
      if (recent?.length) continue;
      await admin.from('booking_events').insert({ booking_id: b.id, type: 'REMAINING_REMINDER_SOON', data: {} });
      await createNotification({ userId: b.customer_id, bookingId: b.id, type: 'remaining_reminder', title: 'Remaining payment due soon', body: 'Remaining payment due soon' });
      sent++;
    }
  }

  // 3) Remaining: overdue (remaining_due_at < now)
  const { data: remainingOverdue, error: e3 } = await admin
    .from('bookings')
    .select('id, customer_id')
    .eq('status', 'awaiting_remaining_payment')
    .is('paid_remaining_at', null)
    .lt('remaining_due_at', now.toISOString());

  if (!e3) {
    for (const b of remainingOverdue ?? []) {
      const { data: recent } = await admin
        .from('booking_events')
        .select('id')
        .eq('booking_id', b.id)
        .eq('type', 'REMAINING_REMINDER_OVERDUE')
        .gte('created_at', cooldownStart.toISOString())
        .limit(1);
      if (recent?.length) continue;
      await admin.from('booking_events').insert({ booking_id: b.id, type: 'REMAINING_REMINDER_OVERDUE', data: {} });
      await createNotification({ userId: b.customer_id, bookingId: b.id, type: 'remaining_overdue', title: 'Remaining payment overdue', body: 'Remaining payment overdue — action required' });
      sent++;
    }
  }

  return NextResponse.json({ sent });
}
