import {
  buildLegacyFullPaymentIntentStripeFields,
  capStripeBookingPaymentMetadata,
} from '@/lib/stripe/booking-payment-intent-metadata';

/**
 * PaymentIntent fields for Stripe Checkout (hosted) when charging the platform account.
 * Must NOT include Connect destination fields (`transfer_data`, `on_behalf_of`, or
 * `application_fee_amount` used for destination charges).
 *
 * ## Metadata alignment with deposit / final
 * Deposit and final routes merge `appendLifecyclePaymentIntentMetadata` keys:
 * `subtotal_cents`, `platform_fee_cents`, `deposit_amount_cents`, `final_amount_cents`,
 * `total_amount_cents`, `pricing_version`, `payment_phase`.
 * Hosted legacy full uses `payment_phase: full` (via `buildLegacyFullPaymentIntentStripeFields`) and, when
 * `HostedCheckoutBookingMoneySnapshot` is provided, the same **cent key names** so
 * `normalizeBookingPaymentMetadata` does not need one-off branches for Checkout.
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

  const amount = Math.round(input.amountCents);
  stripeFields.metadata.customer_total_cents = String(amount);
  stripeFields.metadata.total_amount_cents = String(amount);

  const snap = input.bookingMoneySnapshot;
  if (snap) {
    const pv = String(snap.pricingVersion ?? '').trim();
    if (pv) {
      stripeFields.metadata.pricing_version = pv;
    }
    const sub = snap.subtotalCents;
    if (typeof sub === 'number' && Number.isFinite(sub) && sub > 0) {
      stripeFields.metadata.subtotal_cents = String(Math.round(sub));
    }
    const platformFeeFromRow =
      typeof snap.platformFeeCents === 'number' && Number.isFinite(snap.platformFeeCents) && snap.platformFeeCents > 0
        ? Math.round(snap.platformFeeCents)
        : null;
    const platformFeeFromTotal =
      typeof snap.feeTotalCents === 'number' && Number.isFinite(snap.feeTotalCents) && snap.feeTotalCents > 0
        ? Math.round(snap.feeTotalCents)
        : null;
    const platformFee = platformFeeFromRow ?? platformFeeFromTotal;
    if (platformFee != null && platformFee > 0) {
      stripeFields.metadata.platform_fee_cents = String(platformFee);
    }
    stripeFields.metadata.deposit_amount_cents = '0';
    stripeFields.metadata.final_amount_cents = String(amount);
  }

  return {
    metadata: capStripeBookingPaymentMetadata(stripeFields.metadata),
    description: stripeFields.description,
    statement_descriptor_suffix: stripeFields.statement_descriptor_suffix,
  };
}
