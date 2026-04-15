/**
 * Canonical Stripe **booking money** metadata: the same string keys must appear on every
 * money-moving Stripe object we stamp for a booking (PaymentIntents, Refunds, Transfers)
 * so support tooling and parsers see one shape. Values are always strings; cent fields use
 * integer decimal strings (including `"0"`).
 *
 * ## Which fields are authoritative for what
 *
 * - **Support debugging** — `booking_id`, `payment_phase`, `pricing_version`, and the six
 *   `*_cents` lines (they mirror the booking pricing snapshot at the time of the API call).
 * - **Customer receipts / display** — Prefer the **bookings** row and invoice/quote sources
 *   of truth; PI metadata is a **time-stamped copy** for Stripe Dashboard search and
 *   webhook correlation (`total_amount_cents`, `subtotal_cents`, `platform_fee_cents`).
 * - **Refund / payout logic** — Never read Stripe metadata to decide how much to refund;
 *   use **bookings** + PaymentIntent amounts + ledger. Metadata here is **audit context**
 *   (`refund_scope`, `resolution_type`, `dispute_id` on refunds; `linked_final_payment_intent_id`
 *   on transfers) plus the same cent snapshot for cross-checks.
 * - **Analytics** — Use `pricing_version` + `payment_phase` joins; do not treat optional
 *   diagnostic keys on the same object as financial truth.
 */

export const CANONICAL_BOOKING_STRIPE_MONEY_METADATA_KEYS = [
  'booking_id',
  'payment_phase',
  'subtotal_cents',
  'total_amount_cents',
  'platform_fee_cents',
  'deposit_amount_cents',
  'final_amount_cents',
  'pricing_version',
] as const;

/** @deprecated Use {@link CANONICAL_BOOKING_STRIPE_MONEY_METADATA_KEYS} */
export const UNIFIED_BOOKING_PAYMENT_INTENT_REQUIRED_METADATA_KEYS =
  CANONICAL_BOOKING_STRIPE_MONEY_METADATA_KEYS;

export type CanonicalBookingStripeMoneyMetadataKey =
  (typeof CANONICAL_BOOKING_STRIPE_MONEY_METADATA_KEYS)[number];

/** @deprecated Use {@link CanonicalBookingStripeMoneyMetadataKey} */
export type UnifiedBookingPaymentIntentRequiredMetadataKey = CanonicalBookingStripeMoneyMetadataKey;

/** Phases used on checkout PaymentIntents only. */
export type UnifiedBookingPaymentPhase = 'deposit' | 'final' | 'full';

/** Same cent contract as checkout PIs, plus lifecycle money moves. */
export type CanonicalBookingStripeMoneyPhase =
  | UnifiedBookingPaymentPhase
  | 'refund'
  | 'transfer';

export function centsToStripeMetadataString(value: number): string {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? String(n) : '0';
}

/**
 * Returns exactly the canonical money keys (string values). Callers merge onto broader metadata.
 */
export function buildUnifiedBookingPaymentIntentMoneyMetadata(input: {
  bookingId: string;
  paymentPhase: CanonicalBookingStripeMoneyPhase;
  subtotalCents: number;
  totalAmountCents: number;
  platformFeeCents: number;
  depositAmountCents: number;
  finalAmountCents: number;
  /** Empty / missing → metadata `unknown` (explicit, never blank). */
  pricingVersion?: string | null;
}): Record<CanonicalBookingStripeMoneyMetadataKey, string> {
  const bookingId = String(input.bookingId ?? '').trim();
  if (!bookingId) {
    throw new Error('Unified PaymentIntent metadata requires a non-empty booking_id');
  }
  const pv = String(input.pricingVersion ?? '').trim();
  return {
    booking_id: bookingId,
    payment_phase: input.paymentPhase,
    subtotal_cents: centsToStripeMetadataString(input.subtotalCents),
    total_amount_cents: centsToStripeMetadataString(input.totalAmountCents),
    platform_fee_cents: centsToStripeMetadataString(input.platformFeeCents),
    deposit_amount_cents: centsToStripeMetadataString(input.depositAmountCents),
    final_amount_cents: centsToStripeMetadataString(input.finalAmountCents),
    pricing_version: pv || 'unknown',
  };
}

