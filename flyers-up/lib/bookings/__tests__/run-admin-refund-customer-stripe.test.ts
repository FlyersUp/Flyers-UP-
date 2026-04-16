/**
 * Integration-style coverage for admin multi-PI refunds.
 *
 * Run: npx tsx --test lib/bookings/__tests__/run-admin-refund-customer-stripe.test.ts
 *
 * ## Why this exists
 *
 * Split bookings can have **two** Stripe PaymentIntents (deposit + final). `runAdminRefundCustomer`
 * refunds the final PI first, then the deposit PI when it differs. If the first `refunds.create`
 * succeeds in Stripe but the second call returns `null` (metadata validation abort in production,
 * missing charge, etc.), **Stripe is ahead of app state**: money may have moved for one leg while
 * the app never received a refund id for the other. The service must **fail closed** — return
 * `stripe_refund_partial_failure`, avoid `payment_lifecycle_status: 'refunded'` / `refund_status:
 * 'succeeded'`, and log loudly so ops can reconcile.
 *
 * ## What is tested
 *
 * - {@link runAdminRefundCustomerStripeRefunds} — exact Stripe attempt + batch guard used by
 *   {@link runAdminRefundCustomer} (delegated 1:1).
 * - {@link runAdminRefundCustomer} — wiring + **no** terminal refunded state on partial batch failure;
 *   booking is flagged for admin review with `refund_status: partially_failed`.
 *
 * Full success path for `runAdminRefundCustomer` (ledger rows, payout queue, payment events) is
 * not duplicated here; it stays covered by production code calling the same batch helper plus
 * integration/E2E flows.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';

import { runAdminRefundCustomerStripeRefunds } from '@/lib/bookings/admin-refund-customer-stripe';
import { runAdminRefundCustomer } from '@/lib/bookings/payment-lifecycle-service';
import type { refundPaymentIntent as RefundPiFn } from '@/lib/stripe/server';

const PI_FINAL = 'pi_final_admin_test';
const PI_DEP = 'pi_deposit_admin_test';
const BOOKING_ID = 'booking_admin_refund_test';

function baseStripeInput(overrides?: {
  refundPaymentIntent?: typeof RefundPiFn;
}) {
  return {
    bookingId: BOOKING_ID,
    piFinal: PI_FINAL,
    piDep: PI_DEP,
    depCents: 2000,
    finalCents: 8000,
    subtotalSnap: 10000,
    totalSnap: 10200,
    platformSnap: 200,
    pricingSnap: 'v1',
    payoutReleased: false,
    ...overrides,
  };
}

function mockAdminForRunAdminRefund(bookingRow: Record<string, unknown>, bookingUpdates: unknown[]) {
  return {
    from(table: string) {
      if (table === 'bookings') {
        return {
          select(_cols: string) {
            return {
              eq(_col: string, _val: string) {
                return {
                  async maybeSingle() {
                    return { data: bookingRow, error: null };
                  },
                };
              },
            };
          },
          update(payload: unknown) {
            bookingUpdates.push(payload);
            return {
              eq() {
                return Promise.resolve({ error: null });
              },
            };
          },
        };
      }
      if (table === 'booking_payment_events') {
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      filter() {
                        return { maybeSingle: async () => ({ data: null }) };
                      },
                      maybeSingle: async () => ({ data: null }),
                    };
                  },
                  maybeSingle: async () => ({ data: null }),
                };
              },
            };
          },
          insert() {
            return Promise.resolve({ error: null });
          },
        };
      }
      if (table === 'booking_refund_remediation_events') {
        return {
          insert() {
            return Promise.resolve({ error: null });
          },
        };
      }
      if (table === 'booking_refund_events') {
        return {
          select() {
            return {
              eq() {
                return { maybeSingle: async () => ({ data: null }) };
              },
            };
          },
          insert() {
            return {
              select() {
                return {
                  maybeSingle: async () => ({ data: { id: 'ledger' }, error: null }),
                };
              },
            };
          },
        };
      }
      if (table === 'booking_payment_summary') {
        return {
          upsert() {
            return Promise.resolve({ error: null });
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  } as unknown as SupabaseClient;
}

test('runAdminRefundCustomerStripeRefunds: one PI succeeds and one returns null → partial failure', async () => {
  let call = 0;
  const stub: typeof RefundPiFn = async (piId) => {
    call += 1;
    if (call === 1) {
      assert.equal(piId, PI_FINAL);
      return 're_1_succeeded';
    }
    assert.equal(piId, PI_DEP);
    return null;
  };

  const out = await runAdminRefundCustomerStripeRefunds(
    baseStripeInput({ refundPaymentIntent: stub })
  );

  assert.equal(out.ok, false);
  if (out.ok) throw new Error('expected failure branch');
  assert.equal(out.error, 'stripe_refund_partial_failure');
  assert.equal(call, 2);
});

test('runAdminRefundCustomerStripeRefunds: both PIs return refund ids → ok with two rows', async () => {
  const stub: typeof RefundPiFn = async (piId) =>
    piId === PI_FINAL ? 're_final_ok' : piId === PI_DEP ? 're_dep_ok' : null;

  const out = await runAdminRefundCustomerStripeRefunds(
    baseStripeInput({ refundPaymentIntent: stub })
  );

  assert.equal(out.ok, true);
  if (!out.ok) throw new Error('expected success branch');
  assert.equal(out.expectedRefundAttempts, 2);
  assert.equal(out.refundIds.length, 2);
  assert.deepEqual(
    out.refundIds.map((r) => r.refundId),
    ['re_final_ok', 're_dep_ok']
  );
});

test('runAdminRefundCustomerStripeRefunds: both return null → stripe_refund_failed', async () => {
  const stub: typeof RefundPiFn = async () => null;
  const out = await runAdminRefundCustomerStripeRefunds(
    baseStripeInput({ refundPaymentIntent: stub })
  );
  assert.equal(out.ok, false);
  if (out.ok) throw new Error('expected failure');
  assert.equal(out.error, 'stripe_refund_failed');
});

test('runAdminRefundCustomer: partial multi-PI batch flags admin review and does not mark fully refunded', async () => {
  const bookingUpdates: unknown[] = [];
  const bookingRow = {
    id: BOOKING_ID,
    payout_released: false,
    final_payment_intent_id: PI_FINAL,
    stripe_payment_intent_remaining_id: null,
    payment_intent_id: null,
    stripe_payment_intent_deposit_id: PI_DEP,
    deposit_payment_intent_id: null,
    payment_lifecycle_status: 'payout_ready',
    refund_status: 'none',
    deposit_amount_cents: 2000,
    amount_deposit: null,
    final_amount_cents: 8000,
    remaining_amount_cents: null,
    subtotal_cents: 10000,
    total_amount_cents: 10200,
    amount_total: null,
    amount_platform_fee: 200,
    pricing_version: 'v1',
    stripe_transfer_id: null,
    payout_transfer_id: null,
  };

  const admin = mockAdminForRunAdminRefund(bookingRow, bookingUpdates);

  const stderrLines: string[] = [];
  const origErr = console.error;
  console.error = (...args: unknown[]) => {
    stderrLines.push(
      args
        .map((a) => (typeof a === 'string' ? a : JSON.stringify(a)))
        .join(' ')
    );
    origErr(...(args as Parameters<typeof console.error>));
  };
  try {
    let n = 0;
    const stub: typeof RefundPiFn = async (piId) => {
      n += 1;
      if (n === 1) {
        assert.equal(piId, PI_FINAL);
        return 're_ok_first_leg';
      }
      return null;
    };

    const result = await runAdminRefundCustomer(
      admin,
      {
        bookingId: BOOKING_ID,
        actorUserId: 'admin_test_user',
        refundReason: 'test',
        internalNote: null,
      },
      { refundPaymentIntent: stub }
    );

    assert.deepEqual(result, { ok: false, error: 'stripe_refund_partial_failure' });
    assert.equal(bookingUpdates.length, 1);
    const patch = bookingUpdates[0] as Record<string, unknown>;
    assert.equal(patch.refund_status, 'partially_failed');
    assert.equal(patch.requires_admin_review, true);
    assert.equal(patch.payout_blocked, true);
    assert.equal(patch.payment_lifecycle_status, 'partially_refunded');
    assert.ok(
      stderrLines.some((line) => line.includes('[runAdminRefundCustomer] refundPaymentIntent returned null')),
      'expected per-PI null log'
    );
    assert.ok(
      stderrLines.some((line) => line.includes('partial batch')),
      'expected batch incomplete log'
    );
  } finally {
    console.error = origErr;
  }
});
