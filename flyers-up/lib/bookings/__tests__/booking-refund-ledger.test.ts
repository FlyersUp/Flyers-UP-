import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { pickLatestStripeRefundIdFromCharge } from '@/lib/bookings/booking-refund-ledger';

describe('pickLatestStripeRefundIdFromCharge', () => {
  it('returns newest refund by created timestamp', () => {
    const id = pickLatestStripeRefundIdFromCharge(
      {
        refunds: {
          data: [
            { id: 're_old', created: 100, amount: 500 },
            { id: 're_new', created: 200, amount: 500 },
          ],
        },
      },
      500
    );
    assert.equal(id, 're_new');
  });

  it('returns null when refunds missing', () => {
    assert.equal(pickLatestStripeRefundIdFromCharge({}, 1), null);
  });
});
