/**
 * Recompute customer-facing quote for receipt display when PI metadata / DB breakdown is missing.
 * Mirrors /api/bookings/[bookingId]/checkout-quote data loading.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { computeQuote } from '@/lib/bookingQuote';
import type { UnifiedReceiptBookingInput } from '@/lib/bookings/unified-receipt';

type AdminClient = SupabaseClient;

function safeInt(n: unknown): number {
  const x = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.round(x);
}

/**
 * Returns partial receipt input fields from a live quote, or null if booking/customer invalid.
 */
export async function computeReceiptQuoteOverlay(
  admin: AdminClient,
  bookingRow: Record<string, unknown>
): Promise<Partial<UnifiedReceiptBookingInput> | null> {
  const id = String(bookingRow.id ?? '');
  const customerId = bookingRow.customer_id as string | null | undefined;
  const proId = bookingRow.pro_id as string | null | undefined;
  if (!id || !customerId || !proId) return null;

  const { data: proRow, error: proErr } = await admin
    .from('service_pros')
    .select('id, user_id, display_name, category_id')
    .eq('id', proId)
    .maybeSingle();

  if (proErr || !proRow) return null;

  const proUserId = String((proRow as { user_id: string }).user_id);

  const { data: proPricing } = await admin
    .from('pro_profiles')
    .select(
      'pricing_model, starting_price, starting_rate, hourly_rate, min_hours, travel_fee_enabled, travel_fee_base, travel_free_within_miles, travel_extra_per_mile, deposit_percent_default, deposit_percent_min, deposit_percent_max'
    )
    .eq('user_id', proUserId)
    .maybeSingle();

  let serviceName = 'Service';
  const catId = (proRow as { category_id?: string | null }).category_id;
  if (catId) {
    const { data: catRow } = await admin
      .from('service_categories')
      .select('name')
      .eq('id', catId)
      .maybeSingle();
    if (catRow && typeof (catRow as { name?: string }).name === 'string') {
      serviceName = String((catRow as { name: string }).name).trim() || 'Service';
    }
  }

  const proName = ((proRow as { display_name?: string }).display_name ?? 'Pro').trim();

  const { count } = await admin
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', customerId)
    .in('status', ['fully_paid', 'completed', 'customer_confirmed', 'auto_confirmed', 'payout_released']);

  const quoteResult = computeQuote(
    {
      id,
      customer_id: customerId,
      pro_id: proId,
      service_date: String(bookingRow.service_date ?? ''),
      service_time: String(bookingRow.service_time ?? ''),
      address: (bookingRow.address as string) ?? null,
      price: (bookingRow.price as number) ?? null,
      status: String(bookingRow.status ?? ''),
      duration_hours: (bookingRow.duration_hours as number | null) ?? null,
      miles_distance: (bookingRow.miles_distance as number | null) ?? null,
      urgency: (bookingRow.urgency as string | null) ?? null,
      created_at: (bookingRow.created_at as string | null) ?? null,
      fee_profile: (bookingRow.fee_profile as string | null) ?? null,
      pricing_occupation_slug: (bookingRow.pricing_occupation_slug as string | null) ?? null,
      pricing_category_slug: (bookingRow.pricing_category_slug as string | null) ?? null,
    },
    proPricing,
    serviceName,
    proName,
    {
      paymentDueAt: (bookingRow.payment_due_at as string | null) ?? null,
      completedOrPaidBookingCount: count ?? 0,
    }
  );

  const q = quoteResult.quote;
  return {
    serviceSubtotalCents: q.amountSubtotal,
    serviceFeeCents: q.serviceFeeCents,
    convenienceFeeCents: q.convenienceFeeCents,
    protectionFeeCents: q.protectionFeeCents,
    demandFeeCents: q.demandFeeCents,
    feeTotalCents: q.feeTotalCents,
    promoDiscountCents: q.promoDiscountCents,
    platformFeeTotalCents: q.feeTotalCents,
    customerTotalCents: q.amountTotal,
    amountDeposit: q.amountDeposit,
    amountRemaining: q.amountRemaining,
    depositChargeCents: q.amountDeposit,
    finalChargeCents: q.amountRemaining,
    dynamicPricingReasons: q.dynamicPricingReasons ?? [],
  };
}

export function dbRowPricingOverlay(bookingRow: Record<string, unknown>): Partial<UnifiedReceiptBookingInput> {
  const sub = safeInt(bookingRow.amount_subtotal);
  const total = safeInt(bookingRow.total_amount_cents) || safeInt(bookingRow.amount_total);
  const fee =
    safeInt(bookingRow.customer_fees_retained_cents) || safeInt(bookingRow.amount_platform_fee);
  const out: Partial<UnifiedReceiptBookingInput> = {};
  if (sub > 0) out.serviceSubtotalCents = sub;
  if (fee > 0) {
    out.feeTotalCents = fee;
    out.platformFeeTotalCents = fee;
  }
  if (total > 0) out.customerTotalCents = total;
  return out;
}

/** Prefer first defined numeric (including 0 where explicitly set). */
export function coalesceCents(
  ...candidates: Array<number | null | undefined>
): number | null {
  for (const c of candidates) {
    if (c == null) continue;
    if (typeof c === 'number' && Number.isFinite(c)) return Math.round(c);
  }
  return null;
}
