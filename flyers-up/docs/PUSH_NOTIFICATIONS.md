# Push Notifications Status

## Current State

- **In-app notifications**: Working. Notifications are stored in `notifications` table, delivered via Supabase Realtime, and shown in the app (NotificationList, NotificationToast).
- **Notification preferences**: Users can toggle email and "push" in Settings → Notifications. The preference is stored in `user_notification_settings_v2` / `notification_settings`.
- **Service Worker**: next-pwa registers a service worker (`/sw.js`) for caching and offline support.
- **Web Push API**: **Not implemented**. No VAPID keys, no push subscription storage, no push payload delivery.

## What Apple Expects

Apple testers expect push notifications for:
- Booking accepted
- Pro on the way
- Job completed
- Messages

These events already create in-app notifications. To deliver them as **push notifications** (when the app is closed or in background), you need a push delivery layer.

## Options to Implement Push

### Option A: Web Push (PWA)

1. **Generate VAPID keys** (one-time):
   ```bash
   npx web-push generate-vapid-keys
   ```

2. **Store push subscriptions** when users enable push in settings. Use the Web Push API:
   ```js
   const reg = await navigator.serviceWorker.ready;
   const sub = await reg.pushManager.subscribe({
     userVisibleOnly: true,
     applicationServerKey: '<VAPID_PUBLIC_KEY>'
   });
   // POST sub.toJSON() to your API, store in push_subscriptions table
   ```

3. **Send push from server** when creating notifications. Use `web-push` npm package with your VAPID private key to send to each subscription.

4. **Limitation**: Web Push works in browsers. For iOS Safari PWA, support is limited. Native iOS apps require APNs.

### Option B: Firebase Cloud Messaging (FCM)

1. Create a Firebase project, enable Cloud Messaging.
2. Add `firebase` and `firebase-admin` to the project.
3. In the client: initialize Firebase, request permission, get FCM token. Store token per user.
4. In the server: when creating a notification, call FCM API to send to the token.
5. **iOS**: FCM works with APNs. You need an Apple Developer account, APNs key, and configure FCM with it.

### Option C: OneSignal / Similar Service

1. Sign up for OneSignal (or Pusher Beams, etc.).
2. Add their SDK. They handle subscription, delivery, and iOS/Android.
3. When creating a notification, call their API with user/segment and payload.
4. **Env**: Add `NEXT_PUBLIC_ONESIGNAL_APP_ID` to `.env.local` (from OneSignal Dashboard → Settings → Keys & IDs).

## Recommended Next Steps

1. **Decide target**: Web-only PWA vs. native iOS app (via Capacitor/React Native).
2. **Web-only**: Implement Web Push with VAPID. Add `push_subscriptions` table, subscription flow in settings, and `web-push` in `createNotification` path.
3. **Native iOS**: Use Firebase or OneSignal. Configure APNs and FCM/OneSignal for iOS.

## Files to Modify (Web Push path)

- `lib/notifications.ts` – after inserting notification, send push to user's subscriptions
- `app/api/users/push-subscribe/route.ts` – new route to store subscription
- `app/(app)/customer/settings/notifications/page.tsx` – request permission, subscribe, send to API
- `app/(app)/pro/settings/notifications/page.tsx` – same
- New migration: `push_subscriptions` table (user_id, endpoint, keys, created_at)
