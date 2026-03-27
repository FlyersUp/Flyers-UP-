import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mergeDynamicPricingReasonsCsv, parseDynamicPricingReasonsCsv } from '../booking-payment-intent-metadata';

describe('dynamic pricing reasons metadata', () => {
  it('parses CSV reasons', () => {
    assert.deepStrictEqual(parseDynamicPricingReasonsCsv('a,b,, a '), ['a', 'b', 'a']);
  });

  it('merges deposit then final with dedupe preserving order', () => {
    assert.deepStrictEqual(
      mergeDynamicPricingReasonsCsv('fee_cap_applied_under_25,demand_fee_cap_applied', 'demand_fee_cap_applied,new_reason'),
      ['fee_cap_applied_under_25', 'demand_fee_cap_applied', 'new_reason']
    );
  });
});