/** Maps legacy `payment_phase: remaining` to `final` for validation only (does not mutate). */
export function resolveEffectiveUnifiedPaymentPhase(
  raw: string | undefined
): UnifiedBookingPaymentPhase | null {
  const p = String(raw ?? '').toLowerCase().trim();
  if (p === 'deposit' || p === 'final' || p === 'full') return p;
  if (p === 'remaining') return 'final';
  return null;
}

/** Resolves `payment_phase` for any stamped booking money object (PI, refund, transfer). */
export function resolveCanonicalBookingStripeMoneyPhase(
  raw: string | undefined
): CanonicalBookingStripeMoneyPhase | null {
  const p = String(raw ?? '').toLowerCase().trim();
  if (p === 'deposit' || p === 'final' || p === 'full' || p === 'refund' || p === 'transfer') return p;
  if (p === 'remaining') return 'final';
  return null;
}

/**
 * Throws if any canonical money key is missing/blank or `payment_phase` is not recognized
 * (`remaining` counts as `final`).
 */
export function assertCanonicalBookingStripeMoneyMetadata(metadata: Record<string, string>): void {
  const missing: CanonicalBookingStripeMoneyMetadataKey[] = [];
  for (const key of CANONICAL_BOOKING_STRIPE_MONEY_METADATA_KEYS) {
    const v = metadata[key];
    if (v === undefined || v === null || String(v).trim() === '') {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `Canonical Stripe booking money metadata missing required keys: ${missing.join(', ')}`
    );
  }
  if (resolveCanonicalBookingStripeMoneyPhase(metadata.payment_phase) == null) {
    throw new Error(
      `Canonical metadata requires a valid payment_phase (got ${JSON.stringify(metadata.payment_phase)})`
    );
  }
}

/**
 * Checkout PaymentIntents only: canonical money keys + `payment_phase` must be deposit, final,
 * or full (after mapping `remaining` → `final`).
 */
export function assertUnifiedBookingPaymentIntentMetadata(metadata: Record<string, string>): void {
  assertCanonicalBookingStripeMoneyMetadata(metadata);
  if (resolveEffectiveUnifiedPaymentPhase(metadata.payment_phase) == null) {
    throw new Error(
      `PaymentIntent metadata requires payment_phase deposit, final, or full (got ${JSON.stringify(
        metadata.payment_phase
      )})`
    );
  }
}

/**
 * Refunds / Connect transfers: same cent contract as PIs; `payment_phase` is `refund` or `transfer`.
 */
export function assertRefundOrTransferBookingStripeMoneyMetadata(
  metadata: Record<string, string>
): void {
  assertCanonicalBookingStripeMoneyMetadata(metadata);
  const p = resolveCanonicalBookingStripeMoneyPhase(metadata.payment_phase);
  if (p !== 'refund' && p !== 'transfer') {
    throw new Error(
      `Refund/transfer metadata expected payment_phase refund or transfer (got ${JSON.stringify(
        metadata.payment_phase
      )})`
    );
  }
}

/**
 * In dev, CI, or Vitest, throws if canonical keys are missing. In production, logs and returns
 * (Stripe calls still prefer {@link assertUnifiedBookingPaymentIntentMetadata} at PI create).
 */
export function assertCanonicalBookingStripeMoneyMetadataDev(
  metadata: Record<string, string>,
  context: string
): void {
  const strict =
    process.env.NODE_ENV !== 'production' ||
    process.env.CI === 'true' ||
    process.env.VITEST === 'true';
  try {
    assertCanonicalBookingStripeMoneyMetadata(metadata);
  } catch (e) {
    if (strict) throw e;
    console.error('[stripe]', context, e);
  }
}

export function mergeUnifiedBookingPaymentIntentMoneyMetadata(
  metadata: Record<string, string>,
  money: ReturnType<typeof buildUnifiedBookingPaymentIntentMoneyMetadata>
): void {
  Object.assign(metadata, money);
}

/** Alias for {@link buildUnifiedBookingPaymentIntentMoneyMetadata} (same canonical contract). */
export const buildCanonicalBookingStripeMoneyMetadata = buildUnifiedBookingPaymentIntentMoneyMetadata;

/*
 * Legacy deviations removed (historical):
 * - Hosted checkout omitted `pricing_version` when absent; it now stamps `unknown`.
 * - Legacy full pay route merged unified cents but not `pricing_version`; now merged via builder.
 * - Refunds used sparse metadata (`booking_id` + ad hoc keys); now full canonical cent + `pricing_version` contract.
 * - Connect transfers used `payout_phase` without canonical money keys; now `payment_phase: transfer` + full contract.
 */
