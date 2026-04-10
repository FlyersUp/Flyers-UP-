/**
 * Maps payout/payment hold signals into calm, human-facing UI state for Pro vs Customer.
 * Does not surface internal reason codes or Stripe jargon.
 */

import { getPayoutHoldExplanation, type PayoutHoldExplanationContext } from '@/lib/bookings/payout-hold-explanations';
import type { PayoutHoldReason } from '@/lib/bookings/payment-lifecycle-types';

export type PaymentHeldView = 'pro' | 'customer';

export type PaymentHeldTimelineStepState = 'complete' | 'current' | 'upcoming';

export type PaymentHeldTimelineKey = 'deposit' | 'completed' | 'held' | 'paid';

export type PaymentHeldTimelineItem = {
  key: PaymentHeldTimelineKey;
  state: PaymentHeldTimelineStepState;
  label: string;
  helper: string;
  /** Optional ISO timestamp for subtle display */
  timestamp?: string | null;
};

export type PaymentHeldWhyCallout = {
  headline: string;
  body: string;
};

export type PaymentHeldUiState = {
  variant: PaymentHeldView;
  badge: string;
  title: string;
  subtitle: string;
  timeline: PaymentHeldTimelineItem[];
  /** Pro: lavender panel under timeline. Customer: main reassurance body (same copy role). */
  infoPanelBody: string;
  explanationCode: string;
  whyCallout: PaymentHeldWhyCallout | null;
};

const BADGE = 'Under review';

const DEFAULT_WHY: PaymentHeldWhyCallout = {
  headline: 'Why is this happening?',
  body: 'Reviews are usually completed within 4–12 hours during business days. Our team manually verifies high-speed service completions to ensure quality and safety.',
};

const PRO_TITLE_DEFAULT = 'Payment temporarily held';
const PRO_SUBTITLE_DEFAULT = 'We’re doing a quick review before releasing funds.';

const CUSTOMER_TITLE = 'Payment under review';
const CUSTOMER_SUBTITLE = 'Standard security check';

function isKnownPayoutHoldReason(v: string): v is PayoutHoldReason {
  return (
    [
      'none',
      'missing_final_payment',
      'missing_payment_method',
      'requires_customer_action',
      'charge_failed',
      'dispute_open',
      'fraud_review',
      'no_show_review',
      'insufficient_completion_evidence',
      'admin_hold',
      'waiting_post_completion_review',
      'payout_blocked',
      'already_released',
      'refund_pending',
    ] as const
  ).includes(v as PayoutHoldReason);
}

function normalizeHoldReason(raw: string | null | undefined): PayoutHoldReason {
  const s = String(raw ?? 'none').trim();
  if (s === '' || s === 'none') return 'none';
  if (isKnownPayoutHoldReason(s)) return s;
  return 'payout_blocked';
}

function heldHelperForExplanationCode(code: string): string {
  switch (code) {
    case 'payout_flagged_missing_photos':
    case 'payout_flagged_completion_requirements':
      return 'Waiting on completion details before payout';
    case 'payout_waiting_review_window':
      return 'Short waiting period before payout can run';
    default:
      return 'Under quick review before payout';
  }
}

function proSubtitleForExplanationCode(code: string): string {
  switch (code) {
    case 'payout_flagged_missing_photos':
    case 'payout_flagged_completion_requirements':
      return 'We need a few completion details before funds can move.';
    case 'payout_waiting_review_window':
      return 'Your payout will follow a short built-in waiting period after completion.';
    case 'payout_flagged_dispute_open':
      return 'We’re reviewing a question about this booking before releasing funds.';
    case 'payout_flagged_payment_issue':
    case 'payout_flagged_final_payment_not_collected':
      return 'Payout can’t move until the booking payment side is fully settled.';
    default:
      return PRO_SUBTITLE_DEFAULT;
  }
}

function proTitleForExplanationCode(code: string, fallbackTitle: string): string {
  if (code === 'payout_flagged_missing_photos') return 'Payment held pending photos';
  if (code === 'payout_flagged_completion_requirements') return 'Payment held pending details';
  if (code === 'payout_waiting_review_window') return fallbackTitle;
  return PRO_TITLE_DEFAULT;
}

function whyCalloutForCode(code: string): PaymentHeldWhyCallout | null {
  switch (code) {
    case 'payout_flagged_suspicious_completion':
    case 'payout_held_routine_review':
    case 'payout_flagged_payout_blocked':
    case 'payout_flagged_admin_hold':
    case 'payout_held_generic':
      return DEFAULT_WHY;
    case 'payout_flagged_missing_photos':
    case 'payout_flagged_completion_requirements':
      return {
        headline: 'Why is this happening?',
        body: 'We use completion photos and details to confirm the job matches what was booked. That helps protect you and the customer before funds move.',
      };
    case 'payout_flagged_dispute_open':
      return {
        headline: 'Why is this happening?',
        body: 'When a question comes up about a booking, we pause the release until we understand what happened. We’ll update you as soon as we can.',
      };
    case 'payout_waiting_review_window':
      return {
        headline: 'Why is this happening?',
        body: 'A short waiting period after completion is built into how payouts work. It helps catch issues early and keeps everyone aligned.',
      };
    case 'payout_flagged_payment_issue':
    case 'payout_flagged_final_payment_not_collected':
      return {
        headline: 'Why is this happening?',
        body: 'The pro’s payout starts after the booking is fully paid and settled on our side. If you still owe a balance, finish payment in the app.',
      };
    default:
      return null;
  }
}

