/**
 * OneSignal push notification sender.
 * Requires: ONESIGNAL_APP_ID, ONESIGNAL_REST_API_KEY
 */

export interface SendPushParams {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
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
