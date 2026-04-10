/**
 * User-facing copy for payout holds / auto-release blocks.
 * Maps internal {@link PayoutHoldReason} (+ optional context) to neutral explanations for pro and customer.
 * Never surfaces internal labels like "fraud_review" or exact timing thresholds.
 */

import type { PayoutHoldReason } from '@/lib/bookings/payment-lifecycle-types';

export type PayoutHoldExplanationSeverity = 'info' | 'warning';
export type PayoutHoldActionRequired = 'none' | 'contact_support' | 'wait' | 'verify';

export type PayoutHoldExplanation = {
  code: string;
  title: string;
  pro_message: string;
  customer_message: string;
  severity: PayoutHoldExplanationSeverity;
  action_required: PayoutHoldActionRequired;
  can_admin_override: boolean;
};

export type PayoutHoldExplanationContext = {
  /** Booking.flagged suspicious completion (e.g. duration vs category minimum). */
  suspiciousCompletion?: boolean;
  suspiciousCompletionReason?: string | null;
  /** True when the hold is specifically missing valid after photos (cron/admin path). */
  missingAfterPhotos?: boolean;
  /** True when the 24h post-completion review window has not passed yet. */
  reviewWindowPending?: boolean;
};

function suspiciousCompletionActive(ctx: PayoutHoldExplanationContext): boolean {
  return (
    ctx.suspiciousCompletion === true ||
    (typeof ctx.suspiciousCompletionReason === 'string' && ctx.suspiciousCompletionReason.trim().length > 0)
  );
}

const DEFAULT_FALLBACK: PayoutHoldExplanation = {
  code: 'payout_held_generic',
  title: 'Payment temporarily on hold',
  pro_message:
    'This payout is on hold while we finish a quick check. You don’t need to do anything unless we contact you. If you have questions, contact support.',
  customer_message:
    'This payment is briefly on hold while we complete a standard review. You don’t need to do anything unless we reach out.',
  severity: 'info',
  action_required: 'wait',
  can_admin_override: true,
};

/**
 * Map an internal hold reason (and optional booking context) to standardized UI copy.
 * Use after {@link evaluatePayoutTransferEligibility} / transfer eval returns a non-ok hold.
 */
