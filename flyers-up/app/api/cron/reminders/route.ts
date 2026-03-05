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

  // 3) Booking reminders: 24h and 1h before service
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in1h = new Date(now.getTime() + 60 * 60 * 1000);
  const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);
  const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  const { data: upcoming24h } = await admin
    .from('bookings')
    .select('id, customer_id, pro_id, service_date, service_time, service_pros(user_id)')
    .in('status', ['accepted', 'pro_en_route', 'on_the_way', 'arrived', 'in_progress', 'deposit_paid'])
    .gte('service_date', now.toISOString().slice(0, 10))
    .lte('service_date', in24h.toISOString().slice(0, 10));

  for (const b of upcoming24h ?? []) {
    const svcDate = (b as { service_date?: string }).service_date;
    const svcTime = (b as { service_time?: string }).service_time;
    const dt = svcDate && svcTime ? new Date(`${svcDate}T${svcTime}`) : null;
    if (!dt || Number.isNaN(dt.getTime())) continue;
    const diffHours = (dt.getTime() - now.getTime()) / (60 * 60 * 1000);
    if (diffHours < 23 || diffHours > 25) continue;

    const { data: recent } = await admin
      .from('booking_events')
      .select('id')
      .eq('booking_id', b.id)
      .eq('type', 'BOOKING_REMINDER_24H')
      .limit(1);
    if (recent?.length) continue;

    await admin.from('booking_events').insert({ booking_id: b.id, type: 'BOOKING_REMINDER_24H', data: {} });
    await createNotification({
      userId: (b as { customer_id?: string }).customer_id,
      bookingId: b.id,
      type: 'booking_reminder',
      title: 'Booking tomorrow',
      body: 'Your booking is scheduled for tomorrow. Get ready!',
    });
    const proUserId = (b.service_pros as { user_id?: string })?.user_id;
    if (proUserId) {
      await createNotification({
        userId: proUserId,
        bookingId: b.id,
        type: 'booking_reminder',
        title: 'Job tomorrow',
        body: 'You have a job scheduled for tomorrow.',
      });
    }
    sent++;
  }

  const { data: upcoming1h } = await admin
    .from('bookings')
    .select('id, customer_id, pro_id, service_pros(user_id)')
    .in('status', ['accepted', 'pro_en_route', 'on_the_way', 'arrived', 'in_progress', 'deposit_paid'])
    .gte('service_date', now.toISOString().slice(0, 10))
    .lte('service_date', in2h.toISOString().slice(0, 10));

  for (const b of upcoming1h ?? []) {
    const svcDate = (b as { service_date?: string }).service_date;
    const svcTime = (b as { service_time?: string }).service_time;
    const dt = svcDate && svcTime ? new Date(`${svcDate}T${svcTime}`) : null;
    if (!dt || Number.isNaN(dt.getTime())) continue;
    const diffMins = (dt.getTime() - now.getTime()) / (60 * 1000);
    if (diffMins < 55 || diffMins > 65) continue;

    const { data: recent } = await admin
      .from('booking_events')
      .select('id')
      .eq('booking_id', b.id)
      .eq('type', 'BOOKING_REMINDER_1H')
      .limit(1);
    if (recent?.length) continue;

    await admin.from('booking_events').insert({ booking_id: b.id, type: 'BOOKING_REMINDER_1H', data: {} });
    await createNotification({
      userId: (b as { customer_id?: string }).customer_id,
      bookingId: b.id,
      type: 'booking_reminder',
      title: 'Booking in 1 hour',
      body: 'Your booking starts in about an hour.',
    });
    const proUserId = (b.service_pros as { user_id?: string })?.user_id;
    if (proUserId) {
      await createNotification({
        userId: proUserId,
        bookingId: b.id,
        type: 'booking_reminder',
        title: 'Job in 1 hour',
        body: 'Your job starts in about an hour.',
      });
    }
    sent++;
  }

  // 4) Remaining: overdue (remaining_due_at < now)
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
