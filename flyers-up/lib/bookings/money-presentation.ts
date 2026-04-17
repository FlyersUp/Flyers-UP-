/**
 * UI copy + timeline hints derived from {@link MoneyState}.
 * Payment Held, customer payment card, and payout UI should consume this — not raw booking columns.
 */

import type { MoneyFinalPhase, MoneyPayoutPhase, MoneyState } from '@/lib/bookings/money-state';
import type { PaymentHeldTimelineItem, PaymentHeldTimelineKey } from '@/lib/bookings/payment-held-ui-state';
import {
  buildPaymentHeldUiState,
  buildPaymentHeldUiStateFromBooking,
  resolvePaymentHoldReasonAndContext,
  type PaymentHeldBookingSignals,
} from '@/lib/bookings/payment-held-ui-state';
import type { PaymentTimelineModel } from '@/lib/bookings/payment-timeline';

export type MoneyPresentationBadgeTone =
  | 'scheduled'
  | 'processing'
  | 'paid'
  | 'action'
  | 'pending'
  | 'unknown';

export type MoneyPresentationView = 'customer' | 'pro';

/** Normalized timeline discriminator for dumb UI (no lifecycle parsing in components). */
export type MoneyUiTimelineStep = 'completed' | 'auto_charge' | 'held' | 'released' | 'paid';

export type MoneyUiTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export type MoneyUiTimelineVariant =
  | 'customer_remaining'
  | 'customer_held'
  | 'pro_payout'
  | 'pro_held'
  | 'pro_waiting';

export type GetMoneyPresentationOptions = {
  /** Required for payout_held copy, timeline helpers, and why callouts. */
  holdSignals?: PaymentHeldBookingSignals;
  heldTimelineTimestamps?: Partial<Record<PaymentHeldTimelineKey, string | null>>;
};

export type MoneyUiPresentation = {
  badge: string;
  title: string;
  subtitle: string;
  body: string;
  ctaPrimary: string | null;
  ctaSecondary: string | null;
  timelineStep: MoneyUiTimelineStep;
  timelineVariant: MoneyUiTimelineVariant;
  tone: MoneyUiTone;
  badgeTone: MoneyPresentationBadgeTone;
  /** Pro payout held: vertical timeline; otherwise null. */
  heldProTimeline: PaymentHeldTimelineItem[] | null;
  whyCallout: { headline: string; body: string } | null;
};

function toneToBadge(tone: MoneyUiTone): MoneyPresentationBadgeTone {
  switch (tone) {
    case 'success':
      return 'paid';
    case 'warning':
      return 'scheduled';
    case 'danger':
      return 'action';
    case 'info':
      return 'pending';
    default:
      return 'pending';
  }
}

/**
 * Customer 4-step timeline (Deposit → Completed → Auto-charge → Paid) from money state + presentation step.
 */
export function customerPaymentTimelineModelFromPresentation(
  state: MoneyState,
  pres: MoneyUiPresentation
): PaymentTimelineModel | null {
  if (pres.timelineVariant !== 'customer_remaining') return null;
  if (state.final === 'none' && !state.customerCardVariant) return null;

  if (state.customerCardVariant === 'unknown_balance' || state.customerCardVariant === 'legacy_pending_manual') {
    return {
      deposit: 'complete',
      completed: 'complete',
      autoCharge: 'current',
      paid: 'upcoming',
    };
  }

  if (state.final === 'before_completion') {
    return {
      deposit: 'complete',
      completed: 'upcoming',
      autoCharge: 'upcoming',
      paid: 'upcoming',
    };
  }

  if (pres.timelineStep === 'paid' || state.final === 'final_paid') {
    return {
      deposit: 'complete',
      completed: 'complete',
      autoCharge: 'complete',
      paid: 'complete',
    };
  }

  if (pres.timelineStep === 'auto_charge') {
    if (state.final === 'final_processing') {
      return {
        deposit: 'complete',
        completed: 'complete',
        autoCharge: 'processing',
        paid: 'upcoming',
      };
    }
    if (state.final === 'final_failed' || state.final === 'final_requires_action') {
      return {
        deposit: 'complete',
        completed: 'complete',
        autoCharge: 'failed',
        paid: 'upcoming',
      };
    }
  }

  if (pres.timelineStep === 'completed') {
    return {
      deposit: 'complete',
      completed: 'complete',
      autoCharge: 'current',
      paid: 'upcoming',
    };
  }

  return null;
}

