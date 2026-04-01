/**
 * Single source of truth for Stripe Connect UI buckets (Express accounts).
 * Use server-side in API routes and derive the same shape for the client via GET /api/stripe/connect/account-status.
 *
 * URL query hints (?connect=…) are transient; this resolver uses only account facts.
 */

export type StripeConnectUiState = 'not_started' | 'pending' | 'needs_action' | 'connected';

export type StripeConnectStatusInput = {
  accountId: string | null | undefined;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  /** From Stripe Account.requirements.disabled_reason when present */
  disabledReason?: string | null;
};

/**
 * True when the pro can accept charges and receive payouts (ignore stale URL params).
 */
export function isStripeConnectFullyActive(input: StripeConnectStatusInput): boolean {
  return resolveStripeConnectUiState(input) === 'connected';
}

/**
 * Resolve UI bucket from live or cached Stripe fields.
 *
 * - connected: charges + payouts enabled (ready for marketplace payouts).
 * - needs_action: Stripe has flagged the account (e.g. restricted) before we treat it as healthy.
 * - pending: Connect account exists but capabilities not fully on.
 * - not_started: no linked account id.
 */
export function resolveStripeConnectUiState(input: StripeConnectStatusInput): StripeConnectUiState {
  const id = typeof input.accountId === 'string' ? input.accountId.trim() : '';
  if (!id) return 'not_started';

  const reason = input.disabledReason?.trim();
  if (reason && (!input.chargesEnabled || !input.payoutsEnabled)) {
    return 'needs_action';
  }

  if (input.payoutsEnabled === true && input.chargesEnabled === true) {
    return 'connected';
  }

  return 'pending';
}

/** Map UI state to a short query hint for return redirects (optional UX nudge; not authoritative). */
export function connectReturnQueryHint(state: StripeConnectUiState): 'success' | 'pending' | 'needs_action' {
  if (state === 'connected') return 'success';
  if (state === 'needs_action') return 'needs_action';
  return 'pending';
}
