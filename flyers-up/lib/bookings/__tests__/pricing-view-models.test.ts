import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { UnifiedBookingReceipt } from '@/lib/bookings/unified-receipt';
import {
  buildCustomerPriceViewFromReceipt,
  buildProEarningsViewFromBookingFallback,
  buildProEarningsViewFromReceipt,
} from '../pricing-view-models';

const baseReceipt = (over: Partial<UnifiedBookingReceipt>): UnifiedBookingReceipt => ({
  bookingId: 'b1',
  bookingReference: 'ABCD1234',
  currency: 'usd',
  serviceTitle: 'Clean',
  proName: 'Pro',
  customerName: null,
  serviceDate: '2026-04-10',
  serviceTime: '10:00',
  address: null,
  totalBookingCents: 12000,
  serviceSubtotalCents: 10000,
  serviceFeeCents: 500,
  convenienceFeeCents: 400,
  protectionFeeCents: 600,
  demandFeeCents: 200,
  feeTotalCents: 1700,
  promoDiscountCents: 0,
  platformFeeCents: 1700,
  customerTotalCents: 12000,
  depositScheduledCents: 6000,
  remainingScheduledCents: 6000,
  depositPaidCents: 0,
  remainingPaidCents: 0,
  totalPaidCents: 0,
  remainingDueCents: 12000,
  refundedTotalCents: 0,
  depositPhaseStatus: 'unpaid',
  remainingPhaseStatus: 'unpaid',
  paidDepositAt: null,
  paidRemainingAt: null,
  overallStatus: 'unpaid',
  stripePaymentIntentDepositId: null,
  stripePaymentIntentRemainingId: null,
  isSplitPayment: true,
  dynamicPricingReasons: [],
  warnings: [],
  addonLineItems: [{ title: 'Deep clean', priceCents: 2000 }],
  ...over,
  subtotalExplanation: over.subtotalExplanation ?? null,
});

describe('pricing-view-models', () => {
  it('CustomerPriceView includes customer fee categories', () => {
    const r = baseReceipt({});
    const v = buildCustomerPriceViewFromReceipt(r);
    assert.strictEqual(v.convenienceFeeCents, 400);
    assert.strictEqual(v.protectionFeeCents, 600);
    assert.strictEqual(v.demandFeeCents, 200);
    assert.strictEqual(v.customerTotalCents, 12000);
  });

  it('ProEarningsView omits customer fee categories', () => {
    const r = baseReceipt({});
    const v = buildProEarningsViewFromReceipt(r);
    assert.deepStrictEqual(Object.keys(v).sort(), [
      'addonLineItems',
      'estimatedNetCents',
      'platformFeeDeductedFromProCents',
      'refundedTotalCents',
      'yourRateCents',
    ]);
    assert.strictEqual(v.yourRateCents, 10000);
    assert.strictEqual(v.estimatedNetCents, 10000);
    assert.strictEqual(v.platformFeeDeductedFromProCents, null);
  });

  it('ProEarningsView subtracts refunds only (not customer fees)', () => {
    const r = baseReceipt({ refundedTotalCents: 1000 });
    const v = buildProEarningsViewFromReceipt(r);
    assert.strictEqual(v.estimatedNetCents, 9000);
  });

  it('buildProEarningsViewFromBookingFallback infers rate from total minus retained fees', () => {
    const v = buildProEarningsViewFromBookingFallback({
      amountSubtotalCents: null,
      amountTotalCents: 12000,
      customerFeesRetainedCents: 2000,
      refundedTotalCents: 0,
    });
    assert.ok(v);
    assert.strictEqual(v!.yourRateCents, 10000);
  });
});
