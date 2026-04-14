'use client';

import { trackGaEvent } from '@/lib/analytics/trackGa';

export type ProductAnalyticsEventName =
  | 'book_again_clicked'
  | 'repeat_booking_started'
  | 'recurring_booking_started'
  | 'off_platform_prompt_shown'
  | 'off_platform_signal_detected';

type ProductEventParams = Record<string, string | number | undefined>;

/**
 * Product / retention analytics — GA4 today; extend with PostHog etc. in one place.
 */
export function trackProductAnalyticsEvent(
  event: ProductAnalyticsEventName,
  params?: ProductEventParams
): void {
  trackGaEvent(event, params);
  if (process.env.NODE_ENV === 'development') {
    console.debug('[ProductAnalytics]', event, params ?? {});
  }
}
