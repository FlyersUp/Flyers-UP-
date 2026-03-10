/**
 * Smart Notification Engine
 * Central decision layer: in-app, realtime, push.
 * Deduplication, routing, expiration, priority, presence-aware.
 */

import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import type { NotificationType } from './types';
import {
  notificationPayloads,
  TYPE_TO_CATEGORY,
  NOTIFICATION_PRIORITIES,
} from './types';
import { getTargetPathForNotification } from './routing';
import { getExpiresAt } from './expiration';
import { sendPushNotification, queuePushForBatching } from './onesignal';
import { trackNotificationCreated } from './analytics';

const DEFAULT_DEDUPE_WINDOW_SECONDS = 60;

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  actorUserId?: string | null;
  bookingId?: string | null;
  conversationId?: string | null;
  messageId?: string | null;
  paymentId?: string | null;
  payoutId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  reviewId?: string | null;
  titleOverride?: string | null;
  bodyOverride?: string | null;
  basePath?: 'customer' | 'pro';
  skipPush?: boolean;
  dedupeKey?: string | null;
  dedupeWindowSeconds?: number;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  actor_user_id: string | null;
  type: string;
  category: string | null;
  priority: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  booking_id: string | null;
  conversation_id: string | null;
  message_id: string | null;
  payment_id: string | null;
  payout_id: string | null;
  unique_key: string | null;
  target_path: string | null;
  deep_link: string | null;
  expires_at: string | null;
  read: boolean;
  read_at: string | null;
  created_at: string;
}

function buildUniqueKey(
  type: string,
  userId: string,
  bookingId?: string | null,
  conversationId?: string | null,
  messageId?: string | null,
  entityId?: string | null
): string {
  const parts: string[] = [type];
  if (bookingId) parts.push(bookingId);
  if (conversationId) parts.push(conversationId);
  if (messageId) parts.push(messageId);
  if (entityId && !bookingId && !conversationId && !messageId) parts.push(entityId);
  parts.push(userId);
  return parts.join(':');
}

export async function createInAppNotification(params: CreateNotificationParams): Promise<NotificationRow | null> {
  const payload = notificationPayloads[params.type as NotificationType];
  if (!payload) {
    console.warn('[createInAppNotification] Unknown type:', params.type);
    return null;
  }

  const title = params.titleOverride ?? payload.title;
  const body = params.bodyOverride ?? payload.body;
  const category = TYPE_TO_CATEGORY[params.type as NotificationType];
  const priority = payload.priority ?? NOTIFICATION_PRIORITIES.IMPORTANT;
  const basePath = params.basePath ?? 'customer';

  const targetPath = getTargetPathForNotification(
    params.type as NotificationType,
    basePath,
    params.bookingId,
    params.conversationId,
    params.reviewId
  );

  const expiresAt = getExpiresAt(params.type as NotificationType, category);

  const uniqueKey = buildUniqueKey(
    params.type,
    params.userId,
    params.bookingId,
    params.conversationId,
    params.messageId,
    params.entityId
  );

  const dedupeWindowSeconds = params.dedupeWindowSeconds ?? DEFAULT_DEDUPE_WINDOW_SECONDS;

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from('notifications')
    .insert({
      user_id: params.userId,
      actor_user_id: params.actorUserId ?? null,
      type: params.type,
      category,
      priority,
      title,
      body: body ?? '',
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      booking_id: params.bookingId ?? null,
      conversation_id: params.conversationId ?? null,
      message_id: params.messageId ?? null,
      payment_id: params.paymentId ?? null,
      payout_id: params.payoutId ?? null,
      unique_key: uniqueKey,
      dedupe_window_seconds: dedupeWindowSeconds,
      target_path: targetPath,
      deep_link: targetPath,
      expires_at: expiresAt,
      read: false,
      read_at: null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return null;
    }
    console.error('[createInAppNotification] insert failed:', error);
    return null;
  }

  trackNotificationCreated({ type: params.type, userId: params.userId });
  return data as NotificationRow;
}

