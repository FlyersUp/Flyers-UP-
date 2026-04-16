/**
 * Run: npx tsx --test lib/bookings/__tests__/refund-retry-preflight.test.ts
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getRefundRetryEligibilitySnapshot } from '@/lib/bookings/refund-retry-preflight';

const BOOKING_ID = '00000000-0000-4000-8000-000000000099';

function mockAdmin(input: {
  booking: Record<string, unknown> | null;
  refundRows: { payment_intent_id?: string | null; stripe_refund_id?: string | null }[];
}) {
  return {
    from(table: string) {
      if (table === 'bookings') {
        return {
          select() {
            return {
              eq() {
                return {
                  async maybeSingle() {
                    return { data: input.booking, error: null };
                  },
                };
              },
            };
          },
        };
      }
      if (table === 'booking_refund_events') {
        return {
          select() {
            return {
              eq() {
                return {
                  order() {
                    return {
                      limit() {
                        return Promise.resolve({ data: input.refundRows, error: null });
                      },
                    };
                  },
                };
              },
            };
          },
        };
      }
      throw new Error(`unexpected ${table}`);
    },
  } as unknown as SupabaseClient;
}

test('retry_allowed when both PIs exist and ledger has no refunds', async () => {
  const snap = await getRefundRetryEligibilitySnapshot(
    mockAdmin({
      booking: {
        id: BOOKING_ID,
        payment_lifecycle_status: 'partially_refunded',
        refund_status: 'partially_failed',
        payout_released: false,
        final_payment_intent_id: 'pi_f',
        stripe_payment_intent_remaining_id: null,
        stripe_payment_intent_deposit_id: 'pi_d',
        deposit_payment_intent_id: null,
        payment_intent_id: null,
        pro_clawback_remediation_status: 'none',
      },
      refundRows: [],
    }),
    BOOKING_ID
  );
  assert.equal(snap.kind, 'retry_allowed');
  assert.deepEqual(new Set(snap.legsToRetry), new Set(['final', 'deposit']));
});

test('retry_partial_remaining_only when one leg already refunded in ledger', async () => {
  const snap = await getRefundRetryEligibilitySnapshot(
    mockAdmin({
      booking: {
        id: BOOKING_ID,
        payment_lifecycle_status: 'partially_refunded',
        refund_status: 'partially_failed',
        payout_released: false,
        final_payment_intent_id: 'pi_f',
        stripe_payment_intent_remaining_id: null,
        stripe_payment_intent_deposit_id: 'pi_d',
        deposit_payment_intent_id: null,
        payment_intent_id: null,
        pro_clawback_remediation_status: 'none',
      },
      refundRows: [{ payment_intent_id: 'pi_f', stripe_refund_id: 're_1' }],
    }),
    BOOKING_ID
  );
  assert.equal(snap.kind, 'retry_partial_remaining_only');
  assert.deepEqual(snap.legsToRetry, ['deposit']);
});

test('retry_not_needed when ledger shows refund ids for all expected PIs', async () => {
  const snap = await getRefundRetryEligibilitySnapshot(
    mockAdmin({
      booking: {
        id: BOOKING_ID,
        payment_lifecycle_status: 'partially_refunded',
        refund_status: 'partially_failed',
        payout_released: false,
        final_payment_intent_id: 'pi_f',
        stripe_payment_intent_remaining_id: null,
        stripe_payment_intent_deposit_id: 'pi_d',
        deposit_payment_intent_id: null,
        payment_intent_id: null,
        pro_clawback_remediation_status: 'none',
      },
      refundRows: [
        { payment_intent_id: 'pi_f', stripe_refund_id: 're_1' },
        { payment_intent_id: 'pi_d', stripe_refund_id: 're_2' },
      ],
    }),
    BOOKING_ID
  );
  assert.equal(snap.kind, 'retry_not_needed');
});

test('retry_blocked_manual_review when clawback open after payout', async () => {
  const snap = await getRefundRetryEligibilitySnapshot(
    mockAdmin({
      booking: {
        id: BOOKING_ID,
        payment_lifecycle_status: 'partially_refunded',
        refund_status: 'partially_failed',
        payout_released: true,
        final_payment_intent_id: 'pi_f',
        stripe_payment_intent_remaining_id: null,
        stripe_payment_intent_deposit_id: 'pi_d',
        deposit_payment_intent_id: null,
        payment_intent_id: null,
        pro_clawback_remediation_status: 'open',
      },
      refundRows: [],
    }),
    BOOKING_ID
  );
  assert.equal(snap.kind, 'retry_blocked_manual_review');
});

test('retry_blocked_manual_review when ledger rows exist but never got stripe_refund_id', async () => {
  const snap = await getRefundRetryEligibilitySnapshot(
    mockAdmin({
      booking: {
        id: BOOKING_ID,
        payment_lifecycle_status: 'partially_refunded',
        refund_status: 'partially_failed',
        payout_released: false,
        final_payment_intent_id: 'pi_f',
        stripe_payment_intent_remaining_id: null,
        stripe_payment_intent_deposit_id: 'pi_d',
        deposit_payment_intent_id: null,
        payment_intent_id: null,
        pro_clawback_remediation_status: 'none',
      },
      refundRows: [{ payment_intent_id: 'pi_f', stripe_refund_id: null }],
    }),
    BOOKING_ID
  );
  assert.equal(snap.kind, 'retry_blocked_manual_review');
});
