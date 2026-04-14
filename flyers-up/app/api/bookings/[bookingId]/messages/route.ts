/**
 * POST /api/bookings/[bookingId]/messages
 * Booking-thread chat messages (customer ↔ assigned pro). Single choke point: auth, participant, block, rate limit, notify.
 */
import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { createNotificationEvent } from '@/lib/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';
import { messageLimiter } from '@/lib/rate-limit';
import {
  getBookingMessagingParties,
  otherPartyUserIdForBooking,
  rejectIfMessagingBlocked,
} from '@/lib/messaging/blockEnforcement';
import {
  CHAT_MESSAGE_ERROR_CODES,
  RECIPIENT_INACTIVE_MESSAGE,
  normalizeChatMessageBody,
} from '@/lib/messaging/chat-message-errors';
import { isProfileActiveForOperations } from '@/lib/account/lifecycle';
import { appendTrustSafetyAudit } from '@/lib/trust-safety/auditLog';
import { scanMessageForOffPlatformSignals } from '@/lib/retention/offPlatformMessageSignals';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_MESSAGE_LEN = 8000;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const id = normalizeUuidOrNull(bookingId);
    if (!id) return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const { success } = await messageLimiter.limit(`booking-msg:${user.id}:${ip}`);
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests', code: CHAT_MESSAGE_ERROR_CODES.RATE_LIMITED },
        { status: 429 }
      );
    }

    let body: { message?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const message =
      typeof body.message === 'string' ? normalizeChatMessageBody(body.message) : '';
    if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 });
    if (message.length > MAX_MESSAGE_LEN) {
      return NextResponse.json({ error: `message too long (max ${MAX_MESSAGE_LEN} characters)` }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();
    const { data: booking, error: bErr } = await admin
      .from('bookings')
      .select('id, customer_id, pro_id')
      .eq('id', id)
      .maybeSingle();

    if (bErr || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const { data: proRow } = await admin.from('service_pros').select('user_id').eq('id', booking.pro_id).maybeSingle();
    const proUserId = (proRow as { user_id?: string } | null)?.user_id ?? null;

    const isCustomer = booking.customer_id === user.id;
    const isPro = proUserId === user.id;

    if (!isCustomer && !isPro) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    const actualSenderRole = isCustomer ? 'customer' : 'pro';

    const parties = await getBookingMessagingParties(admin, {
      customer_id: booking.customer_id as string,
      pro_id: booking.pro_id as string,
    });
    if (!parties) {
      return NextResponse.json({ error: 'Invalid booking' }, { status: 500 });
    }

    const otherUserId = otherPartyUserIdForBooking(parties, user.id);
    if (otherUserId) {
      const { data: otherProfile } = await admin
        .from('profiles')
        .select('account_status')
        .eq('id', otherUserId)
        .maybeSingle();
      const st = (otherProfile as { account_status?: string | null } | null)?.account_status;
      if (!isProfileActiveForOperations(st)) {
        return NextResponse.json(
          { error: RECIPIENT_INACTIVE_MESSAGE, code: CHAT_MESSAGE_ERROR_CODES.RECIPIENT_INACTIVE },
          { status: 403 }
        );
      }
    }

    const blockedRes = await rejectIfMessagingBlocked(
      admin,
      user.id,
      otherUserId,
      'POST /api/bookings/[id]/messages',
      { bookingId: id }
    );
    if (blockedRes) return blockedRes;

    const { data: msg, error: insertErr } = await admin
      .from('booking_messages')
      .insert({
        booking_id: id,
        sender_id: user.id,
        sender_role: actualSenderRole,
        message,
      })
      .select('id')
      .single();

    if (insertErr) {
      console.error('[bookings/messages] insert failed:', insertErr);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    const recipientUserId = actualSenderRole === 'customer' ? proUserId : booking.customer_id;

    if (recipientUserId) {
      void createNotificationEvent({
        userId: recipientUserId,
        type: NOTIFICATION_TYPES.MESSAGE_RECEIVED,
        actorUserId: user.id,
        bookingId: id,
        messageId: msg.id,
        basePath: actualSenderRole === 'customer' ? 'pro' : 'customer',
        dedupeKey: `booking_message:${id}:${msg.id}`,
      });
    }

    const { signal } = scanMessageForOffPlatformSignals(message);
    let trustNudge: { kind: 'stay_on_platform_info'; signalCategory: string } | undefined;
    if (signal) {
      const normalized = message.toLowerCase().trim().slice(0, 500);
      const messageFingerprint = createHash('sha256').update(normalized).digest('hex').slice(0, 24);
      void appendTrustSafetyAudit(admin, {
        resource_type: 'booking',
        resource_id: id,
        action: 'off_platform_chat_signal_detected',
        actor_user_id: user.id,
        details: {
          signal_category: signal,
          sender_role: actualSenderRole,
          message_fingerprint: messageFingerprint,
        },
      });
      const { error: sigErr } = await admin.from('messaging_trust_signals').insert({
        booking_id: id,
        actor_user_id: user.id,
        signal_category: signal,
        intervention_kind: 'inline_reminder',
        message_fingerprint: messageFingerprint,
      });
      if (sigErr) {
        console.warn('[bookings/messages] messaging_trust_signals insert failed', sigErr);
      }
      trustNudge = { kind: 'stay_on_platform_info', signalCategory: signal };
    }

    return NextResponse.json({ ok: true, message: msg, trustNudge });
  } catch (err) {
    console.error('[bookings/messages] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
