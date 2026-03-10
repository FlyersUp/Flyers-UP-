/**
 * Optional analytics hooks for notification engagement.
 * Extend with your analytics provider (e.g. PostHog, Mixpanel, Amplitude).
 */

export type NotificationAnalyticsEvent =
  | { type: 'notification_created'; payload: { type: string; userId: string } }
  | { type: 'notification_opened'; payload: { notificationId: string; type: string; userId: string } }
  | { type: 'push_sent'; payload: { userId: string; type: string; title: string } }
  | { type: 'push_delivered'; payload: { userId: string; type: string } }
  | { type: 'push_clicked'; payload: { userId: string; type: string; deepLink: string } };

function emit(event: NotificationAnalyticsEvent): void {
  if (process.env.NODE_ENV === 'development') {
    console.debug('[NotificationAnalytics]', event.type, event.payload);
  }
  // TODO: Integrate with analytics provider
  // e.g. posthog.capture(event.type, event.payload);
}

export function trackNotificationCreated(payload: { type: string; userId: string }): void {
  emit({ type: 'notification_created', payload });
}

export function trackNotificationOpened(payload: { notificationId: string; type: string; userId: string }): void {
  emit({ type: 'notification_opened', payload });
}

export function trackPushSent(payload: { userId: string; type: string; title: string }): void {
  emit({ type: 'push_sent', payload });
}

export function trackPushDelivered(payload: { userId: string; type: string }): void {
  emit({ type: 'push_delivered', payload });
}

export function trackPushClicked(payload: { userId: string; type: string; deepLink: string }): void {
  emit({ type: 'push_clicked', payload });
}
