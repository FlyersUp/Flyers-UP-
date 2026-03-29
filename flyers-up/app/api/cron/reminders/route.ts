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
import { parseBookingStart } from '@/lib/calendar/time-utils';
import { DEFAULT_BOOKING_TIMEZONE, serviceDatePrefetchRange } from '@/lib/datetime';
import { OCCURRENCE_REMINDER_ELIGIBLE_STATUSES } from '@/lib/recurring/constants';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Same active job statues as before, plus recurring rows still in `requested` (materialized from a plan). */
const BOOKING_REMINDER_STATUS_OR =
  'status.in.(accepted,pro_en_route,on_the_way,arrived,in_progress,deposit_paid),and(is_recurring.eq.true,status.eq.requested)';

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

  // 3) Booking reminders: 24h and 1h before service (wide service_date filter; exact windows via parseBookingStart)
  const { min: svcDateMin, max: svcDateMax } = serviceDatePrefetchRange(DEFAULT_BOOKING_TIMEZONE);

  const { data: upcoming24h } = await admin
    .from('bookings')
    .select(
      'id, customer_id, pro_id, service_date, service_time, booking_timezone, service_pros(user_id)'
    )
    .or(BOOKING_REMINDER_STATUS_OR)
    .gte('service_date', svcDateMin)
    .lte('service_date', svcDateMax);

  for (const b of upcoming24h ?? []) {
    const svcDate = (b as { service_date?: string }).service_date;
    const svcTime = (b as { service_time?: string }).service_time;
    const tz =
      (b as { booking_timezone?: string | null }).booking_timezone?.trim() ||
      DEFAULT_BOOKING_TIMEZONE;
    const dt = svcDate && svcTime ? parseBookingStart(svcDate, svcTime, tz) : null;
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
    const customerId = (b as { customer_id?: string }).customer_id;
    if (customerId) {
      await createNotification({
        userId: customerId,
        bookingId: b.id,
        type: 'booking_reminder',
        title: 'Booking tomorrow',
        body: 'Your booking is scheduled for tomorrow. Get ready!',
      });
    }
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
    .select(
      'id, customer_id, pro_id, service_date, service_time, booking_timezone, service_pros(user_id)'
    )
    .or(BOOKING_REMINDER_STATUS_OR)
    .gte('service_date', svcDateMin)
    .lte('service_date', svcDateMax);

  for (const b of upcoming1h ?? []) {
    const svcDate = (b as { service_date?: string }).service_date;
    const svcTime = (b as { service_time?: string }).service_time;
    const tz =
      (b as { booking_timezone?: string | null }).booking_timezone?.trim() ||
      DEFAULT_BOOKING_TIMEZONE;
    const dt = svcDate && svcTime ? parseBookingStart(svcDate, svcTime, tz) : null;
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
    const customerId1h = (b as { customer_id?: string }).customer_id;
    if (customerId1h) {
      await createNotification({
        userId: customerId1h,
        bookingId: b.id,
        type: 'booking_reminder',
        title: 'Booking in 1 hour',
        body: 'Your booking starts in about an hour.',
      });
    }
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

  // 3b) 2h before, 30m before, starts now
  const { data: upcoming2h } = await admin
    .from('bookings')
    .select(
      'id, customer_id, service_date, service_time, booking_timezone, service_pros(user_id)'
    )
    .or(BOOKING_REMINDER_STATUS_OR)
    .gte('service_date', svcDateMin)
    .lte('service_date', svcDateMax);

  for (const b of upcoming2h ?? []) {
    const svcDate = (b as { service_date?: string }).service_date;
    const svcTime = (b as { service_time?: string }).service_time;
    const tz =
      (b as { booking_timezone?: string | null }).booking_timezone?.trim() ||
      DEFAULT_BOOKING_TIMEZONE;
    const dt = svcDate && svcTime ? parseBookingStart(svcDate, svcTime, tz) : null;
    if (!dt || Number.isNaN(dt.getTime())) continue;
    const diffMins = (dt.getTime() - now.getTime()) / (60 * 1000);

    const customerId = (b as { customer_id?: string }).customer_id;
    const proUserId = (b.service_pros as { user_id?: string })?.user_id;

    if (diffMins >= 110 && diffMins <= 130) {
      const { data: recent } = await admin.from('booking_events').select('id').eq('booking_id', b.id).eq('type', 'BOOKING_REMINDER_2H').limit(1);
      if (recent?.length) continue;
      await admin.from('booking_events').insert({ booking_id: b.id, type: 'BOOKING_REMINDER_2H', data: {} });
      if (customerId) await createNotification({ userId: customerId, bookingId: b.id, type: 'booking_reminder', title: 'Booking in 2 hours', body: 'Your booking starts in 2 hours.' });
      if (proUserId) await createNotification({ userId: proUserId, bookingId: b.id, type: 'booking_reminder', title: 'Job in 2 hours', body: 'Your job starts in 2 hours.' });
      sent++;
    } else if (diffMins >= 25 && diffMins <= 35) {
      const { data: recent } = await admin.from('booking_events').select('id').eq('booking_id', b.id).eq('type', 'BOOKING_REMINDER_30M').limit(1);
      if (recent?.length) continue;
      await admin.from('booking_events').insert({ booking_id: b.id, type: 'BOOKING_REMINDER_30M', data: {} });
      if (customerId) await createNotification({ userId: customerId, bookingId: b.id, type: 'booking_reminder', title: 'Booking in 30 minutes', body: 'Your booking starts in 30 minutes.' });
      if (proUserId) await createNotification({ userId: proUserId, bookingId: b.id, type: 'booking_reminder', title: 'Job in 30 minutes', body: 'Your job starts in 30 minutes.' });
      sent++;
    } else if (diffMins >= -5 && diffMins <= 5) {
      const { data: recent } = await admin.from('booking_events').select('id').eq('booking_id', b.id).eq('type', 'BOOKING_REMINDER_NOW').limit(1);
      if (recent?.length) continue;
      await admin.from('booking_events').insert({ booking_id: b.id, type: 'BOOKING_REMINDER_NOW', data: {} });
      if (customerId) await createNotification({ userId: customerId, bookingId: b.id, type: 'booking_reminder', title: 'Booking starting now', body: 'Your booking is scheduled to start now.' });
      if (proUserId) await createNotification({ userId: proUserId, bookingId: b.id, type: 'booking_reminder', title: 'Job starting now', body: 'Your job is scheduled to start now.' });
      sent++;
    }
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

  // 5) Recurring occurrences without a materialized booking yet (same windows as booking reminders)
  const occHorizonEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
  const { data: occRows } = await admin
    .from('recurring_occurrences')
    .select('id, customer_user_id, pro_user_id, scheduled_start_at, recurring_series!inner(status)')
    .eq('recurring_series.status', 'approved')
    .in('status', [...OCCURRENCE_REMINDER_ELIGIBLE_STATUSES])
    .is('booking_id', null)
    .gte('scheduled_start_at', now.toISOString())
    .lte('scheduled_start_at', occHorizonEnd);

  async function sendOccReminder(
    occurrenceId: string,
    customerId: string,
    proUserId: string,
    eventType: string,
    titleC: string,
    bodyC: string,
    titleP: string,
    bodyP: string
  ) {
    const { data: recent } = await admin
      .from('recurring_reminder_events')
      .select('id')
      .eq('recurring_occurrence_id', occurrenceId)
      .eq('event_type', eventType)
      .limit(1);
    if (recent?.length) return;
    await admin.from('recurring_reminder_events').insert({ recurring_occurrence_id: occurrenceId, event_type: eventType });
    await createNotification({
      userId: customerId,
      bookingId: null,
      type: NOTIFICATION_TYPES.RECURRING_OCCURRENCE_REMINDER,
      title: titleC,
      body: bodyC,
    });
    await createNotification({
      userId: proUserId,
      bookingId: null,
      type: NOTIFICATION_TYPES.RECURRING_OCCURRENCE_REMINDER,
      title: titleP,
      body: bodyP,
    });
    sent += 2;
  }

  for (const raw of occRows ?? []) {
    const row = raw as {
      id: string;
      customer_user_id: string;
      pro_user_id: string;
      scheduled_start_at: string;
    };
    const startMs = new Date(row.scheduled_start_at).getTime();
    if (Number.isNaN(startMs)) continue;
    const diffMins = (startMs - now.getTime()) / (60 * 1000);
    const diffHours = diffMins / 60;

    if (diffHours >= 23 && diffHours <= 25) {
      await sendOccReminder(
        row.id,
        row.customer_user_id,
        row.pro_user_id,
        'RECURRING_OCC_24H',
        'Repeat visit tomorrow',
        'A recurring visit is scheduled for tomorrow.',
        'Repeat job tomorrow',
        'You have a recurring job scheduled for tomorrow.'
      );
    } else if (diffMins >= 55 && diffMins <= 65) {
      await sendOccReminder(
        row.id,
        row.customer_user_id,
        row.pro_user_id,
        'RECURRING_OCC_1H',
        'Repeat visit in 1 hour',
        'Your recurring visit starts in about an hour.',
        'Recurring job in 1 hour',
        'Your recurring job starts in about an hour.'
      );
    } else if (diffMins >= 110 && diffMins <= 130) {
      await sendOccReminder(
        row.id,
        row.customer_user_id,
        row.pro_user_id,
        'RECURRING_OCC_2H',
        'Repeat visit in 2 hours',
        'Your recurring visit starts in about 2 hours.',
        'Recurring job in 2 hours',
        'Your recurring job starts in about 2 hours.'
      );
    } else if (diffMins >= 25 && diffMins <= 35) {
      await sendOccReminder(
        row.id,
        row.customer_user_id,
        row.pro_user_id,
        'RECURRING_OCC_30M',
        'Repeat visit in 30 minutes',
        'Your recurring visit starts in 30 minutes.',
        'Recurring job in 30 minutes',
        'Your recurring job starts in 30 minutes.'
      );
    } else if (diffMins >= -5 && diffMins <= 5) {
      await sendOccReminder(
        row.id,
        row.customer_user_id,
        row.pro_user_id,
        'RECURRING_OCC_NOW',
        'Repeat visit starting now',
        'Your recurring visit is scheduled to start now.',
        'Recurring job starting now',
        'Your recurring job is scheduled to start now.'
      );
    }
  }

  return NextResponse.json({ sent });
}
