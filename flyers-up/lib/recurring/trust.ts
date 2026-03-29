/**
 * Trust / revocation hooks for recurring access (scaffold).
 * Wire to booking cancellation analytics, payment webhooks, and no-show signals later.
 */

export type TrustRevocationSignal =
  | { kind: 'repeated_customer_cancellations'; count: number; bookingIds: string[] }
  | { kind: 'repeated_failed_payments'; count: number }
  | { kind: 'manual_recurring_block' };

export function shouldRevokeRecurringAccess(_signal: TrustRevocationSignal): { revoke: boolean; reason?: string } {
  // Placeholder: policy layer will use thresholds from ops config.
  return { revoke: false };
}

export function recordTrustSignalForFuture(_customerUserId: string, _proUserId: string, _signal: TrustRevocationSignal): void {
  // TODO: persist to analytics / pro_customer_preferences.notes
}