export function getPayoutHoldExplanation(
  reason: PayoutHoldReason | string,
  context: PayoutHoldExplanationContext = {}
): PayoutHoldExplanation {
  const r = String(reason ?? 'none').trim() as PayoutHoldReason;

  // Job completed faster than expected → quality / protection framing (never "fraud")
  if (r === 'fraud_review' && suspiciousCompletionActive(context)) {
    return {
      code: 'payout_flagged_suspicious_completion',
      title: 'Payment temporarily held for review',
      pro_message:
        'This job was completed significantly faster than expected for this type of service. To protect both you and the customer, the payment is temporarily held for a quick review. If everything looks correct, it will be released shortly.',
      customer_message:
        'This payment is being briefly reviewed because the job was marked complete much faster than typical for this type of service. This helps ensure quality and prevent mistakes. No action is needed from you.',
      severity: 'info',
      action_required: 'none',
      can_admin_override: true,
    };
  }

  if (r === 'fraud_review') {
    return {
      code: 'payout_held_routine_review',
      title: 'Payment temporarily held for review',
      pro_message:
        'Your payout for this job is on hold while we complete a routine review. This is usually quick. If you have questions, contact support.',
      customer_message:
        'This payment is briefly on hold while we complete a standard review. No action is needed from you unless we contact you.',
      severity: 'info',
      action_required: 'wait',
      can_admin_override: true,
    };
  }

  if (r === 'waiting_post_completion_review' || (r === 'insufficient_completion_evidence' && context.reviewWindowPending)) {
    return {
      code: 'payout_waiting_review_window',
      title: 'Payment will be available after a short waiting period',
      pro_message:
        'Your payout is scheduled to be released after a short built-in waiting period from job completion. You don’t need to do anything right now.',
      customer_message:
        'The final payment follows a short waiting period after the job is marked complete. No action is needed from you.',
      severity: 'info',
      action_required: 'wait',
      can_admin_override: false,
    };
  }

  if (r === 'insufficient_completion_evidence' && context.missingAfterPhotos) {
    return {
      code: 'payout_flagged_missing_photos',
      title: 'Payment held pending completion photos',
      pro_message:
        'We need clear after photos of the finished work before this payout can be released. Please upload the required photos in the app. If you already did, contact support so we can take a look.',
      customer_message:
        'We’re waiting on completion photos from the pro before the payout can go through. No action is needed from you unless we reach out.',
      severity: 'warning',
      action_required: 'verify',
      can_admin_override: true,
    };
  }

  if (r === 'insufficient_completion_evidence') {
    return {
      code: 'payout_flagged_completion_requirements',
      title: 'Payment held pending completion details',
      pro_message:
        'This payout is on hold until all completion requirements for the job are satisfied. Check the booking for anything still outstanding, or contact support if you’re unsure what’s missing.',
      customer_message:
        'This payment is on hold until a few completion details are finished. No action is needed from you unless we contact you.',
      severity: 'warning',
      action_required: 'verify',
      can_admin_override: true,
    };
  }

  if (r === 'missing_final_payment') {
    return {
      code: 'payout_flagged_final_payment_not_collected',
      title: 'Payment not ready until balance is paid',
      pro_message:
        'The customer’s final balance hasn’t been collected yet, so this payout can’t be released. You’ll see an update once the booking is fully paid.',
      customer_message:
        'The pro’s payout starts after your booking is fully paid. If you still owe a balance, complete payment in the app. Otherwise, no action is needed.',
      severity: 'info',
      action_required: 'none',
      can_admin_override: true,
    };
  }

  if (r === 'payout_blocked') {
    return {
      code: 'payout_flagged_payout_blocked',
      title: 'Payment temporarily on hold',
      pro_message:
        'This payout is on hold based on the current status of the booking or payment. Our team may need to review it. If this persists, contact support.',
      customer_message:
        'This payment is briefly on hold while we resolve something on the booking. No action is needed from you unless we contact you.',
      severity: 'warning',
      action_required: 'contact_support',
      can_admin_override: true,
    };
  }

  if (r === 'dispute_open') {
    return {
      code: 'payout_flagged_dispute_open',
      title: 'Payment on hold during review',
      pro_message:
        'This payout is on hold while a booking issue is being reviewed. We’ll notify you when there’s an update. If you have questions, contact support.',
      customer_message:
        'This payment is on hold while we review a question about the booking. We’ll keep you posted. No action is needed from you unless we ask for information.',
      severity: 'warning',
      action_required: 'none',
      can_admin_override: true,
    };
  }

  if (r === 'missing_payment_method') {
    return {
      code: 'payout_flagged_stripe_account_not_ready',
      title: 'Payout account needs attention',
      pro_message:
        'We can’t send this payout until your payout account is fully set up and ready to receive transfers. Finish Stripe setup in your payment settings, then try again or wait for the next automatic run.',
      customer_message:
        'The pro’s payout is waiting on their payout account setup. You don’t need to do anything; this doesn’t affect what you already paid for the booking.',
      severity: 'warning',
      action_required: 'verify',
      can_admin_override: false,
    };
  }

  if (r === 'refund_pending') {
    return {
      code: 'payout_flagged_refund_in_progress',
      title: 'Payment on hold during refund',
      pro_message:
        'A refund is in progress for this booking, so the payout is paused until that’s resolved. You’ll be notified when the status updates.',
      customer_message:
        'A refund is being processed for this booking. No action is needed from you unless we contact you.',
      severity: 'info',
      action_required: 'wait',
      can_admin_override: true,
    };
  }

  if (r === 'admin_hold') {
    return {
      code: 'payout_flagged_admin_hold',
      title: 'Payment on hold',
      pro_message:
        'This payout is on hold while our team reviews the booking. If you have questions, contact support.',
      customer_message:
        'This payment is on hold while we complete an internal review. No action is needed from you unless we reach out.',
      severity: 'info',
      action_required: 'contact_support',
      can_admin_override: true,
    };
  }

  if (r === 'no_show_review') {
    return {
      code: 'payout_flagged_no_show_review',
      title: 'Payment on hold',
      pro_message:
        'This payout is on hold while we review attendance and timing for this booking. We’ll notify you when there’s a decision.',
      customer_message:
        'This payment is on hold while we review the visit. No action is needed from you unless we contact you.',
      severity: 'warning',
      action_required: 'wait',
      can_admin_override: true,
    };
  }

  if (r === 'charge_failed' || r === 'requires_customer_action') {
    return {
      code: 'payout_flagged_payment_issue',
      title: 'Payment issue on the booking',
      pro_message:
        'There’s an issue with the customer’s payment on this booking, so the payout can’t be released yet. You’ll see an update when payment succeeds.',
      customer_message:
        'We need a successful payment on this booking before the pro can be paid out. Check the app for any balance or payment steps. If you’re already paid in full, contact support.',
      severity: 'warning',
      action_required: 'verify',
      can_admin_override: true,
    };
  }

  if (r === 'already_released') {
    return {
      code: 'payout_already_released',
      title: 'Payout already sent',
      pro_message: 'This payout has already been released for this booking.',
      customer_message: 'This payment has already been processed for this booking. No action is needed.',
      severity: 'info',
      action_required: 'none',
      can_admin_override: false,
    };
  }

  if (r === 'none') {
    return {
      code: 'payout_status_ok',
      title: 'No hold',
      pro_message: 'There is no payout hold on this booking.',
      customer_message: 'There is no payment hold on this booking.',
      severity: 'info',
      action_required: 'none',
      can_admin_override: false,
    };
  }

  return { ...DEFAULT_FALLBACK };
}
