import {
  buildLegacyFullPaymentIntentStripeFields,
  capStripeBookingPaymentMetadata,
} from '@/lib/stripe/booking-payment-intent-metadata';
import {
  assertUnifiedBookingPaymentIntentMetadata,
  buildUnifiedBookingPaymentIntentMoneyMetadata,
  mergeUnifiedBookingPaymentIntentMoneyMetadata,
} from '@/lib/stripe/payment-intent-metadata-unified';

/**
 * PaymentIntent fields for Stripe Checkout (hosted) when charging the platform account.
 * Must NOT include Connect destination fields (`transfer_data`, `on_behalf_of`, or
 * `application_fee_amount` used for destination charges).
 *
 * ## Metadata alignment with deposit / final
 * Uses {@link buildUnifiedBookingPaymentIntentMoneyMetadata} so required cent keys always match
 * deposit / final lifecycle PaymentIntents.
 */
export type HostedCheckoutPaymentIntentData = {
  metadata: Record<string, string>;
  description: string;
  statement_descriptor_suffix: string;
};

/** Optional frozen booking money fields — same Stripe metadata keys as deposit/final lifecycle rows. */
export type HostedCheckoutBookingMoneySnapshot = {
  pricingVersion?: string | null;
  subtotalCents?: number | null;
  /** Row snapshot; preferred over feeTotalCents when both exist. */
  platformFeeCents?: number | null;
  /** Marketplace fee aggregate when platform_fee_cents is unset. */
  feeTotalCents?: number | null;
};

function resolveHostedCheckoutSubtotalCents(
  amountCents: number,
  snap: HostedCheckoutBookingMoneySnapshot | null | undefined
): number {
  const sub = snap?.subtotalCents;
  if (typeof sub === 'number' && Number.isFinite(sub) && sub > 0) {
    return Math.round(sub);
  }
  return amountCents;
}

function resolveHostedCheckoutPlatformFeeCents(snap: HostedCheckoutBookingMoneySnapshot | null | undefined): number {
  if (!snap) return 0;
  const fromRow = snap.platformFeeCents;
  if (typeof fromRow === 'number' && Number.isFinite(fromRow) && fromRow > 0) {
    return Math.round(fromRow);
  }
  const fromTotal = snap.feeTotalCents;
  if (typeof fromTotal === 'number' && Number.isFinite(fromTotal) && fromTotal > 0) {
    return Math.round(fromTotal);
  }
  return 0;
}

export function buildHostedCheckoutPaymentIntentData(input: {
  bookingId: string;
  customerId: string;
  proId: string;
  serviceTitle: string;
  /** Charged amount in cents (must match Checkout line_items total). */
  amountCents: number;
  bookingMoneySnapshot?: HostedCheckoutBookingMoneySnapshot | null;
}): HostedCheckoutPaymentIntentData {
  const stripeFields = buildLegacyFullPaymentIntentStripeFields({
    bookingId: input.bookingId,
    customerId: input.customerId,
    proId: input.proId,
    serviceTitle: input.serviceTitle,
  });

  const amount = Math.round(Number(input.amountCents));
  const snap = input.bookingMoneySnapshot ?? null;
  const subtotal = resolveHostedCheckoutSubtotalCents(amount, snap);
  const platformFee = resolveHostedCheckoutPlatformFeeCents(snap);

  mergeUnifiedBookingPaymentIntentMoneyMetadata(
    stripeFields.metadata,
    buildUnifiedBookingPaymentIntentMoneyMetadata({
      bookingId: input.bookingId,
      paymentPhase: 'full',
      subtotalCents: subtotal,
      totalAmountCents: amount,
      platformFeeCents: platformFee,
      depositAmountCents: 0,
      finalAmountCents: amount,
      pricingVersion: snap?.pricingVersion,
    })
  );

  stripeFields.metadata.customer_total_cents = String(amount);

  const capped = capStripeBookingPaymentMetadata(stripeFields.metadata);
  assertUnifiedBookingPaymentIntentMetadata(capped);

  return {
    metadata: capped,
    description: stripeFields.description,
    statement_descriptor_suffix: stripeFields.statement_descriptor_suffix,
  };
}
