/**
 * Ensures notification deep links match canonical booking routes (QA / App Review safety).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getTargetPathForNotification } from '@/lib/notifications/routing';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';
import { bookingDetailPathForRole } from '@/lib/bookings/booking-routes';

const SAMPLE_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('notification ↔ booking route parity', () => {
  it('customer booking notification resolves to customer booking detail', () => {
    assert.strictEqual(
      getTargetPathForNotification(NOTIFICATION_TYPES.BOOKING_ACCEPTED, 'customer', SAMPLE_ID),
      bookingDetailPathForRole('customer', SAMPLE_ID)
    );
  });

  it('pro booking notification resolves to pro booking detail', () => {
    assert.strictEqual(
      getTargetPathForNotification(NOTIFICATION_TYPES.BOOKING_REQUESTED, 'pro', SAMPLE_ID),
      bookingDetailPathForRole('pro', SAMPLE_ID)
    );
  });
});