/**
 * Unified timeline step for payout strip semantics (legacy helper).
 */
export type MoneyTimelineStep = 'completed' | 'final' | 'held' | 'released' | 'paid';

export function getMoneyTimelineStep(state: MoneyState): MoneyTimelineStep {
  if (state.final !== 'final_paid') {
    switch (state.final) {
      case 'final_due':
        return 'completed';
      case 'final_processing':
        return 'final';
      default:
        return 'completed';
    }
  }

  switch (state.payout) {
    case 'payout_held':
      return 'held';
    case 'payout_scheduled':
    case 'payout_processing':
      return 'released';
    case 'payout_paid':
      return 'paid';
    case 'payout_failed':
      return 'released';
    default:
      return 'final';
  }
}

export function getProPayoutTimelineActiveIndex(state: MoneyState): 0 | 1 | 2 | 3 {
  const step = getMoneyTimelineStep(state);
  const { payout, final } = state;

  if (final !== 'final_paid') {
    if (step === 'final') return 1;
    return 0;
  }

  switch (step) {
    case 'held':
      return 1;
    case 'released':
      if (payout === 'payout_processing' || payout === 'payout_failed') return 2;
      return 1;
    case 'paid':
      return 3;
    case 'final':
      return 1;
    default:
      return 0;
  }
}

export function getProPayoutTimelineTransferFailed(state: MoneyState): boolean {
  return state.final === 'final_paid' && state.payout === 'payout_failed';
}

/**
 * Legacy one-liner under the old payout timeline. Pro booking UI now uses {@link ProPayoutStatusCard}
 * + {@link deriveSimplePayoutState}; keep this returning null so copy stays in one place.
 */
export function getProAutomatedPayoutStatusMessageFromMoney(
  state: MoneyState,
  completedAt?: string | null,
  paidRemainingAt?: string | null
): string | null {
  void state;
  void completedAt;
  void paidRemainingAt;
  return null;
}

