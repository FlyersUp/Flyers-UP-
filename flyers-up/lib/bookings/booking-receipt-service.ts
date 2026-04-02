/**
 * Server-side unified booking receipt: single source of truth from DB rows.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildUnifiedBookingReceipt,
  computeUnifiedBookingPaymentAmounts,
  type UnifiedBookingPaymentAmounts,
  type UnifiedBookingReceipt,
  type UnifiedReceiptBookingInput,
} from '@/lib/bookings/unified-receipt';
import { loadBookingPaymentLedger } from '@/lib/bookings/booking-payment-ledger';
import { stripe } from '@/lib/stripe';
import {
  mergeDynamicPricingReasonsCsv,
  parseBookingPaymentIntentMetadata,
} from '@/lib/stripe/booking-payment-intent-metadata';
import {
  computeReceiptQuoteOverlay,
  dbRowPricingOverlay,
} from '@/lib/bookings/receipt-quote-from-booking';

type AdminClient = SupabaseClient;

function firstDefinedCents(
  ...vals: Array<number | null | undefined>
): number | undefined {
  for (const v of vals) {
    if (v == null) continue;
    if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v);
  }
  return undefined;
}

async function loadPricingFromPaymentIntentMetadata(
  paymentIntentId: string | null | undefined
): Promise<{
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
  dynamicPricingReasons: string | null;
}> {
  const id = String(paymentIntentId ?? '').trim();
  if (!id || !stripe) {
    return {
      serviceSubtotalCents: null,
      serviceFeeCents: null,
      convenienceFeeCents: null,
      protectionFeeCents: null,
      demandFeeCents: null,
      feeTotalCents: null,
      promoDiscountCents: null,
      platformFeeTotalCents: null,
      customerTotalCents: null,
      depositChargeCents: null,
      finalChargeCents: null,
      dynamicPricingReasons: null,
    };
  }
  try {
    const pi = await stripe.paymentIntents.retrieve(id);
    const parsed = parseBookingPaymentIntentMetadata(
      pi.metadata as Record<string, string | undefined>
    );
    return {
      serviceSubtotalCents: parsed.serviceSubtotalCents,
      serviceFeeCents: parsed.serviceFeeCents,
      convenienceFeeCents: parsed.convenienceFeeCents,
      protectionFeeCents: parsed.protectionFeeCents,
      demandFeeCents: parsed.demandFeeCents,
      feeTotalCents: parsed.feeTotalCents,
      promoDiscountCents: parsed.promoDiscountCents,
      platformFeeTotalCents: parsed.platformFeeTotalCents,
      customerTotalCents: parsed.customerTotalCents,
      depositChargeCents: parsed.depositChargeCents,
      finalChargeCents: parsed.finalChargeCents,
      dynamicPricingReasons: parsed.dynamicPricingReasons,
    };
  } catch {
    return {
      serviceSubtotalCents: null,
      serviceFeeCents: null,
      convenienceFeeCents: null,
      protectionFeeCents: null,
      demandFeeCents: null,
      feeTotalCents: null,
      promoDiscountCents: null,
      platformFeeTotalCents: null,
      customerTotalCents: null,
      depositChargeCents: null,
      finalChargeCents: null,
      dynamicPricingReasons: null,
    };
  }
}

/**
 * Loads DB + Stripe metadata + ledger + quote overlay into the input for
 * {@link buildUnifiedBookingReceipt} / {@link computeUnifiedBookingPaymentAmounts}.
 */
