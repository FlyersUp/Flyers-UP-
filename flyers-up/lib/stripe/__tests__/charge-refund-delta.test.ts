/**
 * Run: npx tsx --test lib/stripe/__tests__/charge-refund-delta.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { computeChargeRefundedDeltaCents } from '../charge-refund-delta';

describe('computeChargeRefundedDeltaCents', () => {
  it('first refund: previous 0 → delta full amount_refunded', () => {
    const d = computeChargeRefundedDeltaCents({
      object: { amount_refunded: 5000 },
      previous_attributes: { amount_refunded: 0 },
    });
    assert.strictEqual(d, 5000);
  });

  it('replay same event: previous equals current → zero delta', () => {
    const d = computeChargeRefundedDeltaCents({
      object: { amount_refunded: 5000 },
      previous_attributes: { amount_refunded: 5000 },
    });
    assert.strictEqual(d, 0);
  });

  it('second partial on same charge: delta is increment only', () => {
    const d = computeChargeRefundedDeltaCents({
      object: { amount_refunded: 8000 },
      previous_attributes: { amount_refunded: 5000 },
    });
    assert.strictEqual(d, 3000);
  });

  it('missing previous_attributes treats as 0', () => {
    const d = computeChargeRefundedDeltaCents({
      object: { amount_refunded: 1200 },
    });
    assert.strictEqual(d, 1200);
  });

  it('multi-leg simulation: two events sum to total refunded (caller accumulates)', () => {
    const leg1 = computeChargeRefundedDeltaCents({
      object: { amount_refunded: 4000 },
      previous_attributes: { amount_refunded: 0 },
    });
    const leg2 = computeChargeRefundedDeltaCents({
      object: { amount_refunded: 9000 },
      previous_attributes: { amount_refunded: 4000 },
    });
    assert.strictEqual(leg1 + leg2, 9000);
  });
});
