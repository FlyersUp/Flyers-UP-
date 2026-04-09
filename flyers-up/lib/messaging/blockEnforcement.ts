/**
 * Server-only: bidirectional block checks for user-to-user messaging (API routes).
 */
import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { appendTrustSafetyAudit } from '@/lib/trust-safety/auditLog';
import { CHAT_MESSAGE_ERROR_CODES } from '@/lib/messaging/chat-message-errors';
import { MESSAGING_BLOCKED_USER_MESSAGE } from '@/lib/messaging/messaging-blocked-copy';

type AdminClient = ReturnType<typeof createAdminSupabaseClient>;

export async function isMessagingBlockedBetween(
  admin: AdminClient,
  userId: string,
  otherUserId: string
): Promise<boolean> {
  if (!userId || !otherUserId || userId === otherUserId) return false;
  const [ab, ba] = await Promise.all([
    admin.from('blocked_users').select('id').eq('blocker_id', userId).eq('blocked_user_id', otherUserId).maybeSingle(),
    admin.from('blocked_users').select('id').eq('blocker_id', otherUserId).eq('blocked_user_id', userId).maybeSingle(),
  ]);
  return Boolean(ab.data || ba.data);
}

export async function getBookingMessagingParties(
  admin: AdminClient,
  booking: { customer_id: string; pro_id: string }
): Promise<{ customerUserId: string; proUserId: string } | null> {
  const { data: sp } = await admin.from('service_pros').select('user_id').eq('id', booking.pro_id).maybeSingle();
  const proUserId = (sp as { user_id?: string } | null)?.user_id;
  if (!proUserId) return null;
  return { customerUserId: booking.customer_id, proUserId };
}

export function otherPartyUserIdForBooking(
  parties: { customerUserId: string; proUserId: string },
  actorUserId: string
): string | null {
  if (actorUserId === parties.customerUserId) return parties.proUserId;
  if (actorUserId === parties.proUserId) return parties.customerUserId;
  return null;
}

export type MessagingBlockedAuditTarget = {
  /** When set, appends `message_blocked_attempt` to trust_safety_audit_log for this booking. */
  bookingId: string;
};

/**
 * @returns NextResponse 403 if messaging is blocked, otherwise null
 */
export async function rejectIfMessagingBlocked(
  admin: AdminClient,
  actorUserId: string,
  otherUserId: string | null | undefined,
  context: string,
  audit?: MessagingBlockedAuditTarget
): Promise<NextResponse | null> {
  if (!otherUserId) return null;
  const blocked = await isMessagingBlockedBetween(admin, actorUserId, otherUserId);
  if (!blocked) return null;
  console.info('[messaging-block] rejected context=%s actor=%s other=%s', context, actorUserId, otherUserId);
  if (audit?.bookingId) {
    void appendTrustSafetyAudit(admin, {
      resource_type: 'booking',
      resource_id: audit.bookingId,
      action: 'message_blocked_attempt',
      actor_user_id: actorUserId,
      details: { other_user_id: otherUserId, context },
    });
  }
  return NextResponse.json(
    { error: MESSAGING_BLOCKED_USER_MESSAGE, code: CHAT_MESSAGE_ERROR_CODES.MESSAGING_BLOCKED },
    { status: 403 }
  );
}