function buildCustomerPresentation(state: MoneyState): MoneyUiPresentation {
  const { final, customerCardVariant } = state;

  if (customerCardVariant === 'unknown_balance') {
    return {
      badge: 'Update',
      title: 'Payment status',
      subtitle: 'We need a quick update on this booking’s payment schedule.',
      body: "We couldn't confirm the automatic payment schedule for this booking. If you still owe a balance, you can pay now or contact support for help.",
      ctaPrimary: 'Pay balance',
      ctaSecondary: 'Contact support',
      timelineStep: 'completed',
      timelineVariant: 'customer_remaining',
      tone: 'warning',
      badgeTone: 'unknown',
      heldProTimeline: null,
      whyCallout: null,
    };
  }

  if (customerCardVariant === 'legacy_pending_manual') {
    return {
      badge: 'Pending',
      title: 'Balance still due',
      subtitle: 'This booking uses an older payment flow.',
      body: 'This booking was created before the new review-window flow. You can pay the rest of your balance now.',
      ctaPrimary: 'Pay balance',
      ctaSecondary: 'Contact support',
      timelineStep: 'completed',
      timelineVariant: 'customer_remaining',
      tone: 'neutral',
      badgeTone: 'pending',
      heldProTimeline: null,
      whyCallout: null,
    };
  }

  switch (final) {
    case 'none':
      return {
        badge: 'Update',
        title: 'Payment status',
        subtitle: 'No remaining balance is due right now.',
        body: 'There is nothing further to pay on this booking at the moment.',
        ctaPrimary: null,
        ctaSecondary: null,
        timelineStep: 'completed',
        timelineVariant: 'customer_remaining',
        tone: 'neutral',
        badgeTone: 'unknown',
        heldProTimeline: null,
        whyCallout: null,
      };
    case 'before_completion':
      return {
        badge: 'Pending',
        title: 'Remaining balance pending completion',
        subtitle: 'Final payment is scheduled after your service is completed.',
        body: 'Your final payment will be scheduled after the service is completed.',
        ctaPrimary: null,
        ctaSecondary: null,
        timelineStep: 'completed',
        timelineVariant: 'customer_remaining',
        tone: 'neutral',
        badgeTone: 'pending',
        heldProTimeline: null,
        whyCallout: null,
      };
    case 'final_review_window':
      return {
        badge: 'Scheduled',
        title: 'Balance will auto-charge',
        subtitle: 'After your review window, we charge your saved card automatically.',
        body: 'You do not need to do anything unless you want to pay early or report an issue.',
        ctaPrimary: 'Pay balance early',
        ctaSecondary: 'Contact support',
        timelineStep: 'completed',
        timelineVariant: 'customer_remaining',
        tone: 'neutral',
        badgeTone: 'scheduled',
        heldProTimeline: null,
        whyCallout: null,
      };
    case 'final_due':
      return {
        badge: 'Payment due',
        title: 'Balance due now',
        subtitle: 'Pay the rest of your booking to finish checkout.',
        body: 'Your review window has ended. Pay the balance below, or update your card if a charge did not go through.',
        ctaPrimary: 'Pay balance now',
        ctaSecondary: 'Contact support',
        timelineStep: 'completed',
        timelineVariant: 'customer_remaining',
        tone: 'warning',
        badgeTone: 'scheduled',
        heldProTimeline: null,
        whyCallout: null,
      };
    case 'final_processing':
      return {
        badge: 'In progress',
        title: 'Processing payment',
        subtitle: "We're charging your saved payment method now.",
        body: 'Your remaining payment is currently being processed.',
        ctaPrimary: null,
        ctaSecondary: 'Contact support',
        timelineStep: 'auto_charge',
        timelineVariant: 'customer_remaining',
        tone: 'info',
        badgeTone: 'processing',
        heldProTimeline: null,
        whyCallout: null,
      };
    case 'final_paid':
      return {
        badge: 'Paid',
        title: 'Payment complete',
        subtitle: 'No action needed.',
        body: 'Your payment for this booking is complete.',
        ctaPrimary: null,
        ctaSecondary: 'Back to booking',
        timelineStep: 'paid',
        timelineVariant: 'customer_remaining',
        tone: 'success',
        badgeTone: 'paid',
        heldProTimeline: null,
        whyCallout: null,
      };
    case 'final_failed':
      return {
        badge: 'Action needed',
        title: 'Payment failed',
        subtitle: "We couldn't charge your saved card for the balance.",
        body: 'Update your card or try again — your booking is not complete until the balance is paid.',
        ctaPrimary: 'Try payment again',
        ctaSecondary: 'Contact support',
        timelineStep: 'auto_charge',
        timelineVariant: 'customer_remaining',
        tone: 'danger',
        badgeTone: 'action',
        heldProTimeline: null,
        whyCallout: null,
      };
    case 'final_requires_action':
      return {
        badge: 'Action needed',
        title: 'Bank confirmation needed',
        subtitle: 'Your bank needs one more step to approve the charge.',
        body: 'Open checkout to finish verification, or update your card if you prefer a different payment method.',
        ctaPrimary: 'Complete payment',
        ctaSecondary: 'Contact support',
        timelineStep: 'auto_charge',
        timelineVariant: 'customer_remaining',
        tone: 'danger',
        badgeTone: 'action',
        heldProTimeline: null,
        whyCallout: null,
      };
  }
}

