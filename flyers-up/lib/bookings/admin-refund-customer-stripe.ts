import { refundLifecycleMetadata } from '@/lib/stripe/booking-payment-metadata-lifecycle';
import { refundBatchIsComplete } from '@/lib/stripe/refund-batch-outcome';
import { refundPaymentIntent as refundPaymentIntentDefault } from '@/lib/stripe/server';

export type AdminRefundCustomerStripeRefundRow = {
  pi: string;
  refundId: string;
  amountCents: number;
};

export type AdminRefundLegResult =
  | {
      phase: 'final' | 'deposit';
      pi: string;
      ok: true;
      refundId: string;
      amountCents: number;
    }
  | { phase: 'final' | 'deposit'; pi: string; ok: false; reason: 'null_refund' };

export type RunAdminRefundCustomerStripeRefundsResult =
  | {
      ok: true;
      refundIds: AdminRefundCustomerStripeRefundRow[];
      expectedRefundAttempts: number;
      legs: AdminRefundLegResult[];
    }
  | {
      ok: false;
      error: 'stripe_refund_failed' | 'stripe_refund_partial_failure';
      refundIds: AdminRefundCustomerStripeRefundRow[];
      expectedRefundAttempts: number;
      legs: AdminRefundLegResult[];
    };

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
  /** Stripe metadata.resolution_type (default admin_refund_customer). */
  resolutionType?: string;
  /** When set, only these phases call Stripe (retry preflight). */
  retryPhases?: ReadonlySet<'final' | 'deposit'>;
  /** Unit tests: avoid live Stripe while preserving call order and metadata shape. */
  refundPaymentIntent?: typeof refundPaymentIntentDefault;
}): Promise<RunAdminRefundCustomerStripeRefundsResult> {
  const refundFn = input.refundPaymentIntent ?? refundPaymentIntentDefault;
  const id = input.bookingId;
  const refundType = input.payoutReleased ? 'after_payout' : 'before_payout';
  const resolutionType = input.resolutionType ?? 'admin_refund_customer';
  const retryPhases = input.retryPhases;
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
  const legs: AdminRefundLegResult[] = [];

  try {
    if (piFinal && (!retryPhases || retryPhases.has('final'))) {
      const rid = await refundFn(
        piFinal,
        refundLifecycleMetadata({
          booking_id: id,
          refund_scope: 'full',
          resolution_type: resolutionType,
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
        const amount = finalCents > 0 ? finalCents : 0;
        refundIds.push({ pi: piFinal, refundId: rid, amountCents: amount });
        legs.push({ phase: 'final', pi: piFinal, ok: true, refundId: rid, amountCents: amount });
      } else {
        console.error('[runAdminRefundCustomer] refundPaymentIntent returned null', {
          bookingId: id,
          payment_intent: piFinal,
          phase: 'final',
        });
        legs.push({ phase: 'final', pi: piFinal, ok: false, reason: 'null_refund' });
      }
    } else if (piFinal && retryPhases && !retryPhases.has('final')) {
      /* skipped — already refunded per preflight */
    }
    if (piDep && piDep !== piFinal && (!retryPhases || retryPhases.has('deposit'))) {
      const rid = await refundFn(
        piDep,
        refundLifecycleMetadata({
          booking_id: id,
          refund_scope: 'full',
          resolution_type: resolutionType,
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
        const amount = depCents > 0 ? depCents : 0;
        refundIds.push({ pi: piDep, refundId: rid, amountCents: amount });
        legs.push({ phase: 'deposit', pi: piDep, ok: true, refundId: rid, amountCents: amount });
      } else {
        console.error('[runAdminRefundCustomer] refundPaymentIntent returned null', {
          bookingId: id,
          payment_intent: piDep,
          phase: 'deposit',
        });
        legs.push({ phase: 'deposit', pi: piDep, ok: false, reason: 'null_refund' });
      }
    } else if (piDep && piDep !== piFinal && retryPhases && !retryPhases.has('deposit')) {
      /* skipped */
    }
  } catch (e) {
    console.error('[runAdminRefundCustomer] stripe refund failed', id, e);
    return {
      ok: false,
      error: 'stripe_refund_failed',
      refundIds,
      expectedRefundAttempts: countExpectedRefundAttempts(piFinal, piDep, retryPhases),
      legs,
    };
  }

  const expectedRefundAttempts = countExpectedRefundAttempts(piFinal, piDep, retryPhases);
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
      refundIds,
      expectedRefundAttempts,
      legs,
    };
  }

  return { ok: true, refundIds, expectedRefundAttempts, legs };
}

function countExpectedRefundAttempts(
  piFinal: string | null,
  piDep: string | null,
  retryPhases?: ReadonlySet<'final' | 'deposit'>
): number {
  let n = 0;
  if (piFinal && (!retryPhases || retryPhases.has('final'))) n += 1;
  if (piDep && piDep !== piFinal && (!retryPhases || retryPhases.has('deposit'))) n += 1;
  return n;
}
