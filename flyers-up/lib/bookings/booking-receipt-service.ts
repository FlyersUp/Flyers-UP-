/**
 * Server-side unified booking receipt: single source of truth from DB rows.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildUnifiedBookingReceipt,
  type UnifiedBookingReceipt,
  type UnifiedReceiptBookingInput,
} from '@/lib/bookings/unified-receipt';
import { loadBookingPaymentLedger } from '@/lib/bookings/booking-payment-ledger';

type AdminClient = SupabaseClient;

export async function getBookingReceipt(
  admin: AdminClient,
  bookingId: string
): Promise<UnifiedBookingReceipt | null> {
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
      ].join(', ')
    )
    .eq('id', bookingId)
    .maybeSingle();

  if (error || !row) {
    return null;
  }

  const ledger = await loadBookingPaymentLedger(admin, bookingId);

  const b = row as unknown as Record<string, unknown>;

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

  const input: UnifiedReceiptBookingInput = {
    bookingId: String(b.id),
    status: String(b.status ?? ''),
    paymentStatus: String(b.payment_status ?? 'UNPAID'),
    finalPaymentStatus: (b.final_payment_status as string) ?? null,
    paidAt: (b.paid_at as string) ?? null,
    paidDepositAt: (b.paid_deposit_at as string) ?? null,
    paidRemainingAt: (b.paid_remaining_at as string) ?? null,
    fullyPaidAt: (b.fully_paid_at as string) ?? null,
    amountDeposit: (b.amount_deposit as number) ?? null,
    amountRemaining: (b.amount_remaining as number) ?? null,
    amountTotal: (b.amount_total as number) ?? null,
    totalAmountCents: (b.total_amount_cents as number) ?? null,
    price: (b.price as number) ?? null,
    refundedTotalCents: (b.refunded_total_cents as number) ?? null,
    refundStatus: (b.refund_status as string) ?? null,
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
  };

  return buildUnifiedBookingReceipt(input);
}

export function buildUnifiedReceiptFromPayments(
  bookingInput: UnifiedReceiptBookingInput
): UnifiedBookingReceipt {
  return buildUnifiedBookingReceipt(bookingInput);
}