function applyCustomerRefundOverlayToProPayoutCard(
  state: MoneyState,
  pres: MoneyUiPresentation
): MoneyUiPresentation {
  if (state.customerRefund === 'none') return pres;
  const partial = state.customerRefund === 'partial';
  const lead = partial
    ? 'A partial refund was issued to the customer for this booking.'
    : 'A refund was issued to the customer for this booking.';
  const payoutNote =
    state.refundAfterProPayout && state.customerRefund === 'full'
      ? ' The customer was refunded by the platform; if you were already paid out, balance recovery is handled separately by Flyers Up (not instant). We will contact you only if something is required on your side.'
      : state.refundAfterProPayout && partial
        ? ' The customer received a partial platform refund; if you were already paid out, any recovery is a separate operational step — we will follow up only if needed.'
        : '';
  return {
    ...pres,
    badge: 'Updated',
    subtitle: `${lead} ${pres.subtitle}`.trim(),
    body: `${lead}${payoutNote}\n\n${pres.body}`.trim(),
  };
}

function buildProPresentation(
  state: MoneyState,
  options?: GetMoneyPresentationOptions
): MoneyUiPresentation {
  const { final, payout } = state;

  if (final !== 'final_paid') {
    const waiting =
      final === 'before_completion' || final === 'none'
        ? 'Final payment is not scheduled yet.'
        : 'Waiting for the customer’s final payment.';
    return {
      badge: 'Pending',
      title: 'Payout',
      subtitle: waiting,
      body: waiting,
      ctaPrimary: null,
      ctaSecondary: null,
      timelineStep: 'completed',
      timelineVariant: 'pro_waiting',
      tone: 'neutral',
      badgeTone: 'pending',
      heldProTimeline: null,
      whyCallout: null,
    };
  }

  if (payout === 'payout_held') {
    const signals: PaymentHeldBookingSignals = options?.holdSignals ?? {};
    const heldUi =
      buildPaymentHeldUiStateFromBooking('pro', signals, options?.heldTimelineTimestamps) ??
      (() => {
        const { reason, context } = resolvePaymentHoldReasonAndContext(signals);
        return buildPaymentHeldUiState({
          view: 'pro',
          holdReason: reason,
          context,
          timelineTimestamps: options?.heldTimelineTimestamps,
        });
      })();

    return applyCustomerRefundOverlayToProPayoutCard(state, {
      badge: heldUi.badge,
      title: heldUi.title,
      subtitle: heldUi.subtitle,
      body: heldUi.infoPanelBody,
      ctaPrimary: 'View booking details',
      ctaSecondary: 'Contact support',
      timelineStep: 'held',
      timelineVariant: 'pro_held',
      tone: 'warning',
      badgeTone: 'pending',
      heldProTimeline: heldUi.timeline,
      whyCallout: heldUi.whyCallout,
    });
  }

  let pres: MoneyUiPresentation;
  switch (payout) {
    case 'inactive':
      pres = {
        badge: 'Update',
        title: 'Payout',
        subtitle: 'Payout status is updating.',
        body: 'We’re refreshing payout status for this booking.',
        ctaPrimary: 'View booking details',
        ctaSecondary: 'Contact support',
        timelineStep: 'released',
        timelineVariant: 'pro_payout',
        tone: 'neutral',
        badgeTone: 'unknown',
        heldProTimeline: null,
        whyCallout: null,
      };
      break;
    case 'payout_scheduled':
      pres = {
        badge: 'Scheduled',
        title: 'Payout scheduled',
        subtitle: 'Your payout will be released automatically once this booking clears the review process.',
        body: 'No action needed.',
        ctaPrimary: 'View booking details',
        ctaSecondary: 'Contact support',
        timelineStep: 'released',
        timelineVariant: 'pro_payout',
        tone: 'neutral',
        badgeTone: 'scheduled',
        heldProTimeline: null,
        whyCallout: null,
      };
      break;
    case 'payout_processing':
      pres = {
        badge: 'In progress',
        title: 'Payout processing',
        subtitle: 'Funds are on the way to your bank.',
        body: 'Your payout has been released and is moving to your account.',
        ctaPrimary: 'View booking details',
        ctaSecondary: 'Contact support',
        timelineStep: 'released',
        timelineVariant: 'pro_payout',
        tone: 'info',
        badgeTone: 'processing',
        heldProTimeline: null,
        whyCallout: null,
      };
      break;
    case 'payout_paid':
      pres = {
        badge: 'Paid',
        title: 'You got paid',
        subtitle: 'Funds were sent to your bank successfully.',
        body: 'Your payout has completed.',
        ctaPrimary: 'View booking details',
        ctaSecondary: null,
        timelineStep: 'paid',
        timelineVariant: 'pro_payout',
        tone: 'success',
        badgeTone: 'paid',
        heldProTimeline: null,
        whyCallout: null,
      };
      break;
    case 'payout_failed': {
      const adminReview = options?.holdSignals?.requiresAdminReview === true;
      if (adminReview) {
        pres = {
          badge: 'Delayed',
          title: 'Payout delayed',
          subtitle: 'We tried to send your payout but it did not go through yet.',
          body: 'This is usually related to payout setup or account verification on Stripe. Once the issue is resolved, payout is usually retried shortly. If it has been more than 1 business day, contact support.',
          ctaPrimary: 'View booking details',
          ctaSecondary: 'Contact support',
          timelineStep: 'released',
          timelineVariant: 'pro_payout',
          tone: 'warning',
          badgeTone: 'pending',
          heldProTimeline: null,
          whyCallout: {
            headline: 'Timing',
            body: 'Once the issue is resolved, payout is usually retried shortly. If it has been more than 1 business day, contact support.',
          },
        };
      } else {
        pres = {
          badge: 'Action needed',
          title: 'Payout transfer did not complete',
          subtitle: 'Contact support if this persists.',
          body: 'The payout transfer did not finish. Our team can help if this continues.',
          ctaPrimary: 'View booking details',
          ctaSecondary: 'Contact support',
          timelineStep: 'released',
          timelineVariant: 'pro_payout',
          tone: 'danger',
          badgeTone: 'action',
          heldProTimeline: null,
          whyCallout: null,
        };
      }
      break;
    }
  }
  return applyCustomerRefundOverlayToProPayoutCard(state, pres);
}