export async function loadUnifiedReceiptBookingInput(
  admin: AdminClient,
  bookingId: string
): Promise<UnifiedReceiptBookingInput | null> {
  const { data: row, error } = await admin
    .from('bookings')
    .select(
      [
        'id',
        'status',
        'payment_status',
        'final_payment_status',
        'paid_at',
        'paid_deposit_at',
        'paid_remaining_at',
        'fully_paid_at',
        'amount_deposit',
        'amount_remaining',
        'amount_total',
        'total_amount_cents',
        'price',
        'refunded_total_cents',
        'refund_status',
        'service_date',
        'service_time',
        'address',
        'currency',
        'customer_id',
        'pro_id',
        'payment_intent_id',
        'final_payment_intent_id',
        'stripe_payment_intent_deposit_id',
        'stripe_payment_intent_remaining_id',
        'amount_subtotal',
        'amount_travel_fee',
        'amount_platform_fee',
        'platform_fee_cents',
        'amount_total',
        'deposit_amount_cents',
        'remaining_amount_cents',
        'duration_hours',
        'miles_distance',
        'urgency',
        'created_at',
        'payment_due_at',
        'fee_profile',
        'pricing_occupation_slug',
        'pricing_category_slug',
      ].join(', ')
    )
    .eq('id', bookingId)
    .maybeSingle();

  if (error || !row) {
    return null;
  }

  const ledger = await loadBookingPaymentLedger(admin, bookingId);

  const b = row as unknown as Record<string, unknown>;
  const pricingFromFinal = await loadPricingFromPaymentIntentMetadata(
    (b.stripe_payment_intent_remaining_id as string) ??
      (b.final_payment_intent_id as string) ??
      null
  );
  const pricingFromDeposit = await loadPricingFromPaymentIntentMetadata(
    (b.stripe_payment_intent_deposit_id as string) ??
      (b.payment_intent_id as string) ??
      null
  );
  const dbOverlay = dbRowPricingOverlay(b);

  let mergedPricing: {
    serviceSubtotalCents: number | undefined;
    serviceFeeCents: number | undefined;
    convenienceFeeCents: number | undefined;
    protectionFeeCents: number | undefined;
    demandFeeCents: number | undefined;
    feeTotalCents: number | undefined;
    promoDiscountCents: number | undefined;
    platformFeeTotalCents: number | undefined;
    customerTotalCents: number | undefined;
    depositChargeCents: number | undefined;
    finalChargeCents: number | undefined;
    dynamicPricingReasons: string[];
  } = {
    serviceSubtotalCents: firstDefinedCents(
      pricingFromFinal.serviceSubtotalCents,
      pricingFromDeposit.serviceSubtotalCents,
      dbOverlay.serviceSubtotalCents
    ),
    serviceFeeCents: firstDefinedCents(
      pricingFromFinal.serviceFeeCents,
      pricingFromDeposit.serviceFeeCents
    ),
    convenienceFeeCents: firstDefinedCents(
      pricingFromFinal.convenienceFeeCents,
      pricingFromDeposit.convenienceFeeCents
    ),
    protectionFeeCents: firstDefinedCents(
      pricingFromFinal.protectionFeeCents,
      pricingFromDeposit.protectionFeeCents
    ),
    demandFeeCents: firstDefinedCents(
      pricingFromFinal.demandFeeCents,
      pricingFromDeposit.demandFeeCents
    ),
    feeTotalCents: firstDefinedCents(
      pricingFromFinal.feeTotalCents,
      pricingFromDeposit.feeTotalCents,
      dbOverlay.feeTotalCents,
      dbOverlay.platformFeeTotalCents
    ),
    promoDiscountCents: firstDefinedCents(
      pricingFromFinal.promoDiscountCents,
      pricingFromDeposit.promoDiscountCents
    ),
    platformFeeTotalCents: firstDefinedCents(
      pricingFromFinal.platformFeeTotalCents,
      pricingFromDeposit.platformFeeTotalCents,
      dbOverlay.platformFeeTotalCents,
      dbOverlay.feeTotalCents
    ),
    customerTotalCents: firstDefinedCents(
      pricingFromFinal.customerTotalCents,
      pricingFromDeposit.customerTotalCents,
      dbOverlay.customerTotalCents
    ),
    depositChargeCents: firstDefinedCents(
      pricingFromDeposit.depositChargeCents,
      pricingFromFinal.depositChargeCents
    ),
    finalChargeCents: firstDefinedCents(
      pricingFromFinal.finalChargeCents,
      pricingFromDeposit.finalChargeCents
    ),
    dynamicPricingReasons: mergeDynamicPricingReasonsCsv(
      pricingFromDeposit.dynamicPricingReasons,
      pricingFromFinal.dynamicPricingReasons
    ),
  };

  const customerTotalMissing =
    mergedPricing.customerTotalCents == null || mergedPricing.customerTotalCents <= 0;
  const subtotalMissing =
    mergedPricing.serviceSubtotalCents == null || mergedPricing.serviceSubtotalCents <= 0;
  const feeTotalMissing = mergedPricing.feeTotalCents == null || mergedPricing.feeTotalCents <= 0;
  const lineFeesMissing =
    mergedPricing.serviceFeeCents === undefined &&
    mergedPricing.convenienceFeeCents === undefined &&
    mergedPricing.protectionFeeCents === undefined &&
    mergedPricing.demandFeeCents === undefined;

  const ct = mergedPricing.customerTotalCents ?? 0;
  const st = mergedPricing.serviceSubtotalCents ?? 0;
  const ft = mergedPricing.feeTotalCents ?? 0;
  const pf = mergedPricing.platformFeeTotalCents ?? 0;
  /** Stored total equals “subtotal” with no fee split — common when list price was copied into both fields. */
  const totalsLookLikeListPriceOnly = ct > 0 && st > 0 && st === ct && ft <= 0 && pf <= 0;

  const needsLiveQuote =
    customerTotalMissing ||
    subtotalMissing ||
    (feeTotalMissing && lineFeesMissing) ||
    totalsLookLikeListPriceOnly;

  if (needsLiveQuote) {
    const quoteOverlay = await computeReceiptQuoteOverlay(admin, b);
    if (quoteOverlay) {
      const fillTotal = (
        cur: number | null | undefined,
        q: number | null | undefined
      ): number | undefined =>
        (cur == null || cur <= 0) && q != null && q > 0 ? q : cur == null ? undefined : cur;
      const fillLine = (
        cur: number | null | undefined,
        q: number | null | undefined
      ): number | undefined =>
        (cur === undefined || cur === null) && q != null && q !== undefined ? q : cur == null ? undefined : cur;

      mergedPricing.serviceSubtotalCents = fillTotal(
        mergedPricing.serviceSubtotalCents,
        quoteOverlay.serviceSubtotalCents
      );
      mergedPricing.serviceFeeCents = fillLine(
        mergedPricing.serviceFeeCents,
        quoteOverlay.serviceFeeCents
      );
      mergedPricing.convenienceFeeCents = fillLine(
        mergedPricing.convenienceFeeCents,
        quoteOverlay.convenienceFeeCents
      );
      mergedPricing.protectionFeeCents = fillLine(
        mergedPricing.protectionFeeCents,
        quoteOverlay.protectionFeeCents
      );
      mergedPricing.demandFeeCents = fillLine(
        mergedPricing.demandFeeCents,
        quoteOverlay.demandFeeCents
      );
      mergedPricing.feeTotalCents = fillTotal(mergedPricing.feeTotalCents, quoteOverlay.feeTotalCents);
      mergedPricing.platformFeeTotalCents = fillTotal(
        mergedPricing.platformFeeTotalCents,
        quoteOverlay.platformFeeTotalCents
      );
      mergedPricing.promoDiscountCents = fillLine(
        mergedPricing.promoDiscountCents,
        quoteOverlay.promoDiscountCents
      );
      mergedPricing.customerTotalCents = fillTotal(
        mergedPricing.customerTotalCents,
        quoteOverlay.customerTotalCents
      );
      mergedPricing.depositChargeCents = fillTotal(
        mergedPricing.depositChargeCents,
        quoteOverlay.depositChargeCents
      );
      mergedPricing.finalChargeCents = fillTotal(
        mergedPricing.finalChargeCents,
        quoteOverlay.finalChargeCents
      );
      mergedPricing.dynamicPricingReasons = mergeDynamicPricingReasonsCsv(
        mergedPricing.dynamicPricingReasons.length > 0
          ? mergedPricing.dynamicPricingReasons.join(',')
          : null,
        quoteOverlay.dynamicPricingReasons?.length
          ? quoteOverlay.dynamicPricingReasons.join(',')
          : null
      );
    }
  }

  let serviceTitle = 'Service';
  let proName = 'Provider';
  const proId = b.pro_id as string | null;
  if (proId) {
    const { data: pro } = await admin
      .from('service_pros')
      .select('display_name, category_id')
      .eq('id', proId)
      .maybeSingle();
    if (pro) {
      proName =
        String((pro as { display_name?: string }).display_name ?? 'Provider').trim() ||
        'Provider';
      const catId = (pro as { category_id?: string | null }).category_id;
      if (catId) {
        const { data: cat } = await admin
          .from('service_categories')
          .select('name')
          .eq('id', catId)
          .maybeSingle();
        if (cat && typeof (cat as { name?: string }).name === 'string') {
          serviceTitle =
            String((cat as { name: string }).name).trim() || 'Service';
        }
      }
    }
  }

  const customerId = b.customer_id as string | null;
  let customerName: string | null = null;
  if (customerId) {
    const { data: prof } = await admin
      .from('profiles')
      .select('full_name')
      .eq('id', customerId)
      .maybeSingle();
    if (prof && typeof (prof as { full_name?: string }).full_name === 'string') {
      customerName =
        String((prof as { full_name: string }).full_name).trim() || null;
    }
  }

  const { data: baRows } = await admin
    .from('booking_addons')
    .select('title_snapshot, price_snapshot_cents')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });
  const addonLineItems =
    (baRows ?? []).map((r: Record<string, unknown>) => ({
      title: String(r.title_snapshot ?? '').trim() || 'Add-on',
      priceCents: Math.max(0, Math.round(Number(r.price_snapshot_cents ?? 0))),
    })) ?? [];

  const depFromRow = typeof b.amount_deposit === 'number' ? b.amount_deposit : null;
  const remFromRow = typeof b.amount_remaining === 'number' ? b.amount_remaining : null;
  const depFromDbAlt =
    typeof b.deposit_amount_cents === 'number' ? b.deposit_amount_cents : null;
  const remFromDbAlt =
    typeof b.remaining_amount_cents === 'number' ? b.remaining_amount_cents : null;

  const input: UnifiedReceiptBookingInput = {
    bookingId: String(b.id),
    status: String(b.status ?? ''),
    paymentStatus: String(b.payment_status ?? 'UNPAID'),
    finalPaymentStatus: (b.final_payment_status as string) ?? null,
    paidAt: (b.paid_at as string) ?? null,
    paidDepositAt: (b.paid_deposit_at as string) ?? null,
    paidRemainingAt: (b.paid_remaining_at as string) ?? null,
    fullyPaidAt: (b.fully_paid_at as string) ?? null,
    amountDeposit: firstDefinedCents(depFromRow, depFromDbAlt, mergedPricing.depositChargeCents) ?? null,
    amountRemaining: firstDefinedCents(remFromRow, remFromDbAlt, mergedPricing.finalChargeCents) ?? null,
    amountTotal: (b.amount_total as number) ?? null,
    totalAmountCents: (b.total_amount_cents as number) ?? null,
    price: (b.price as number) ?? null,
    refundedTotalCents: (b.refunded_total_cents as number) ?? null,
    refundStatus: (b.refund_status as string) ?? null,
    serviceSubtotalCents: mergedPricing.serviceSubtotalCents,
    serviceFeeCents: mergedPricing.serviceFeeCents,
    convenienceFeeCents: mergedPricing.convenienceFeeCents,
    protectionFeeCents: mergedPricing.protectionFeeCents,
    demandFeeCents: mergedPricing.demandFeeCents,
    feeTotalCents: mergedPricing.feeTotalCents,
    promoDiscountCents: mergedPricing.promoDiscountCents,
    platformFeeTotalCents: mergedPricing.platformFeeTotalCents,
    customerTotalCents: mergedPricing.customerTotalCents,
    depositChargeCents: mergedPricing.depositChargeCents,
    finalChargeCents: mergedPricing.finalChargeCents,
    dynamicPricingReasons: mergedPricing.dynamicPricingReasons,
    serviceTitle,
    proName,
    customerName,
    serviceDate: (b.service_date as string) ?? null,
    serviceTime: (b.service_time as string) ?? null,
    address: (b.address as string) ?? null,
    stripePaymentIntentDepositId:
      (b.stripe_payment_intent_deposit_id as string) ?? null,
    stripePaymentIntentRemainingId:
      (b.stripe_payment_intent_remaining_id as string) ?? null,
    paymentIntentId: (b.payment_intent_id as string) ?? null,
    finalPaymentIntentId: (b.final_payment_intent_id as string) ?? null,
    currency: (b.currency as string) ?? null,
    ledgerDepositPaidPaymentIntentId: ledger.latestDepositPaidPaymentIntentId,
    ledgerRemainingPaidPaymentIntentId: ledger.latestRemainingPaidPaymentIntentId,
    addonLineItems,
  };

  return input;
}

export async function getBookingReceipt(
  admin: AdminClient,
  bookingId: string
): Promise<UnifiedBookingReceipt | null> {
  const input = await loadUnifiedReceiptBookingInput(admin, bookingId);
  return input ? buildUnifiedBookingReceipt(input) : null;
}

/** Server-side canonical total / paid / remaining (same math as receipt JSON). */
export async function getUnifiedBookingPaymentAmountsForBooking(
  admin: AdminClient,
  bookingId: string
): Promise<UnifiedBookingPaymentAmounts | null> {
  const input = await loadUnifiedReceiptBookingInput(admin, bookingId);
  if (!input) return null;
  return computeUnifiedBookingPaymentAmounts(input);
}

export function buildUnifiedReceiptFromPayments(
  bookingInput: UnifiedReceiptBookingInput
): UnifiedBookingReceipt {
  return buildUnifiedBookingReceipt(bookingInput);
}
