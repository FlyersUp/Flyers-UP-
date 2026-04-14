/**
 * Canonical Stripe PaymentIntent metadata for Flyers Up split payments (deposit + remaining).
 * Stripe allows at most 50 metadata keys per object; we use snake_case only for ids
 * (booking_id, customer_id, pro_id). Webhooks and parsers still accept legacy camelCase
 * on older PaymentIntents via `meta.booking_id ?? meta.bookingId`, etc.
 *
 * ## Metadata classification (read by {@link normalizeBookingPaymentMetadata})
 *
 * **Financial truth** — may be used when the `bookings` row lacks frozen cents (never use
 * analytics-only keys for money):
 * - Identity: `booking_id`, `customer_id`, `pro_id`, `payment_phase` / `phase`, `pricing_version`
 * - Totals: `customer_total_cents`, `total_amount_cents` (lifecycle duplicate)
 * - Split charges: `deposit_charge_cents`, `deposit_amount_cents`, `final_charge_cents`, `final_amount_cents`
 * - Pro subtotal: `service_subtotal_cents`, then `subtotal_cents` (lifecycle line)
 * - Per-line fees (aggregate preferred; else sum of `deposit_*` + `final_*`):
 *   `service_fee_cents`, `convenience_fee_cents`, `protection_fee_cents`, `demand_fee_cents`
 * - Fees: `fee_total_cents`, `platform_fee_total_cents`, `platform_fee_cents`; or
 *   `deposit_fee_total_cents` + `final_fee_total_cents` when aggregates absent
 * - Promo: `promo_discount_cents` (affects net when applied); or per-phase promo lines
 *
 * **Analytics-only** — observability at payment time; must not drive charged amounts, receipt
 * totals, payout amounts, or booking pricing state:
 * - `fee_profile`, `subtotal_tier`, `dynamic_pricing_reasons`, `urgency`, `area_demand_score`,
 *   `supply_tightness_score`, `conversion_risk_score`, `trust_risk_score`, `is_first_booking`,
 *   `is_repeat_customer`, `booking_fee_profile_stamped`, `booking_pricing_*_slug`
 *
 * **Legacy compatibility** — alternate spellings / older PIs: camelCase ids, `paymentType`,
 *   granular `deposit_*_fee_cents` lines (still exposed on `raw` parse).
 */

/** Stripe hard limit — never exceed on PaymentIntent.metadata */
export const STRIPE_PAYMENT_INTENT_METADATA_MAX_KEYS = 50;

const PROTECTED_METADATA_KEYS = new Set([
  'booking_id',
  'customer_id',
  'pro_id',
  'booking_reference',
  'payment_phase',
  'phase',
  'paymentType',
  'service_title',
  'pricing_version',
  'subtotal_cents',
  'platform_fee_cents',
  'fee_total_cents',
  'customer_total_cents',
  'deposit_charge_cents',
  'final_charge_cents',
  'deposit_amount_cents',
  'final_amount_cents',
  'total_amount_cents',
  'booking_service_status',
  'linked_deposit_payment_intent_id',
  'review_deadline_at',
  'fee_profile',
  'subtotal_tier',
]);

/**
 * Prefer dropping these first when over limit — **analytics-only and non-critical** keys
 * (never drop financial truth keys in {@link PROTECTED_METADATA_KEYS} first).
 */
const DEFERRED_METADATA_KEY_ORDER: string[] = [
  'trust_risk_score',
  'conversion_risk_score',
  'supply_tightness_score',
  'area_demand_score',
  'urgency',
  'dynamic_pricing_reasons',
  'is_repeat_customer',
  'is_first_booking',
  'booking_pricing_category_slug',
  'booking_pricing_occupation_slug',
  'booking_fee_profile_stamped',
  'platform_fee_total_cents',
  'promo_discount_cents',
  'service_subtotal_cents',
  'final_promo_discount_cents',
  'deposit_promo_discount_cents',
  'final_demand_fee_cents',
  'deposit_demand_fee_cents',
  'service_fee_cents',
  'convenience_fee_cents',
  'protection_fee_cents',
  'demand_fee_cents',
  'deposit_service_fee_cents',
  'final_service_fee_cents',
  'deposit_convenience_fee_cents',
  'final_convenience_fee_cents',
  'deposit_protection_fee_cents',
  'final_protection_fee_cents',
  'deposit_fee_total_cents',
  'final_fee_total_cents',
  'deposit_base_cents',
  'final_base_cents',
  'final_platform_fee_cents',
  'deposit_platform_fee_cents',
];

