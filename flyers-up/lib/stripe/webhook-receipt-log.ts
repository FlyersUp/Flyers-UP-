export type WebhookReceiptLogPayload = {
  bookingId: string;
  paymentPhase?: 'deposit' | 'remaining' | 'legacy_full' | 'refund' | 'unknown';
  paymentIntentId?: string | null;
  chargeId?: string | null;
  stripeEventId: string;
  emailKind?: 'deposit' | 'final';
  emailResult?: 'sent' | 'skipped_already_sent' | 'skipped_no_customer_email' | 'skipped_resend_not_configured' | 'skipped_state' | 'skipped_claim' | 'failed' | 'noop';
  detail?: string;
};

export function logWebhookReceiptEvent(payload: WebhookReceiptLogPayload): void {
  console.log('[webhook:receipt]', JSON.stringify(payload));
}
