import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeReceiptSubtotalExplanation, splitFinalScheduledDueCents } from '../receipt-subtotal-explanation';
import { buildUnifiedBookingReceipt } from '../unified-receipt';

describe('computeReceiptSubtotalExplanation', () => {
  it('explains hourly from frozen snapshot (e.g. $25/hr × 3.2 hrs → $80)', () => {
    const line = computeReceiptSubtotalExplanation({
      serviceSubtotalCents: 8000,
      chargeModel: 'hourly',
      hourlySelected: true,
      durationHours: 3.2,
      hourlyRateCents: 2500,
      proMinHours: 2,
    });
    assert.ok(line);
    assert.match(line, /\$25/);
    assert.match(line, /3\.2/);
    assert.match(line, /80/);
  });
});

describe('splitFinalScheduledDueCents via receipt', () => {
  it('uses scheduled final minus paid, not aggregate remainingDue', () => {
    const r = buildUnifiedBookingReceipt({
      bookingId: '00000000-0000-4000-8000-000000000001',
      status: 'accepted',
      paymentStatus: 'UNPAID',
      finalPaymentStatus: 'UNPAID',
      amountDeposit: 4830,
      amountRemaining: 4829,
      amountTotal: 9659,
      totalAmountCents: 9659,
      customerTotalCents: 9659,
      serviceSubtotalCents: 8000,
      feeTotalCents: 1659,
      serviceTitle: 'Walk',
      proName: 'Pro',
    });
    assert.equal(splitFinalScheduledDueCents(r), Math.max(0, r.remainingScheduledCents - r.remainingPaidCents));
    assert.ok(r.remainingDueCents >= r.remainingScheduledCents);
  });
});