/**
 * Ensures metadata complies with Stripe's 50-key limit. Call immediately before
 * `stripe.paymentIntents.create` / `update` when merging pricing + lifecycle fields.
 */
export function capStripeBookingPaymentMetadata(
  metadata: Record<string, string>,
  maxKeys: number = STRIPE_PAYMENT_INTENT_METADATA_MAX_KEYS
): Record<string, string> {
  const out = { ...metadata };
  const before = Object.keys(out).length;
  if (before <= maxKeys) return out;

  for (const k of DEFERRED_METADATA_KEY_ORDER) {
    if (Object.keys(out).length <= maxKeys) break;
    delete out[k];
  }

  if (Object.keys(out).length > maxKeys) {
    const keys = Object.keys(out).sort();
    for (const k of keys) {
      if (Object.keys(out).length <= maxKeys) break;
      if (!PROTECTED_METADATA_KEYS.has(k)) delete out[k];
    }
  }

  if (Object.keys(out).length > maxKeys) {
    console.error('[stripe] PaymentIntent metadata still exceeds max keys after cap', {
      count: Object.keys(out).length,
      maxKeys,
      keys: Object.keys(out),
    });
  } else if (before > Object.keys(out).length) {
    console.warn('[stripe] trimmed PaymentIntent metadata to Stripe key limit', {
      before,
      after: Object.keys(out).length,
    });
  }

  return out;
}

export type StripeBookingPaymentPhase = 'deposit' | 'remaining';
export type StripeBookingLegacyPhase = 'deposit' | 'final' | 'full';

export type BookingPaymentIntentPricingMetadata = {
  fee_profile?: string;
  subtotal_tier?: string;
  service_subtotal_cents?: number;
  service_fee_cents?: number;
  convenience_fee_cents?: number;
  protection_fee_cents?: number;
  demand_fee_cents?: number;
  promo_discount_cents?: number;
  fee_total_cents?: number;
  platform_fee_total_cents?: number; // legacy alias
  customer_total_cents?: number;
  deposit_base_cents?: number;
  deposit_platform_fee_cents?: number;
  deposit_charge_cents?: number;
  final_base_cents?: number;
  final_platform_fee_cents?: number;
  final_charge_cents?: number;
  deposit_service_fee_cents?: number;
  final_service_fee_cents?: number;
  deposit_convenience_fee_cents?: number;
  final_convenience_fee_cents?: number;
  deposit_protection_fee_cents?: number;
  final_protection_fee_cents?: number;
  deposit_demand_fee_cents?: number;
  final_demand_fee_cents?: number;
  deposit_fee_total_cents?: number;
  final_fee_total_cents?: number;
  deposit_promo_discount_cents?: number;
  final_promo_discount_cents?: number;
  dynamic_pricing_reasons?: string;
  urgency?: string;
  area_demand_score?: number;
  supply_tightness_score?: number;
  conversion_risk_score?: number;
  trust_risk_score?: number;
  is_first_booking?: string;
  is_repeat_customer?: string;
  /** Booking row identity only; does not drive fee_rule / subtotal_tier (those reflect computed pricing). */
  booking_fee_profile_stamped?: string;
  booking_pricing_occupation_slug?: string;
  booking_pricing_category_slug?: string;
  /** Immutable marketplace engine version stamped on booking (e.g. v1_2026_04). */
  pricing_version?: string;
  /** Pro service subtotal in cents (matches bookings.subtotal_cents / quote line). */
  subtotal_cents?: number;
};

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
  pricing?: BookingPaymentIntentPricingMetadata;
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
    customer_id: input.customerId,
    pro_id: input.proId,
    booking_reference: ref,
    payment_phase: input.paymentPhase,
    service_title: title,
    phase: phaseLegacy,
    paymentType: paymentTypeLegacy,
  };
  if (input.pricing) {
    Object.assign(metadata, stringifyPricingMetadata(input.pricing));
  }

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
  pricing?: BookingPaymentIntentPricingMetadata;
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
    customer_id: input.customerId,
    pro_id: input.proId,
    booking_reference: ref,
    payment_phase: 'full',
    service_title: title,
    phase: 'full',
    paymentType: 'full',
  };
  if (input.pricing) {
    Object.assign(metadata, stringifyPricingMetadata(input.pricing));
  }
  const suffix = `FU ${ref} FULL`.replace(/[^a-zA-Z0-9 ]/g, '').trim().slice(0, 22);
  return {
    metadata,
    description: `Flyers Up Booking #${ref} — Full payment`,
    statement_descriptor_suffix: suffix || `FU${ref}`.slice(0, 22),
  };
}

