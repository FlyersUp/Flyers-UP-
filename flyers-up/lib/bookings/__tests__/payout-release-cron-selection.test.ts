import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  PAYOUT_RELEASE_CRON_LIFECYCLE_SCAN,
  payoutReleaseCronCandidateOrFilter,
} from '../payout-release-cron-selection';

describe('payoutReleaseCronCandidateOrFilter', () => {
  it('filters by payment_lifecycle_status and legacy final_payment_status only', () => {
    const f = payoutReleaseCronCandidateOrFilter();
    assert.ok(f.includes('payment_lifecycle_status.in.'));
    for (const s of PAYOUT_RELEASE_CRON_LIFECYCLE_SCAN) {
      assert.ok(f.includes(s), `missing lifecycle ${s}`);
    }
    assert.ok(f.includes('payment_lifecycle_status.is.null'));
    assert.ok(f.includes('final_payment_status.eq.PAID'));
    assert.ok(
      !f.includes('customer_confirmed') && !f.includes('awaiting_customer_confirmation'),
      'must not use legacy bookings.status scan'
    );
  });
});
