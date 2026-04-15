/**
 * Audit rules for `bookings.payment_lifecycle_status` transitions.
 *
 * - **Forbidden pairs** catch impossible or dangerous jumps (e.g. skip straight to payout after deposit).
 * - **Documented transitions** list edges the product is known to take (server + admin routes); when you add
 *   a new lifecycle write, extend this list so `payment-lifecycle-transitions.test.ts` stays green.
 *
 * This module does not execute DB updates — it is for validation, tests, and optional runtime guards.
 */

export type PaymentLifecycleTransitionAudit =
  | { ok: true; kind: 'noop' | 'documented' }
  | { ok: false; kind: 'forbidden'; reason: string }
  | { ok: false; kind: 'undocumented'; reason: string };

function norm(s: string | null | undefined): string {
  return String(s ?? '')
    .trim()
    .toLowerCase();
}

function pairKey(from: string, to: string): string {
  return `${from}→${to}`;
}

/**
 * Transitions that must never occur (invariant violations).
 * Keys: `normalizedFrom→normalizedTo`
 */
export const PAYMENT_LIFECYCLE_FORBIDDEN_TRANSITION_KEYS = new Set<string>([
  // Skip the entire middle of the marketplace funnel
  pairKey('deposit_pending', 'payout_sent'),
  pairKey('deposit_pending', 'payout_ready'),
  pairKey('deposit_pending', 'final_paid'),
  pairKey('deposit_pending', 'final_processing'),
  pairKey('deposit_pending', 'final_pending'),
  pairKey('deposit_paid', 'payout_sent'),
  pairKey('deposit_paid', 'payout_ready'),
  pairKey('deposit_paid', 'final_processing'),
  pairKey('final_pending', 'payout_sent'),
  pairKey('final_pending', 'payout_ready'),
  pairKey('final_processing', 'payout_sent'),
  pairKey('final_paid', 'payout_sent'),
  pairKey('unpaid', 'payout_sent'),
  pairKey('unpaid', 'payout_ready'),
  // Terminal / money-settled states must not regress into charge-in-flight
  pairKey('payout_sent', 'final_processing'),
  pairKey('payout_sent', 'final_pending'),
  pairKey('payout_sent', 'deposit_pending'),
  pairKey('payout_sent', 'deposit_paid'),
  pairKey('payout_sent', 'final_paid'),
  pairKey('refunded', 'payout_sent'),
  pairKey('refunded', 'payout_ready'),
  pairKey('refunded', 'final_processing'),
  pairKey('refunded', 'deposit_paid'),
  pairKey('partially_refunded', 'payout_sent'),
  pairKey('partially_refunded', 'payout_ready'),
  pairKey('partially_refunded', 'payout_sent'),
]);

export function isForbiddenPaymentLifecycleTransition(
  from: string | null | undefined,
  to: string | null | undefined
): boolean {
  const a = norm(from);
  const b = norm(to);
  if (!b) return false;
  if (a === b) return false;
  return PAYMENT_LIFECYCLE_FORBIDDEN_TRANSITION_KEYS.has(pairKey(a, b));
}

/**
 * Known-good edges (subset of all runtime transitions). Keep aligned with:
 * {@link finalizeDepositPaymentIntentProvisioning}, {@link handleDepositPaymentSucceeded},
 * {@link markBookingCompleted}, {@link attemptFinalCharge}, {@link handleFinalPaymentSucceeded},
 * {@link handleFinalPaymentFailed}, {@link releasePayout}, {@link openDispute},
 * {@link reconcileBookingForFinalAutoCharge}, admin payment-lifecycle route, {@link post-completion-review-cancel}.
 */
