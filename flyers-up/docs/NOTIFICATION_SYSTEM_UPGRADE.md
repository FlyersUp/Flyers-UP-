# Notification System Upgrade

Production-grade upgrades to the Flyers Up notification system. Preserves existing API routes, engine, and UI while extending functionality.

## 1. Deduplication

**Migration:** `056_notification_system_upgrade.sql`

- **Columns:** `unique_key`, `dedupe_window_seconds` (default 60)
- **Index:** Unique on `(unique_key, user_id)` when `unique_key` is set
- **Logic:** `unique_key` = `event_type:entity_id:user_id` (e.g. `payment.deposit_paid:booking123:user456`)
- Before insert, engine checks for existing notification with same `unique_key` within `dedupe_window_seconds`
- Prevents duplicates from Stripe webhook retries, cron retries, API retries
- Handles unique constraint violation (23505) gracefully

## 2. Routing System

- **Column:** `target_path` (canonical path for navigation)
- **Module:** `lib/notifications/routing.ts` – `getTargetPathForNotification()`
- **Mappings:**
  - `booking.*` → `/customer/bookings/{id}` or `/pro/bookings/{id}`
  - `message.received` → `/customer/chat/conversation/{id}` or `/pro/chat/conversation/{id}`
  - `payment.*` → `/customer/bookings` or `/pro/bookings`
  - `payout.*` → `/pro/payouts`
  - `review.received` → `/{role}/reviews/{id}`
  - `account.*` → `/{role}/settings`
- NotificationBell uses `target_path` (fallback to `deep_link`) for `router.push()`

## 3. Icon Mapping

- **Module:** `lib/notifications/iconMap.ts`
- **Component:** `components/notifications/NotificationIcon.tsx`
- Maps each notification type to a lucide-react icon (check-circle, x-circle, message-circle, alert-circle, etc.)
- NotificationBell displays icon next to each item

## 4. Expiration System

- **Column:** `expires_at` (nullable)
- **Module:** `lib/notifications/expiration.ts`
- **Rules:**
  - `booking.requested` → 7 days
  - `booking.accepted`, `booking.declined`, `booking.canceled` → 30 days
  - `booking.on_the_way`, `booking.started` → 7 days
  - `booking.completed`, `payment.*`, `payout.*` → 90 days
  - `message.received`, `review.received`, `account.*` → never
  - Marketing → 7 days
- All queries (list, count, unread) exclude expired notifications via `expires_at.is.null OR expires_at >= now()`

## 5. Push Batching

- **Module:** `lib/notifications/onesignal.ts`
- **Logic:** For `message.received`, batches pushes within 30 seconds
- Instead of "You have a new message" × 3, sends "You have 3 new messages"
- Uses in-memory buffer; non-batchable types (booking, payment, etc.) send immediately
- Only affects push; in-app notifications are always created individually

## 6. Priority System

- **Existing:** `critical`, `important`, `informational`
- **Rules:**
  - `critical` → always push (payment.failed, payout.failed, booking.canceled, account.action_required)
  - `important` → push when preferences allow
  - `informational` → in-app only (review.received, account.verified)
- `shouldSendPush()` returns false for `informational` priority

## 7. Message Push Smart Detection

- **Table:** `conversation_presence` (user_id, conversation_id, updated_at)
- **API:** `POST /api/conversations/[id]/presence` (heartbeat), `DELETE` (leave)
- **Hook:** `useConversationPresence(conversationId)` – called on customer and pro conversation pages
- **Logic:** Before sending `message.received` push, engine checks if recipient has presence within last 30 seconds
- If viewing conversation → realtime only, no push

## 8. Notification Cleanup

- **Endpoint:** `GET /api/notifications/cleanup`
- **Auth:** `CRON_SECRET` (header `x-cron-secret` or query `?secret=`)
- **Actions:**
  1. Delete notifications where `expires_at < now()`
  2. Delete read notifications older than 90 days
- **Vercel Cron:** Add to `vercel.json`:
  ```json
  "crons": [{ "path": "/api/notifications/cleanup", "schedule": "0 2 * * *" }]
  ```

## 9. Analytics Hooks

- **Module:** `lib/notifications/analytics.ts`
- **Events:** `notification_created`, `notification_opened`, `push_sent`, `push_delivered`, `push_clicked`
- Extend `emit()` to integrate with PostHog, Mixpanel, Amplitude, etc.
- In development, logs to console

## 10. UI Improvements

- **Grouping:** Today, Earlier this week, Earlier
- **Icons:** Per-type icons in feed
- **Unread:** Visual distinction (background, dot)
- **Empty state:** "No notifications yet" with subtitle
- **Mark all read:** Existing
- **Settings shortcut:** Existing
- **Routing:** Uses `target_path` for navigation

## 11. Safety

- `ONESIGNAL_REST_API_KEY` used only in server modules (`lib/notifications/onesignal.ts`)
- Never exposed to client; push sending only in server utilities

## 12. Performance Indexes

- `notifications(user_id, created_at DESC)`
- `notifications(user_id)` WHERE `read_at IS NULL`
- `notifications(unique_key)` WHERE `unique_key IS NOT NULL`
- `notifications(expires_at)` WHERE `expires_at IS NOT NULL`

## Files Created/Updated

| File | Change |
|------|--------|
| `supabase/migrations/056_notification_system_upgrade.sql` | New migration |
| `lib/notifications/engine.ts` | Dedupe, routing, expiration, presence, analytics |
| `lib/notifications/onesignal.ts` | Batching |
| `lib/notifications/iconMap.ts` | New |
| `lib/notifications/routing.ts` | New |
| `lib/notifications/expiration.ts` | New |
| `lib/notifications/analytics.ts` | New |
| `components/notifications/NotificationIcon.tsx` | New |
| `components/notifications/NotificationBell.tsx` | Icons, target_path, empty state |
| `app/api/notifications/route.ts` | Exclude expired, return target_path |
| `app/api/notifications/count/route.ts` | Exclude expired |
| `app/api/notifications/cleanup/route.ts` | New |
| `app/api/conversations/[id]/presence/route.ts` | New |
| `contexts/NotificationContext.tsx` | Exclude expired in count |
| `hooks/useConversationPresence.ts` | New |
| `app/(app)/customer/chat/conversation/[id]/page.tsx` | Presence hook |
| `app/(app)/pro/chat/conversation/[id]/page.tsx` | Presence hook |
| `lib/notifications/types.ts` | review.received pushEligible=false |

## Environment Variables

- `CRON_SECRET` – Required for `/api/notifications/cleanup`
- `ONESIGNAL_APP_ID`, `ONESIGNAL_REST_API_KEY` – Existing