function buildTimeline(
  heldHelper: string,
  timestamps?: Partial<Record<PaymentHeldTimelineKey, string | null>>
): PaymentHeldTimelineItem[] {
  const ts = timestamps ?? {};
  return [
    {
      key: 'deposit',
      state: 'complete',
      label: 'Deposit',
      helper: 'Initial payment received',
      timestamp: ts.deposit ?? null,
    },
    {
      key: 'completed',
      state: 'complete',
      label: 'Completed',
      helper: 'Service marked complete',
      timestamp: ts.completed ?? null,
    },
    {
      key: 'held',
      state: 'current',
      label: 'Held',
      helper: heldHelper,
      timestamp: ts.held ?? null,
    },
    {
      key: 'paid',
      state: 'upcoming',
      label: 'Paid',
      helper: 'Funds sent to bank',
      timestamp: ts.paid ?? null,
    },
  ];
}

export type PaymentHeldBookingSignals = {
  payoutReleased?: boolean | null;
  paymentLifecycleStatus?: string | null;
  requiresAdminReview?: boolean | null;
  payoutHoldReason?: string | null;
  suspiciousCompletion?: boolean | null;
  suspiciousCompletionReason?: string | null;
  adminHold?: boolean | null;
};

/**
 * Whether to show the payment-held / under-review experience (Pro or Customer).
 */
export function shouldShowPaymentHeldUi(signals: PaymentHeldBookingSignals): boolean {
  if (signals.payoutReleased === true) return false;
  const lc = String(signals.paymentLifecycleStatus ?? '').trim();
  if (lc === 'payout_on_hold') return true;
  if (signals.requiresAdminReview === true) return true;
  return false;
}

/**
 * Resolve internal hold reason + explanation context from booking fields (no queue read).
 */
export function resolvePaymentHoldReasonAndContext(signals: PaymentHeldBookingSignals): {
  reason: PayoutHoldReason;
  context: PayoutHoldExplanationContext;
} {
  const context: PayoutHoldExplanationContext = {
    suspiciousCompletion: signals.suspiciousCompletion === true,
    suspiciousCompletionReason: signals.suspiciousCompletionReason ?? null,
  };

  const fromDb = normalizeHoldReason(signals.payoutHoldReason);
  if (fromDb !== 'none') {
    return { reason: fromDb, context };
  }

  if (signals.adminHold === true) {
    return { reason: 'admin_hold', context };
  }

  if (signals.suspiciousCompletion === true) {
    return { reason: 'fraud_review', context };
  }

  return { reason: 'fraud_review', context };
}

export type BuildPaymentHeldUiStateInput = {
  view: PaymentHeldView;
  holdReason: PayoutHoldReason | string;
  context?: PayoutHoldExplanationContext;
  /** Optional timestamps for timeline steps (e.g. paid_deposit_at, completed_at) */
  timelineTimestamps?: Partial<Record<PaymentHeldTimelineKey, string | null>>;
};

/**
 * Build UI state for {@link PaymentHeldProCard} / {@link PaymentHeldCustomerCard}.
 */
export function buildPaymentHeldUiState(input: BuildPaymentHeldUiStateInput): PaymentHeldUiState {
  const { view, holdReason, context = {}, timelineTimestamps } = input;
  const reason = normalizeHoldReason(String(holdReason));
  const exp = getPayoutHoldExplanation(reason, context);

  const heldHelper = heldHelperForExplanationCode(exp.code);
  const timeline = buildTimeline(heldHelper, timelineTimestamps);

  if (view === 'customer') {
    return {
      variant: 'customer',
      badge: BADGE,
      title: CUSTOMER_TITLE,
      subtitle: CUSTOMER_SUBTITLE,
      timeline,
      infoPanelBody: exp.customer_message,
      explanationCode: exp.code,
      whyCallout: whyCalloutForCode(exp.code),
    };
  }

  return {
    variant: 'pro',
    badge: BADGE,
    title: proTitleForExplanationCode(exp.code, exp.title),
    subtitle: proSubtitleForExplanationCode(exp.code),
    timeline,
    infoPanelBody: exp.pro_message,
    explanationCode: exp.code,
    whyCallout: whyCalloutForCode(exp.code),
  };
}

/** Alias for callers that prefer the “mapper” naming from product specs. */
export const mapHoldToPaymentHeldUiState = buildPaymentHeldUiState;

/**
 * Convenience: signals → full UI state for one view.
 */
export function buildPaymentHeldUiStateFromBooking(
  view: PaymentHeldView,
  signals: PaymentHeldBookingSignals,
  timelineTimestamps?: Partial<Record<PaymentHeldTimelineKey, string | null>>
): PaymentHeldUiState | null {
  if (!shouldShowPaymentHeldUi(signals)) return null;
  const { reason, context } = resolvePaymentHoldReasonAndContext(signals);
  return buildPaymentHeldUiState({ view, holdReason: reason, context, timelineTimestamps });
}
