/**
 * OneSignal push notification sender.
 * Requires: ONESIGNAL_APP_ID, ONESIGNAL_REST_API_KEY (server-only).
 * Includes batching to prevent push spam.
 */

import { trackPushSent } from './analytics';

const BATCH_WINDOW_MS = 30 * 1000;
const BATCH_KEY_PREFIX = 'push_batch:';

interface QueuedPush {
  userId: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, string>;
  queuedAt: number;
}

const batchBuffer = new Map<string, QueuedPush[]>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function getBatchKey(userId: string, type: string): string {
  return `${BATCH_KEY_PREFIX}${userId}:${type}`;
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushAllBatches();
  }, BATCH_WINDOW_MS);
}

function flushAllBatches(): void {
  for (const [key, items] of batchBuffer.entries()) {
    if (items.length > 0) {
      sendBatchedPush(key, items);
    }
  }
  batchBuffer.clear();
}

function sendBatchedPush(key: string, items: QueuedPush[]): void {
  const first = items[0]!;
  const userId = first.userId;
  const type = first.type;

  let title: string;
  let body: string;
  const data = { ...first.data };

  if (items.length > 1 && type === 'message.received') {
    title = 'New messages';
    body = `You have ${items.length} new messages`;
  } else if (items.length > 1) {
    title = first.title;
    body = `${items.length} new updates`;
  } else {
    title = first.title;
    body = first.body;
  }

  void sendPushNotificationInternal({ userId, title, body, data });
  trackPushSent({ userId, type, title });
}

export interface SendPushParams {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface QueuePushParams extends SendPushParams {
  type: string;
}

function isBatchableType(type: string): boolean {
  return type === 'message.received';
}

export function queuePushForBatching(params: QueuePushParams): void {
  const { userId, type, title, body, data = {} } = params;

  if (!isBatchableType(type)) {
    void sendPushNotificationInternal({ userId, title, body, data });
    trackPushSent({ userId, type, title });
    return;
  }

  const key = getBatchKey(userId, type);
  const existing = batchBuffer.get(key) ?? [];
  const now = Date.now();
  existing.push({
    userId,
    type,
    title,
    body,
    data,
    queuedAt: now,
  });
  batchBuffer.set(key, existing);

  const oldest = existing[0]?.queuedAt ?? now;
  if (now - oldest >= BATCH_WINDOW_MS) {
    sendBatchedPush(key, existing);
    batchBuffer.delete(key);
  } else {
    scheduleFlush();
  }
}

export async function sendPushNotification(params: SendPushParams): Promise<boolean> {
  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!appId?.trim() || !apiKey?.trim()) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[OneSignal] Skipped (no keys). Would send:', params.title);
    }
    return false;
  }

  return sendPushNotificationInternal(params);
}

async function sendPushNotificationInternal(params: SendPushParams): Promise<boolean> {
  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!appId?.trim() || !apiKey?.trim()) return false;

  try {
    const res = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${apiKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        include_external_user_ids: [params.userId],
        headings: { en: params.title },
        contents: { en: params.body },
        data: params.data ?? {},
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[OneSignal] send failed:', res.status, text);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[OneSignal] exception:', err);
    return false;
  }
}