function stringifyPricingMetadata(
  pricing: BookingPaymentIntentPricingMetadata
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(pricing)) {
    if (typeof value === 'string' && value.trim()) {
      out[key] = value;
      continue;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      out[key] = String(Math.round(value));
    }
  }
  return out;
}

export function parseDynamicPricingReasonsCsv(raw: string | null | undefined): string[] {
  return String(raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Dedupes while preserving order (deposit metadata first, then final). */
export function mergeDynamicPricingReasonsCsv(
  deposit: string | null | undefined,
  final: string | null | undefined
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of [...parseDynamicPricingReasonsCsv(deposit), ...parseDynamicPricingReasonsCsv(final)]) {
    if (!seen.has(part)) {
      seen.add(part);
      out.push(part);
    }
  }
  return out;
}

function readInt(meta: Record<string, string | undefined>, key: string): number | null {
  const raw = meta[key];
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

export type ParsedBookingPaymentIntentMetadata = {
  bookingId: string | null;
  phase: StripeBookingLegacyPhase | null;
  feeProfile: string | null;
  subtotalTier: string | null;
  promoDiscountCents: number | null;
  serviceFeeCents: number | null;
  convenienceFeeCents: number | null;
  protectionFeeCents: number | null;
  demandFeeCents: number | null;
  feeTotalCents: number | null;
  serviceSubtotalCents: number | null;
  platformFeeTotalCents: number | null;
  customerTotalCents: number | null;
  depositServiceFeeCents: number | null;
  finalServiceFeeCents: number | null;
  depositConvenienceFeeCents: number | null;
  finalConvenienceFeeCents: number | null;
  depositProtectionFeeCents: number | null;
  finalProtectionFeeCents: number | null;
  depositDemandFeeCents: number | null;
  finalDemandFeeCents: number | null;
  depositFeeTotalCents: number | null;
  finalFeeTotalCents: number | null;
  depositPromoDiscountCents: number | null;
  finalPromoDiscountCents: number | null;
  dynamicPricingReasons: string | null;
  urgency: string | null;
  areaDemandScore: number | null;
  supplyTightnessScore: number | null;
  conversionRiskScore: number | null;
  trustRiskScore: number | null;
  isFirstBooking: string | null;
  isRepeatCustomer: string | null;
  depositBaseCents: number | null;
  depositPlatformFeeCents: number | null;
  depositChargeCents: number | null;
  finalBaseCents: number | null;
  finalPlatformFeeCents: number | null;
  finalChargeCents: number | null;
};

export type BookingPaymentMetadataFinancialTruth = {
  bookingId: string | null;
  customerId: string | null;
  proId: string | null;
  phase: StripeBookingLegacyPhase | null;
  pricingVersion: string | null;
  /** Expected customer total for the booking (frozen quote), not necessarily this PI’s amount. */
  customerTotalCents: number | null;
  /** Expected deposit charge (canonical `deposit_charge_cents`, else lifecycle `deposit_amount_cents`). */
  depositChargeCents: number | null;
  /** Expected final charge (`final_charge_cents`, else `final_amount_cents`). */
  finalChargeCents: number | null;
  /**
   * Pro work subtotal: prefer `service_subtotal_cents`, else `subtotal_cents`.
   * {@link subtotalCents} is the same resolved value for naming parity with DB / quote.
   */
  serviceSubtotalCents: number | null;
  /** Same resolution as {@link serviceSubtotalCents} (canonical + lifecycle aliases). */
  subtotalCents: number | null;
  /** Customer-paid marketplace fees total. */
  feeTotalCents: number | null;
  /** Aggregate or split-combined service fee in cents. */
  serviceFeeCents: number | null;
  convenienceFeeCents: number | null;
  protectionFeeCents: number | null;
  demandFeeCents: number | null;
  promoDiscountCents: number | null;
};

/** Observability fields only — do not use for money, receipts, or payout math. */
export type BookingPaymentMetadataAnalyticsOnly = {
  feeProfile: string | null;
  subtotalTier: string | null;
  dynamicPricingReasons: string | null;
  urgency: string | null;
  areaDemandScore: number | null;
  supplyTightnessScore: number | null;
  conversionRiskScore: number | null;
  trustRiskScore: number | null;
  isFirstBooking: string | null;
  isRepeatCustomer: string | null;
  bookingFeeProfileStamped: string | null;
  bookingPricingOccupationSlug: string | null;
  bookingPricingCategorySlug: string | null;
};

export type NormalizedBookingPaymentMetadata = {
  financial: BookingPaymentMetadataFinancialTruth;
  analyticsOnly: BookingPaymentMetadataAnalyticsOnly;
  /** Low-level parse; use {@link financial} for money decisions. */
  raw: ParsedBookingPaymentIntentMetadata;
};

function readIntFirst(meta: Record<string, string | undefined>, keys: string[]): number | null {
  for (const k of keys) {
    const v = readInt(meta, k);
    if (v != null) return v;
  }
  return null;
}

/**
 * Canonical aggregate metadata keys first, then deposit+final split lines, then `raw` parse
 * fields (same Stripe keys, snake_case only — never prefer camelCase money on `raw` over meta).
 */
function readAggregateOrSplitLineCents(
  meta: Record<string, string | undefined>,
  aggregateKeys: string[],
  depositKey: string,
  finalKey: string,
  rawAggregate: number | null,
  rawDeposit: number | null,
  rawFinal: number | null
): number | null {
  const direct = readIntFirst(meta, aggregateKeys);
  if (direct != null) return direct;
  const d = readInt(meta, depositKey);
  const f = readInt(meta, finalKey);
  if (d != null && f != null) return d + f;
  if (d != null) return d;
  if (f != null) return f;
  if (rawDeposit != null && rawFinal != null) return rawDeposit + rawFinal;
  if (rawDeposit != null) return rawDeposit;
  if (rawFinal != null) return rawFinal;
  return rawAggregate;
}

function readFeeTotalCentsNormalized(
  meta: Record<string, string | undefined>,
  raw: ParsedBookingPaymentIntentMetadata
): number | null {
  const direct = readIntFirst(meta, [
    'fee_total_cents',
    'platform_fee_total_cents',
    'platform_fee_cents',
  ]);
  if (direct != null) return direct;
  const d = readInt(meta, 'deposit_fee_total_cents');
  const f = readInt(meta, 'final_fee_total_cents');
  if (d != null && f != null) return d + f;
  if (d != null) return d;
  if (f != null) return f;
  if (raw.depositFeeTotalCents != null && raw.finalFeeTotalCents != null) {
    return raw.depositFeeTotalCents + raw.finalFeeTotalCents;
  }
  if (raw.depositFeeTotalCents != null) return raw.depositFeeTotalCents;
  if (raw.finalFeeTotalCents != null) return raw.finalFeeTotalCents;
  return raw.feeTotalCents;
}

/**
 * Money fields for receipts / overlays: prefer {@link NormalizedBookingPaymentMetadata.financial},
 * then legacy `raw` parse when a financial field is absent.
 */
export function receiptMoneyFieldsFromNormalizedPaymentMetadata(
  norm: NormalizedBookingPaymentMetadata
): {
  serviceSubtotalCents: number | null;
  serviceFeeCents: number | null;
  convenienceFeeCents: number | null;
  protectionFeeCents: number | null;
  demandFeeCents: number | null;
  feeTotalCents: number | null;
  promoDiscountCents: number | null;
  platformFeeTotalCents: number | null;
  customerTotalCents: number | null;
  depositChargeCents: number | null;
  finalChargeCents: number | null;
} {
  const { financial: f, raw: p } = norm;
  const subtotal = f.subtotalCents ?? f.serviceSubtotalCents ?? p.serviceSubtotalCents;
  return {
    serviceSubtotalCents: subtotal,
    serviceFeeCents: f.serviceFeeCents ?? p.serviceFeeCents,
    convenienceFeeCents: f.convenienceFeeCents ?? p.convenienceFeeCents,
    protectionFeeCents: f.protectionFeeCents ?? p.protectionFeeCents,
    demandFeeCents: f.demandFeeCents ?? p.demandFeeCents,
    feeTotalCents: f.feeTotalCents ?? p.feeTotalCents,
    promoDiscountCents: f.promoDiscountCents ?? p.promoDiscountCents,
    platformFeeTotalCents: f.feeTotalCents ?? p.platformFeeTotalCents,
    customerTotalCents: f.customerTotalCents ?? p.customerTotalCents,
    depositChargeCents: f.depositChargeCents ?? p.depositChargeCents,
    finalChargeCents: f.finalChargeCents ?? p.finalChargeCents,
  };
}

/**
 * Single entry point for webhook / lifecycle / receipt code reading Stripe PI metadata.
 * Resolves canonical frozen-pricing keys first, then lifecycle aliases, then `raw` parse.
 */
export function normalizeBookingPaymentMetadata(
  meta: Record<string, string | undefined>
): NormalizedBookingPaymentMetadata {
  const raw = parseBookingPaymentIntentMetadata(meta);
  const customerTotalCents =
    readIntFirst(meta, ['customer_total_cents', 'total_amount_cents']) ?? raw.customerTotalCents;
  const depositChargeCents =
    readIntFirst(meta, ['deposit_charge_cents', 'deposit_amount_cents']) ?? raw.depositChargeCents;
  const finalChargeCents =
    readIntFirst(meta, ['final_charge_cents', 'final_amount_cents']) ?? raw.finalChargeCents;
  const serviceSubtotalCents =
    readIntFirst(meta, ['service_subtotal_cents', 'subtotal_cents']) ?? raw.serviceSubtotalCents;
  const feeTotalCents = readFeeTotalCentsNormalized(meta, raw);

  const serviceFeeCents = readAggregateOrSplitLineCents(
    meta,
    ['service_fee_cents'],
    'deposit_service_fee_cents',
    'final_service_fee_cents',
    raw.serviceFeeCents,
    raw.depositServiceFeeCents,
    raw.finalServiceFeeCents
  );
  const convenienceFeeCents = readAggregateOrSplitLineCents(
    meta,
    ['convenience_fee_cents'],
    'deposit_convenience_fee_cents',
    'final_convenience_fee_cents',
    raw.convenienceFeeCents,
    raw.depositConvenienceFeeCents,
    raw.finalConvenienceFeeCents
  );
  const protectionFeeCents = readAggregateOrSplitLineCents(
    meta,
    ['protection_fee_cents'],
    'deposit_protection_fee_cents',
    'final_protection_fee_cents',
    raw.protectionFeeCents,
    raw.depositProtectionFeeCents,
    raw.finalProtectionFeeCents
  );
  const demandFeeCents = readAggregateOrSplitLineCents(
    meta,
    ['demand_fee_cents'],
    'deposit_demand_fee_cents',
    'final_demand_fee_cents',
    raw.demandFeeCents,
    raw.depositDemandFeeCents,
    raw.finalDemandFeeCents
  );
  const promoDiscountCents = readAggregateOrSplitLineCents(
    meta,
    ['promo_discount_cents'],
    'deposit_promo_discount_cents',
    'final_promo_discount_cents',
    raw.promoDiscountCents,
    raw.depositPromoDiscountCents,
    raw.finalPromoDiscountCents
  );

  return {
    financial: {
      bookingId: raw.bookingId,
      customerId: meta.customer_id ?? meta.customerId ?? null,
      proId: meta.pro_id ?? meta.proId ?? null,
      phase: raw.phase,
      pricingVersion: meta.pricing_version?.trim() ? String(meta.pricing_version).trim() : null,
      customerTotalCents,
      depositChargeCents,
      finalChargeCents,
      serviceSubtotalCents,
      subtotalCents: serviceSubtotalCents,
      feeTotalCents,
      serviceFeeCents,
      convenienceFeeCents,
      protectionFeeCents,
      demandFeeCents,
      promoDiscountCents,
    },
    analyticsOnly: {
      feeProfile: raw.feeProfile,
      subtotalTier: raw.subtotalTier,
      dynamicPricingReasons: raw.dynamicPricingReasons,
      urgency: raw.urgency,
      areaDemandScore: raw.areaDemandScore,
      supplyTightnessScore: raw.supplyTightnessScore,
      conversionRiskScore: raw.conversionRiskScore,
      trustRiskScore: raw.trustRiskScore,
      isFirstBooking: raw.isFirstBooking,
      isRepeatCustomer: raw.isRepeatCustomer,
      bookingFeeProfileStamped: meta.booking_fee_profile_stamped ?? null,
      bookingPricingOccupationSlug: meta.booking_pricing_occupation_slug ?? null,
      bookingPricingCategorySlug: meta.booking_pricing_category_slug ?? null,
    },
    raw,
  };
}

export function parseBookingPaymentIntentMetadata(
  meta: Record<string, string | undefined>
): ParsedBookingPaymentIntentMetadata {
  const phaseRaw = (meta.phase ?? meta.payment_phase ?? '').toLowerCase();
  const phase: StripeBookingLegacyPhase | null =
    phaseRaw === 'deposit' || phaseRaw === 'final' || phaseRaw === 'full'
      ? phaseRaw
      : phaseRaw === 'remaining'
        ? 'final'
        : null;

  return {
    bookingId: meta.booking_id ?? meta.bookingId ?? null,
    phase,
    feeProfile: meta.fee_profile ?? null,
    subtotalTier: meta.subtotal_tier ?? null,
    promoDiscountCents: readInt(meta, 'promo_discount_cents'),
    serviceFeeCents: readInt(meta, 'service_fee_cents'),
    convenienceFeeCents: readInt(meta, 'convenience_fee_cents'),
    protectionFeeCents: readInt(meta, 'protection_fee_cents'),
    demandFeeCents: readInt(meta, 'demand_fee_cents'),
    feeTotalCents: readInt(meta, 'fee_total_cents') ?? readInt(meta, 'platform_fee_total_cents'),
    serviceSubtotalCents:
      readInt(meta, 'service_subtotal_cents') ?? readInt(meta, 'subtotal_cents'),
    platformFeeTotalCents: readInt(meta, 'platform_fee_total_cents') ?? readInt(meta, 'fee_total_cents'),
    customerTotalCents: readInt(meta, 'customer_total_cents'),
    depositServiceFeeCents: readInt(meta, 'deposit_service_fee_cents'),
    finalServiceFeeCents: readInt(meta, 'final_service_fee_cents'),
    depositConvenienceFeeCents: readInt(meta, 'deposit_convenience_fee_cents'),
    finalConvenienceFeeCents: readInt(meta, 'final_convenience_fee_cents'),
    depositProtectionFeeCents: readInt(meta, 'deposit_protection_fee_cents'),
    finalProtectionFeeCents: readInt(meta, 'final_protection_fee_cents'),
    depositDemandFeeCents: readInt(meta, 'deposit_demand_fee_cents'),
    finalDemandFeeCents: readInt(meta, 'final_demand_fee_cents'),
    depositFeeTotalCents: readInt(meta, 'deposit_fee_total_cents'),
    finalFeeTotalCents: readInt(meta, 'final_fee_total_cents'),
    depositPromoDiscountCents: readInt(meta, 'deposit_promo_discount_cents'),
    finalPromoDiscountCents: readInt(meta, 'final_promo_discount_cents'),
    dynamicPricingReasons: meta.dynamic_pricing_reasons ?? null,
    urgency: meta.urgency ?? null,
    areaDemandScore: readInt(meta, 'area_demand_score'),
    supplyTightnessScore: readInt(meta, 'supply_tightness_score'),
    conversionRiskScore: readInt(meta, 'conversion_risk_score'),
    trustRiskScore: readInt(meta, 'trust_risk_score'),
    isFirstBooking: meta.is_first_booking ?? null,
    isRepeatCustomer: meta.is_repeat_customer ?? null,
    depositBaseCents: readInt(meta, 'deposit_base_cents'),
    depositPlatformFeeCents: readInt(meta, 'deposit_platform_fee_cents'),
    depositChargeCents: readInt(meta, 'deposit_charge_cents'),
    finalBaseCents: readInt(meta, 'final_base_cents'),
    finalPlatformFeeCents: readInt(meta, 'final_platform_fee_cents'),
    finalChargeCents: readInt(meta, 'final_charge_cents'),
  };
}
