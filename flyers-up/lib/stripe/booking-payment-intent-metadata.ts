/**
 * Canonical Stripe PaymentIntent metadata for Flyers Up split payments (deposit + remaining).
 * Keeps snake_case + legacy camelCase keys so webhooks and older PIs stay compatible.
 */

export type StripeBookingPaymentPhase = 'deposit' | 'remaining';

const META_TITLE_MAX = 200;

export function bookingReferenceFromUuid(bookingId: string): string {
  return bookingId.replace(/-/g, '').slice(0, 8).toUpperCase();
}

/**
 * Stripe statement_descriptor_suffix max length is 22 characters.
 */
function statementDescriptorSuffix(
  bookingReference: string,
  phase: StripeBookingPaymentPhase
): string {
  const base =
    phase === 'deposit'
      ? `FU ${bookingReference} DEP`
      : `FU ${bookingReference} FINAL`;
  const ascii = base.replace(/[^a-zA-Z0-9 ]/g, '').trim();
  return ascii.slice(0, 22);
}

export function buildBookingPaymentIntentStripeFields(input: {
  bookingId: string;
  customerId: string;
  proId: string;
  paymentPhase: StripeBookingPaymentPhase;
  serviceTitle: string;
}): {
  metadata: Record<string, string>;
  description: string;
  statement_descriptor_suffix: string;
} {
  const ref = bookingReferenceFromUuid(input.bookingId);
  const title =
    input.serviceTitle.trim().slice(0, META_TITLE_MAX) || 'Service';
  const phaseLegacy = input.paymentPhase === 'deposit' ? 'deposit' : 'final';
  const paymentTypeLegacy =
    input.paymentPhase === 'deposit' ? 'deposit' : 'remaining';

  const metadata: Record<string, string> = {
    booking_id: input.bookingId,
    bookingId: input.bookingId,
    customer_id: input.customerId,
    customerId: input.customerId,
    pro_id: input.proId,
    proId: input.proId,
    booking_reference: ref,
    payment_phase: input.paymentPhase,
    service_title: title,
    phase: phaseLegacy,
    paymentType: paymentTypeLegacy,
  };

  const description =
    input.paymentPhase === 'deposit'
      ? `Flyers Up Booking #${ref} — Deposit`
      : `Flyers Up Booking #${ref} — Final payment`;

  return {
    metadata,
    description,
    statement_descriptor_suffix: statementDescriptorSuffix(ref, input.paymentPhase),
  };
}

/** Legacy single-charge checkout (full amount in one PaymentIntent). */
export function buildLegacyFullPaymentIntentStripeFields(input: {
  bookingId: string;
  customerId: string;
  proId: string;
  serviceTitle: string;
}): {
  metadata: Record<string, string>;
  description: string;
  statement_descriptor_suffix: string;
} {
  const ref = bookingReferenceFromUuid(input.bookingId);
  const title =
    input.serviceTitle.trim().slice(0, META_TITLE_MAX) || 'Service';
  const metadata: Record<string, string> = {
    booking_id: input.bookingId,
    bookingId: input.bookingId,
    customer_id: input.customerId,
    customerId: input.customerId,
    pro_id: input.proId,
    proId: input.proId,
    booking_reference: ref,
    payment_phase: 'full',
    service_title: title,
  };
  const suffix = `FU ${ref} FULL`.replace(/[^a-zA-Z0-9 ]/g, '').trim().slice(0, 22);
  return {
    metadata,
    description: `Flyers Up Booking #${ref} — Full payment`,
    statement_descriptor_suffix: suffix || `FU${ref}`.slice(0, 22),
  };
}
