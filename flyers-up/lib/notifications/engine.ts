/**
 * Smart Notification Engine
 * Central decision layer: in-app, realtime, push.
 * 3-5 notifications per booking max. Only meaningful state changes.
 */

import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import type { NotificationType } from './types';
import {
  notificationPayloads,
  getDeepLinkForNotification,
  TYPE_TO_CATEGORY,
  NOTIFICATION_PRIORITIES,
} from './types';
import { sendPushNotification } from './onesignal';

const DEDUPE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

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
  /** Override title/body if needed */
  titleOverride?: string | null;
  bodyOverride?: string | null;
  /** Base path for deep link (customer vs pro) */
  basePath?: 'customer' | 'pro';
  /** Skip push (e.g. user viewing thread) */
  skipPush?: boolean;
  /** Dedupe key to prevent duplicates */
  dedupeKey?: string | null;
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
  read: boolean;
  read_at: string | null;
  created_at: string;
  deep_link: string | null;
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
  const deepLink = getDeepLinkForNotification(
    params.type as NotificationType,
    params.bookingId,
    params.conversationId,
    params.basePath
  );

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
      deep_link: deepLink,
      read: false,
      read_at: null,
    })
    .select()
    .single();

  if (error) {
    console.error('[createInAppNotification] insert failed:', error);
    return null;
  }

  return data as NotificationRow;
}

export async function createNotificationEvent(params: CreateNotificationParams): Promise<NotificationRow | null> {
  const payload = notificationPayloads[params.type as NotificationType];
  if (!payload) return null;

  const dedupeKey = params.dedupeKey ?? (params.bookingId ? `${params.type}:${params.bookingId}` : null);
  if (dedupeKey) {
    const alreadySent = await checkDedupe(params.userId, params.type, params.bookingId);
    if (alreadySent) return null;
  }

  const row = await createInAppNotification(params);
  if (!row) return null;

  const shouldPush =
    !params.skipPush &&
    payload.pushEligible &&
    (await shouldSendPush(params.userId, payload.category));

  if (shouldPush) {
    void sendPushNotification({
      userId: params.userId,
      title: params.titleOverride ?? payload.title,
      body: params.bodyOverride ?? payload.body,
      data: {
        type: params.type,
        bookingId: params.bookingId ?? '',
        conversationId: params.conversationId ?? '',
        deepLink: getDeepLinkForNotification(
          params.type as NotificationType,
          params.bookingId,
          params.conversationId,
          params.basePath
        ),
      },
    });
  }

  return row;
}

async function checkDedupe(userId: string, type: string, bookingId?: string | null): Promise<boolean> {
  const admin = createAdminSupabaseClient();
  let q = admin
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('type', type)
    .gte('created_at', new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString())
    .limit(1);
  if (bookingId) q = q.eq('booking_id', bookingId);
  const { data } = await q;
  return Array.isArray(data) && data.length > 0;
}

async function shouldSendPush(userId: string, category: string): Promise<boolean> {
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
  const { count, error } = await admin
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);
  if (error) return 0;
  return count ?? 0;
}
