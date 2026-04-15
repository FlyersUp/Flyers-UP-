import { refundLifecycleMetadata } from '@/lib/stripe/booking-payment-metadata-lifecycle';
import { refundBatchIsComplete } from '@/lib/stripe/refund-batch-outcome';
import { refundPaymentIntent as refundPaymentIntentDefault } from '@/lib/stripe/server';

export type AdminRefundCustomerStripeRefundRow = {
  pi: string;
  refundId: string;
  amountCents: number;
};

export type RunAdminRefundCustomerStripeRefundsResult =
  | {
      ok: true;
      refundIds: AdminRefundCustomerStripeRefundRow[];
      expectedRefundAttempts: number;
    }
  | { ok: false; error: 'stripe_refund_failed' | 'stripe_refund_partial_failure' };

/**
 * Stripe refund attempts for {@link runAdminRefundCustomer}: final PI (if any), then deposit PI when
 * distinct. Matches production ordering and metadata. Surfaces batch outcome so callers can fail
 * closed when any expected attempt does not return a refund id (validation abort, missing charge, etc.).
 */
export async function runAdminRefundCustomerStripeRefunds(input: {
  bookingId: string;
  piFinal: string | null;
  piDep: string | null;
  depCents: number;
  finalCents: number;
  subtotalSnap: number;
  totalSnap: number;
  platformSnap: number;
  pricingSnap: string | null;
  payoutReleased: boolean;
  /** Unit tests: avoid live Stripe while preserving call order and metadata shape. */
  refundPaymentIntent?: typeof refundPaymentIntentDefault;
}): Promise<RunAdminRefundCustomerStripeRefundsResult> {
  const refundFn = input.refundPaymentIntent ?? refundPaymentIntentDefault;
  const id = input.bookingId;
  const refundType = input.payoutReleased ? 'after_payout' : 'before_payout';
  const {
    piFinal,
    piDep,
    depCents,
    finalCents,
    subtotalSnap,
    totalSnap,
    platformSnap,
    pricingSnap,
  } = input;

  const refundIds: AdminRefundCustomerStripeRefundRow[] = [];
  try {
    if (piFinal) {
      const rid = await refundFn(
        piFinal,
        refundLifecycleMetadata({
          booking_id: id,
          refund_scope: 'full',
          resolution_type: 'admin_refund_customer',
          refunded_amount_cents: finalCents > 0 ? finalCents : 0,
          refund_type: refundType,
          refund_source_payment_phase: 'final',
          subtotal_cents: subtotalSnap,
          total_amount_cents: totalSnap,
          platform_fee_cents: platformSnap,
          deposit_amount_cents: depCents,
          final_amount_cents: finalCents,
          pricing_version: pricingSnap,
        })
      );
      if (rid) {
        refundIds.push({ pi: piFinal, refundId: rid, amountCents: finalCents > 0 ? finalCents : 0 });
      } else {
        console.error('[runAdminRefundCustomer] refundPaymentIntent returned null', {
          bookingId: id,
          payment_intent: piFinal,
          phase: 'final',
        });
      }
    }
    if (piDep && piDep !== piFinal) {
      const rid = await refundFn(
        piDep,
        refundLifecycleMetadata({
          booking_id: id,
          refund_scope: 'full',
          resolution_type: 'admin_refund_customer',
          refunded_amount_cents: depCents > 0 ? depCents : 0,
          refund_type: refundType,
          refund_source_payment_phase: 'deposit',
          subtotal_cents: subtotalSnap,
          total_amount_cents: totalSnap,
          platform_fee_cents: platformSnap,
          deposit_amount_cents: depCents,
          final_amount_cents: finalCents,
          pricing_version: pricingSnap,
        })
      );
      if (rid) {
        refundIds.push({ pi: piDep, refundId: rid, amountCents: depCents > 0 ? depCents : 0 });
      } else {
        console.error('[runAdminRefundCustomer] refundPaymentIntent returned null', {
          bookingId: id,
          payment_intent: piDep,
          phase: 'deposit',
        });
      }
    }
  } catch (e) {
    console.error('[runAdminRefundCustomer] stripe refund failed', id, e);
    return { ok: false, error: 'stripe_refund_failed' };
  }

  const expectedRefundAttempts =
    (piFinal ? 1 : 0) + (piDep && piDep !== piFinal ? 1 : 0);
  if (!refundBatchIsComplete(expectedRefundAttempts, refundIds.length)) {
    console.error('[runAdminRefundCustomer] stripe refund returned null or partial batch', {
      bookingId: id,
      expectedRefundAttempts,
      succeeded: refundIds.length,
      piFinal: piFinal ?? null,
      piDepositDistinct: piDep && piDep !== piFinal ? piDep : null,
      note: 'Do not mark booking refunded; Stripe may have succeeded for a subset of PIs.',
    });
    return {
      ok: false,
      error: refundIds.length === 0 ? 'stripe_refund_failed' : 'stripe_refund_partial_failure',
    };
  }

  return { ok: true, refundIds, expectedRefundAttempts };
}
