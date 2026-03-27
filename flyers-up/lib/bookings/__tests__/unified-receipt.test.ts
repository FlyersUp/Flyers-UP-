/**
 * Unified booking receipt builder + payment phase helpers.
 * Run: npx tsx --test lib/bookings/__tests__/unified-receipt.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  buildUnifiedBookingReceipt,
  inferPaymentPhaseFromBookingIds,
} from '../unified-receipt';
import { resolveWebhookPaymentKind } from '../../stripe/webhook-payment-phase';

const BID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

describe('buildUnifiedBookingReceipt', () => {
  it('deposit only paid (split)', () => {
    const r = buildUnifiedBookingReceipt({
      bookingId: BID,
      status: 'deposit_paid',
      paymentStatus: 'PAID',
      finalPaymentStatus: 'UNPAID',
      paidDepositAt: '2025-01-01T12:00:00Z',
      amountDeposit: 5000,
      amountRemaining: 15000,
      amountTotal: 20000,
      totalAmountCents: 20000,
      serviceTitle: 'Cleaning',
      proName: 'Alex',
    });
    assert.strictEqual(r.overallStatus, 'deposit_paid');
    assert.strictEqual(r.totalBookingCents, 20000);
    assert.strictEqual(r.depositPaidCents, 5000);
    assert.strictEqual(r.remainingDueCents, 15000);
    assert.strictEqual(r.isSplitPayment, true);
    assert.deepStrictEqual(r.warnings, []);
    assert.deepStrictEqual(r.dynamicPricingReasons, []);
  });

  it('passes through dynamic pricing reason codes', () => {
    const r = buildUnifiedBookingReceipt({
      bookingId: BID,
      status: 'fully_paid',
      paymentStatus: 'PAID',
      finalPaymentStatus: 'PAID',
      amountDeposit: 0,
      amountRemaining: 0,
      amountTotal: 5000,
      totalAmountCents: 5000,
      paidAt: '2025-01-01T00:00:00Z',
      serviceTitle: 'X',
      proName: 'Y',
      dynamicPricingReasons: ['first_booking_convenience_waived', 'fee_cap_applied_under_25'],
    });
    assert.deepStrictEqual(r.dynamicPricingReasons, [
      'first_booking_convenience_waived',
      'fee_cap_applied_under_25',
    ]);
  });

  it('deposit + final both paid', () => {
    const r = buildUnifiedBookingReceipt({
      bookingId: BID,
      status: 'fully_paid',
      paymentStatus: 'PAID',
      finalPaymentStatus: 'PAID',
      paidDepositAt: '2025-01-01T12:00:00Z',
      paidRemainingAt: '2025-01-02T12:00:00Z',
      amountDeposit: 5000,
      amountRemaining: 15000,
      amountTotal: 20000,
      totalAmountCents: 20000,
      serviceTitle: 'Cleaning',
      proName: 'Alex',
    });
    assert.strictEqual(r.overallStatus, 'fully_paid');
    assert.strictEqual(r.totalPaidCents, 20000);
    assert.strictEqual(r.remainingDueCents, 0);
  });

  it('failed final payment', () => {
    const r = buildUnifiedBookingReceipt({
      bookingId: BID,
      status: 'awaiting_payment',
      paymentStatus: 'PAID',
      finalPaymentStatus: 'FAILED',
      paidDepositAt: '2025-01-01T12:00:00Z',
      amountDeposit: 4000,
      amountRemaining: 12000,
      amountTotal: 16000,
      totalAmountCents: 16000,
      serviceTitle: 'Moving',
      proName: 'Sam',
    });
    assert.strictEqual(r.remainingPhaseStatus, 'failed');
    assert.strictEqual(r.overallStatus, 'deposit_paid');
    assert.deepStrictEqual(r.warnings, []);
  });

  it('refunded deposit (full of amount paid)', () => {
    const r = buildUnifiedBookingReceipt({
      bookingId: BID,
      status: 'cancelled',
      paymentStatus: 'PAID',
      finalPaymentStatus: 'UNPAID',
      paidDepositAt: '2025-01-01T12:00:00Z',
      amountDeposit: 8000,
      amountRemaining: 12000,
      amountTotal: 20000,
      totalAmountCents: 20000,
      refundedTotalCents: 8000,
      refundStatus: 'succeeded',
      serviceTitle: 'Errand',
      proName: 'Jo',
    });
    assert.strictEqual(r.overallStatus, 'refunded');
    assert.deepStrictEqual(r.warnings, []);
  });

  it('partially refunded final', () => {
    const r = buildUnifiedBookingReceipt({
      bookingId: BID,
      status: 'fully_paid',
      paymentStatus: 'PAID',
      finalPaymentStatus: 'PAID',
      paidDepositAt: '2025-01-01T12:00:00Z',
      paidRemainingAt: '2025-01-02T12:00:00Z',
      amountDeposit: 5000,
      amountRemaining: 5000,
      amountTotal: 10000,
      totalAmountCents: 10000,
      refundedTotalCents: 2000,
      serviceTitle: 'Task',
      proName: 'Rae',
    });
    assert.strictEqual(r.overallStatus, 'partially_refunded');
    assert.deepStrictEqual(r.warnings, []);
  });

  it('legacy single payment fully paid', () => {
    const r = buildUnifiedBookingReceipt({
      bookingId: BID,
      status: 'fully_paid',
      paymentStatus: 'PAID',
      amountDeposit: 0,
      amountRemaining: 0,
      amountTotal: 9900,
      totalAmountCents: 9900,
      paidAt: '2025-01-03T10:00:00Z',
      serviceTitle: 'Help',
      proName: 'Lee',
    });
    assert.strictEqual(r.isSplitPayment, false);
    assert.strictEqual(r.overallStatus, 'fully_paid');
    assert.strictEqual(r.totalPaidCents, 9900);
    assert.deepStrictEqual(r.warnings, []);
  });

  it('ledger deposit PI mismatch: do not treat deposit as paid', () => {
    const r = buildUnifiedBookingReceipt({
      bookingId: BID,
      status: 'deposit_paid',
      paymentStatus: 'PAID',
      finalPaymentStatus: 'UNPAID',
      paidDepositAt: '2025-01-01T12:00:00Z',
      amountDeposit: 5000,
      amountRemaining: 15000,
      amountTotal: 20000,
      totalAmountCents: 20000,
      stripePaymentIntentDepositId: 'pi_new',
      paymentIntentId: 'pi_new',
      ledgerDepositPaidPaymentIntentId: 'pi_old',
      serviceTitle: 'Cleaning',
      proName: 'Alex',
    });
    assert.ok(r.warnings.includes('deposit_pi_mismatch_vs_ledger'));
    assert.strictEqual(r.overallStatus, 'unpaid');
    assert.strictEqual(r.paidDepositAt, null);
  });

  it('invalid currency normalizes to usd with warning', () => {
    const r = buildUnifiedBookingReceipt({
      bookingId: BID,
      status: 'fully_paid',
      paymentStatus: 'PAID',
      amountDeposit: 0,
      amountRemaining: 0,
      amountTotal: 1000,
      totalAmountCents: 1000,
      paidAt: '2025-01-01T00:00:00Z',
      currency: 'not-a-code',
      serviceTitle: 'X',
      proName: 'Y',
    });
    assert.strictEqual(r.currency, 'usd');
    assert.ok(r.warnings.includes('currency_normalized_to_usd'));
  });
});

describe('inferPaymentPhaseFromBookingIds', () => {
  it('matches deposit PI without metadata', () => {
    const k = inferPaymentPhaseFromBookingIds('pi_dep', {
      payment_intent_id: 'pi_dep',
      final_payment_intent_id: 'pi_rem',
    });
    assert.strictEqual(k, 'deposit');
  });

  it('matches remaining PI', () => {
    const k = inferPaymentPhaseFromBookingIds('pi_rem', {
      stripe_payment_intent_deposit_id: 'pi_dep',
      stripe_payment_intent_remaining_id: 'pi_rem',
    });
    assert.strictEqual(k, 'remaining');
  });

  it('returns unknown when no match', () => {
    const k = inferPaymentPhaseFromBookingIds('pi_other', {
      payment_intent_id: 'pi_dep',
    });
    assert.strictEqual(k, 'unknown');
  });
});

describe('resolveWebhookPaymentKind', () => {
  it('prefers payment_phase remaining', () => {
    const k = resolveWebhookPaymentKind(
      { payment_phase: 'remaining' },
      'pi_x',
      {}
    );
    assert.strictEqual(k, 'remaining');
  });

  it('treats payment_phase full as legacy', () => {
    const k = resolveWebhookPaymentKind({ payment_phase: 'full' }, 'pi_x', {});
    assert.strictEqual(k, 'legacy_full');
  });

  it('falls back to PI id match (old metadata)', () => {
    const k = resolveWebhookPaymentKind(
      {},
      'pi_dep_only',
      { payment_intent_id: 'pi_dep_only' }
    );
    assert.strictEqual(k, 'deposit');
  });

  it('legacy full when no hints', () => {
    const k = resolveWebhookPaymentKind({}, 'pi_unknown', {});
    assert.strictEqual(k, 'legacy_full');
  });
});
