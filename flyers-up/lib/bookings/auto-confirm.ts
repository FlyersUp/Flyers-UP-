/**
 * Central isAutoConfirmAllowed: stricter auto-confirm rules.
 * Auto-confirm must NOT unlock payout if any block condition is true.
 */

import { getCategoryRule } from './category-rules';

const MIN_RELIABILITY_FOR_AUTO_CONFIRM = 50;

export interface AutoConfirmInput {
  booking: {
    dispute_open?: boolean;
    cancellation_reason?: string | null;
    suspicious_completion?: boolean;
    arrived_at?: string | null;
    arrival_verified?: boolean;
    started_at?: string | null;
    completed_at?: string | null;
    category_slug?: string | null;
  };
  proReliability?: { reliability_score?: number } | null;
  hasLatenessIncidentOnBooking?: boolean;
  jobCompletion?: {
    after_photo_urls?: string[];
    before_photo_urls?: string[];
  } | null;
}

export interface AutoConfirmResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Auto-confirm must NOT unlock payout if any of these are true:
 * - dispute_open = true
 * - cancellation or lateness incident exists on this booking
 * - suspicious_completion = true
 * - required evidence missing (photos for physical categories)
 * - pro reliability below threshold
 * - arrival verification confidence low (physical categories)
 */
export function isAutoConfirmAllowed(
  input: AutoConfirmInput
): AutoConfirmResult {
  const { booking, proReliability, hasLatenessIncidentOnBooking, jobCompletion } = input;

  if (booking.dispute_open) {
    return { allowed: false, reason: 'Dispute is open' };
  }
  if (booking.cancellation_reason) {
    return { allowed: false, reason: 'Booking has cancellation reason' };
  }
  if (booking.suspicious_completion) {
    return { allowed: false, reason: 'Suspicious completion requires manual review' };
  }
  if (hasLatenessIncidentOnBooking) {
    return { allowed: false, reason: 'Lateness incident on this booking' };
  }

  const rule = getCategoryRule(booking.category_slug);
  const score = proReliability?.reliability_score ?? 100;
  if (score < MIN_RELIABILITY_FOR_AUTO_CONFIRM) {
    return { allowed: false, reason: 'Pro reliability below threshold' };
  }

  if (rule.requiresArrivalVerification && !booking.arrived_at) {
    return { allowed: false, reason: 'Arrival verification required' };
  }
  if (rule.requiresArrivalVerification && booking.arrival_verified === false) {
    return { allowed: false, reason: 'Low arrival verification confidence' };
  }

  if (rule.requiresBeforeAfterPhotos) {
    const urls = jobCompletion?.after_photo_urls ?? [];
    const valid = urls.filter(
      (u) =>
        typeof u === 'string' &&
        u.trim().length > 5 &&
        !/^(placeholder|n\/a|none|null|undefined)$/i.test(u.trim())
    );
    if (valid.length < 2) {
      return { allowed: false, reason: 'Physical category requires 2+ after photos' };
    }
  }

  return { allowed: true };
}