function buildCustomerHeldPresentation(
  state: MoneyState,
  options?: GetMoneyPresentationOptions
): MoneyUiPresentation {
  const signals: PaymentHeldBookingSignals = options?.holdSignals ?? {};
  const { reason, context } = resolvePaymentHoldReasonAndContext(signals);
  const heldUi = buildPaymentHeldUiState({
    view: 'customer',
    holdReason: reason,
    context,
    timelineTimestamps: options?.heldTimelineTimestamps,
  });

  return {
    badge: heldUi.badge,
    title: heldUi.title,
    subtitle: heldUi.subtitle,
    body: `No action needed.\n\n${heldUi.infoPanelBody}`,
    ctaPrimary: 'Back to booking',
    ctaSecondary: 'Contact support',
    timelineStep: 'held',
    timelineVariant: 'customer_held',
    tone: 'info',
    badgeTone: 'pending',
    heldProTimeline: null,
    whyCallout: heldUi.whyCallout,
  };
}

/**
 * Full presentation for {@link MoneyState}. Customer copy is driven by `final` (and optional held hero),
 * not by pro payout timing — never use `payout_*` alone to imply the customer still owes. Pro copy uses
 * payout after `final_paid`. Pass {@link GetMoneyPresentationOptions.holdSignals} when
 * `state.payout === 'payout_held'` so hold explanations (suspicious completion, disputes, etc.) resolve correctly.
 */
export function getMoneyPresentation(
  state: MoneyState,
  view: MoneyPresentationView,
  options?: GetMoneyPresentationOptions
): MoneyUiPresentation {
  if (view === 'customer' && state.payout === 'payout_held' && state.final === 'final_paid') {
    return buildCustomerHeldPresentation(state, options);
  }
  if (view === 'customer') {
    return buildCustomerPresentation(state);
  }
  return buildProPresentation(state, options);
}

/** Show Payment Held hero when money engine says payout is held. */
export function shouldShowPaymentHeldFromMoneyState(state: MoneyState): boolean {
  return state.payout === 'payout_held';
}
