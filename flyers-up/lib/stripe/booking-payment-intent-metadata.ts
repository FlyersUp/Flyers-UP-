/**
 * Canonical Stripe PaymentIntent metadata for Flyers Up split payments (deposit + remaining).
 * Stripe allows at most 50 metadata keys per object; we use snake_case only for ids
 * (booking_id, customer_id, pro_id). Webhooks and parsers still accept legacy camelCase
 * on older PaymentIntents via `meta.booking_id ?? meta.bookingId`, etc.
 */

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
    serviceSubtotalCents: readInt(meta, 'service_subtotal_cents'),
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