export const PAYMENT_LIFECYCLE_DOCUMENTED_TRANSITIONS: ReadonlyArray<readonly [string, string]> = [
  // Deposit
  ['deposit_pending', 'deposit_paid'],
  ['deposit_pending', 'deposit_pending'], // failed deposit stays pending
  ['unpaid', 'deposit_pending'],
  // Completion → final review / charge
  ['deposit_paid', 'final_pending'],
  ['deposit_paid', 'final_paid'], // zero remaining balance on completion
  ['final_pending', 'final_processing'],
  ['final_pending', 'cancelled_during_review'],
  // Final charge attempts
  ['final_processing', 'final_paid'],
  ['final_processing', 'payout_ready'],
  ['final_processing', 'payout_on_hold'],
  ['final_processing', 'requires_customer_action'],
  ['final_processing', 'payment_failed'],
  ['final_processing', 'final_pending'], // reconcile retry path
  ['requires_customer_action', 'final_processing'],
  ['payment_failed', 'final_processing'],
  // Post–final-payment evaluation
  ['final_paid', 'payout_ready'],
  ['final_paid', 'payout_on_hold'],
  // Payout transfer
  ['payout_ready', 'payout_sent'],
  ['payout_on_hold', 'payout_ready'],
  // Dispute / compliance can park payout from several pre-terminal states
  ['payout_ready', 'payout_on_hold'],
  ['deposit_paid', 'payout_on_hold'],
  ['final_pending', 'payout_on_hold'],
  ['final_processing', 'payout_on_hold'],
  ['payout_sent', 'payout_on_hold'], // rare post-release dispute handling writes on_hold
  // Refunds (admin / service)
  ['payout_sent', 'refunded'],
  ['payout_ready', 'refunded'],
  ['final_paid', 'refunded'],
  ['deposit_paid', 'refunded'],
  ['final_pending', 'partially_refunded'],
  ['payout_ready', 'partially_refunded'],
  ['final_processing', 'partially_refunded'],
  // Admin waive final
  ['deposit_paid', 'final_paid'],
  ['final_pending', 'final_paid'],
  ['final_processing', 'final_paid'],
  ['payout_on_hold', 'final_paid'],
  ['payout_ready', 'final_paid'],
];

const documentedKeys = new Set(
  PAYMENT_LIFECYCLE_DOCUMENTED_TRANSITIONS.map(([f, t]) => pairKey(norm(f), norm(t)))
);

/** True if this edge is explicitly listed as a known product transition. */
export function isDocumentedPaymentLifecycleTransition(
  from: string | null | undefined,
  to: string | null | undefined
): boolean {
  const a = norm(from);
  const b = norm(to);
  if (!b) return false;
  if (a === b) return true;
  return documentedKeys.has(pairKey(a, b));
}

/**
 * Audit helper: noop is ok; forbidden fails; anything else is `undocumented` (extend {@link PAYMENT_LIFECYCLE_DOCUMENTED_TRANSITIONS}).
 */
export function auditPaymentLifecycleTransition(
  from: string | null | undefined,
  to: string | null | undefined,
  opts?: { allowUndocumented?: boolean }
): PaymentLifecycleTransitionAudit {
  const a = norm(from);
  const b = norm(to);
  if (!b) return { ok: false, kind: 'forbidden', reason: 'target lifecycle empty' };
  if (a === b) return { ok: true, kind: 'noop' };
  if (isForbiddenPaymentLifecycleTransition(a, b)) {
    return {
      ok: false,
      kind: 'forbidden',
      reason: `Transition ${pairKey(a, b)} is forbidden`,
    };
  }
  if (documentedKeys.has(pairKey(a, b))) return { ok: true, kind: 'documented' };
  if (opts?.allowUndocumented) return { ok: true, kind: 'documented' };
  return {
    ok: false,
    kind: 'undocumented',
    reason: `Transition ${pairKey(a, b)} is not documented — add to PAYMENT_LIFECYCLE_DOCUMENTED_TRANSITIONS if intentional`,
  };
}

/** Throws if the transition is forbidden or (by default) not documented. */
export function assertPaymentLifecycleTransitionAllowed(
  from: string | null | undefined,
  to: string | null | undefined,
  opts?: { allowUndocumented?: boolean }
): void {
  const r = auditPaymentLifecycleTransition(from, to, opts);
  if (r.ok) return;
  if (r.kind === 'forbidden') throw new Error(r.reason);
  throw new Error(r.reason);
}
