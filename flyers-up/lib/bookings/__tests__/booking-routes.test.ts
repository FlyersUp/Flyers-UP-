/**
 * Canonical booking URLs used by checkout redirects and QA docs.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  bookingConfirmedPath,
  bookingDepositPath,
  bookingDetailPathForRole,
  bookingFinalCheckoutPath,
} from '@/lib/bookings/booking-routes';

const ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

describe('booking-routes', () => {
  it('bookingDetailPathForRole matches customer/pro prefixes', () => {
    assert.strictEqual(bookingDetailPathForRole('customer', ID), `/customer/bookings/${ID}`);
    assert.strictEqual(bookingDetailPathForRole('pro', ID), `/pro/bookings/${ID}`);
  });

  it('bookingConfirmedPath adds phase=final only when requested', () => {
    assert.strictEqual(bookingConfirmedPath(ID), `/bookings/${ID}/confirmed`);
    assert.strictEqual(bookingConfirmedPath(ID, { phase: 'final' }), `/bookings/${ID}/confirmed?phase=final`);
  });

  it('deposit and final checkout paths are stable', () => {
    assert.strictEqual(bookingDepositPath(ID), `/customer/bookings/${ID}/deposit`);
    assert.strictEqual(bookingFinalCheckoutPath(ID), `/bookings/${ID}/checkout?phase=final`);
  });
});
