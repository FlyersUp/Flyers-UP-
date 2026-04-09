/**
 * POST /api/conversations/[conversationId]/messages - Send a message
 * Inserts message and creates message.received notification for recipient.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { createNotificationEvent } from '@/lib/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';
import { messageLimiter } from '@/lib/rate-limit';
import { rejectIfMessagingBlocked } from '@/lib/messaging/blockEnforcement';
import {
  CHAT_MESSAGE_ERROR_CODES,
  RECIPIENT_INACTIVE_MESSAGE,
  normalizeChatMessageBody,
} from '@/lib/messaging/chat-message-errors';
import { isProfileActiveForOperations } from '@/lib/account/lifecycle';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const { success } = await messageLimiter.limit(`msg:${user.id}:${ip}`);
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests', code: CHAT_MESSAGE_ERROR_CODES.RATE_LIMITED },
        { status: 429 }
      );
    }

    const { conversationId } = await params;
    if (!conversationId) return NextResponse.json({ error: 'conversationId required' }, { status: 400 });

    let body: { message?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const message =
      typeof body.message === 'string' ? normalizeChatMessageBody(body.message) : '';
    if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 });

    const admin = createAdminSupabaseClient();
    const { data: conv, error: convErr } = await admin
      .from('conversations')
      .select('id, customer_id, pro_id')
      .eq('id', conversationId)
      .maybeSingle();

    if (convErr || !conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    let proUserId: string | null = null;
    if (conv.pro_id) {
      const { data: proRow } = await admin.from('service_pros').select('user_id').eq('id', conv.pro_id).maybeSingle();
      proUserId = (proRow as { user_id?: string } | null)?.user_id ?? null;
    }
    const isCustomer = conv.customer_id === user.id;
    const isPro = proUserId === user.id;

    if (!isCustomer && !isPro) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    const actualSenderRole = isCustomer ? 'customer' : 'pro';
    const otherUserId = actualSenderRole === 'customer' ? proUserId : conv.customer_id;
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
      'POST /api/conversations/[id]/messages'
    );
    if (blockedRes) return blockedRes;

    const { data: msg, error: insertErr } = await admin
      .from('conversation_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        sender_role: actualSenderRole,
        message,
      })
      .select('id')
      .single();

    if (insertErr) {
      console.error('[conversations/messages] insert failed:', insertErr);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    const recipientUserId = actualSenderRole === 'customer' ? proUserId : conv.customer_id;

    if (recipientUserId) {
      void createNotificationEvent({
        userId: recipientUserId,
        type: NOTIFICATION_TYPES.MESSAGE_RECEIVED,
        actorUserId: user.id,
        conversationId,
        messageId: msg.id,
        basePath: actualSenderRole === 'customer' ? 'pro' : 'customer',
        dedupeKey: `message:${conversationId}:${msg.id}`,
      });
    }

    return NextResponse.json({ ok: true, message: msg });
  } catch (err) {
    console.error('[conversations/messages] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
