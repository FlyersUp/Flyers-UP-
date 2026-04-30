/**
 * Apple Review Demo Mode (reviewer@flyersup.app only)
 * Server-side booking automation: auto-accept, demo messaging, status progression, simulated deposit.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { createNotificationEvent } from '@/lib/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';
import { isAppleAppReviewAccountEmail } from '@/lib/appleAppReviewAccount';

export function bookingRowIsAppReviewDemo(row: { app_review_demo?: boolean | null } | null | undefined): boolean {
  return row?.app_review_demo === true;
}

/** After insert: accept + pro message + customer notification (reviewer demo bookings only). */
export async function applyAppleReviewDemoPostCreate(
  admin: SupabaseClient,
  opts: {
    bookingId: string;
    proUserId: string;
    customerUserId: string;
  }
): Promise<void> {
  const now = new Date().toISOString();
  const { data: row } = await admin.from('bookings').select('status_history').eq('id', opts.bookingId).maybeSingle();
  const prev = (row as { status_history?: unknown } | null)?.status_history;
  const hist = Array.isArray(prev) ? [...prev] : [];
  hist.push({ status: 'accepted', at: now });

  await admin
    .from('bookings')
    .update({
      status: 'accepted',
      accepted_at: now,
      status_history: hist,
    })
    .eq('id', opts.bookingId);

  await admin.from('booking_messages').insert({
    booking_id: opts.bookingId,
    sender_id: opts.proUserId,
    sender_role: 'pro',
    message:
      "I've accepted your request. Hey! I'll be there at the scheduled time 👍",
  });

  void createNotificationEvent({
    userId: opts.customerUserId,
    type: NOTIFICATION_TYPES.BOOKING_ACCEPTED,
    bookingId: opts.bookingId,
    basePath: 'customer',
    actorUserId: opts.proUserId,
  });
}

type DemoStepResult = { ok: true; status: string } | { ok: false; error: string };

/**
 * Advance one lifecycle step for a demo booking (reviewer-owned, app_review_demo = true).
 */
export async function advanceAppleReviewDemoBooking(
  admin: SupabaseClient,
  opts: { bookingId: string; reviewerUserId: string }
): Promise<DemoStepResult> {
  const { data: booking, error } = await admin
    .from('bookings')
    .select('id, customer_id, status, status_history, app_review_demo')
    .eq('id', opts.bookingId)
    .maybeSingle();

  if (error || !booking) return { ok: false, error: 'Booking not found' };
  if (String(booking.customer_id) !== opts.reviewerUserId) {
    return { ok: false, error: 'Forbidden' };
  }
  if (!bookingRowIsAppReviewDemo(booking as { app_review_demo?: boolean })) {
    return { ok: false, error: 'Not a demo booking' };
  }

  const cur = String((booking as { status?: string }).status ?? '');
  const now = new Date().toISOString();
  const prevHist = (booking as { status_history?: unknown }).status_history;
  const hist = Array.isArray(prevHist) ? [...prevHist] : [];

  const push = (s: string) => {
    hist.push({ status: s, at: now });
  };

  type Patch = Record<string, unknown>;
  let nextStatus: string | null = null;
  let patch: Patch = {};

  if (cur === 'accepted' || cur === 'awaiting_deposit_payment' || cur === 'payment_required') {
    nextStatus = 'deposit_paid';
    patch = {
      status: 'deposit_paid',
      paid_deposit_at: now,
      payment_status: 'PAID',
    };
    push('deposit_paid');
  } else if (cur === 'deposit_paid') {
    nextStatus = 'pro_en_route';
    patch = {
      status: 'pro_en_route',
      on_the_way_at: now,
      en_route_at: now,
    };
    push('pro_en_route');
    void createNotificationEvent({
      userId: opts.reviewerUserId,
      type: NOTIFICATION_TYPES.BOOKING_ON_THE_WAY,
      bookingId: opts.bookingId,
      basePath: 'customer',
    });
  } else if (cur === 'pro_en_route' || cur === 'on_the_way') {
    nextStatus = 'in_progress';
    patch = {
      status: 'in_progress',
      started_at: now,
    };
    push('in_progress');
    void createNotificationEvent({
      userId: opts.reviewerUserId,
      type: NOTIFICATION_TYPES.BOOKING_STARTED,
      bookingId: opts.bookingId,
      basePath: 'customer',
    });
  } else if (cur === 'in_progress') {
    nextStatus = 'completed';
    patch = {
      status: 'completed',
      completed_at: now,
      payment_status: 'PAID',
    };
    push('completed');
    void createNotificationEvent({
      userId: opts.reviewerUserId,
      type: NOTIFICATION_TYPES.BOOKING_COMPLETED,
      bookingId: opts.bookingId,
      basePath: 'customer',
    });
  } else {
    return { ok: false, error: `No demo transition from status "${cur}"` };
  }

  const { error: upErr } = await admin
    .from('bookings')
    .update({
      ...patch,
      status_history: hist,
    })
    .eq('id', opts.bookingId);

  if (upErr) return { ok: false, error: upErr.message ?? 'Update failed' };
  return { ok: true, status: nextStatus! };
}

export { isAppleAppReviewAccountEmail };