export async function createNotificationEvent(params: CreateNotificationParams): Promise<NotificationRow | null> {
  const payload = notificationPayloads[params.type as NotificationType];
  if (!payload) return null;

  const uniqueKey = params.dedupeKey ?? buildUniqueKey(
    params.type,
    params.userId,
    params.bookingId,
    params.conversationId,
    params.entityId
  );

  const dedupeWindowSeconds = params.dedupeWindowSeconds ?? DEFAULT_DEDUPE_WINDOW_SECONDS;
  const windowMs = dedupeWindowSeconds * 1000;

  const alreadySent = await checkDedupeByUniqueKey(params.userId, uniqueKey, windowMs);
  if (alreadySent) return null;

  const row = await createInAppNotification({
    ...params,
    dedupeKey: uniqueKey,
    dedupeWindowSeconds,
  });
  if (!row) return null;

  const shouldPush =
    !params.skipPush &&
    payload.pushEligible &&
    (await shouldSendPush(params.userId, payload.category, payload.priority));

  if (shouldPush) {
    const skipForPresence =
      params.type === 'message.received' &&
      params.conversationId &&
      (await isUserViewingConversation(params.userId, params.conversationId));

    if (!skipForPresence) {
      const title = params.titleOverride ?? payload.title;
      const body = params.bodyOverride ?? payload.body;
      const targetPath = getTargetPathForNotification(
        params.type as NotificationType,
        params.basePath ?? 'customer',
        params.bookingId,
        params.conversationId,
        params.reviewId
      );

      queuePushForBatching({
        userId: params.userId,
        type: params.type,
        title,
        body,
        data: {
          type: params.type,
          bookingId: params.bookingId ?? '',
          conversationId: params.conversationId ?? '',
          deepLink: targetPath,
        },
      });
    }
  }

  return row;
}

async function checkDedupeByUniqueKey(userId: string, uniqueKey: string, windowMs: number): Promise<boolean> {
  const admin = createAdminSupabaseClient();
  const since = new Date(Date.now() - windowMs).toISOString();
  const { data } = await admin
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('unique_key', uniqueKey)
    .gte('created_at', since)
    .limit(1);
  return Array.isArray(data) && data.length > 0;
}

async function isUserViewingConversation(userId: string, conversationId: string): Promise<boolean> {
  const admin = createAdminSupabaseClient();
  const threshold = new Date(Date.now() - 30 * 1000).toISOString();
  const { data } = await admin
    .from('conversation_presence')
    .select('user_id')
    .eq('user_id', userId)
    .eq('conversation_id', conversationId)
    .gte('updated_at', threshold)
    .limit(1);
  return Array.isArray(data) && data.length > 0;
}

async function shouldSendPush(userId: string, category: string, priority: string): Promise<boolean> {
  if (priority === NOTIFICATION_PRIORITIES.INFORMATIONAL) return false;

  const admin = createAdminSupabaseClient();
  const { data: prefs } = await admin
    .from('user_notification_preferences')
    .select('booking_push, message_push, payment_push, payout_push, quiet_hours_enabled, quiet_hours_start, quiet_hours_end')
    .eq('user_id', userId)
    .maybeSingle();

  if (!prefs) return true;

  const map: Record<string, boolean> = {
    booking: prefs.booking_push,
    message: prefs.message_push,
    payment: prefs.payment_push,
    payout: prefs.payout_push,
  };
  if (!(map[category] ?? true)) return false;

  if (prefs.quiet_hours_enabled && prefs.quiet_hours_start && prefs.quiet_hours_end) {
    const now = new Date();
    const [sh, sm] = prefs.quiet_hours_start.split(':').map(Number);
    const [eh, em] = prefs.quiet_hours_end.split(':').map(Number);
    const startMins = (sh ?? 22) * 60 + (sm ?? 0);
    const endMins = (eh ?? 8) * 60 + (em ?? 0);
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const inQuietHours =
      startMins > endMins
        ? currentMins >= startMins || currentMins < endMins
        : currentMins >= startMins && currentMins < endMins;
    if (inQuietHours) return false;
  }

  return true;
}

export async function markNotificationRead(notificationId: string, userId: string): Promise<boolean> {
  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', userId);
  return !error;
}

export async function markAllNotificationsRead(userId: string): Promise<boolean> {
  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);
  return !error;
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const admin = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const { count, error } = await admin
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null)
    .or(`expires_at.is.null,expires_at.gte.${now}`);
  if (error) return 0;
  return count ?? 0;
}
