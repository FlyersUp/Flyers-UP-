/**
 * Run: npx tsx --test lib/bookings/__tests__/admin-refund-route-handlers.test.ts
 *
 * Ensures admin full/partial refund routes emit the same batch instrumentation as refund_customer
 * (via shared emitters), including fail-closed partial batch handling.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';

import { runAdminFullRefundRouteFlow, runAdminPartialRefundRouteFlow } from '@/lib/bookings/admin-refund-route-handlers';

test('admin full_refund route success records batch + leg events and updates booking', async () => {
  const paymentEvents: unknown[] = [];
  const remediationEvents: unknown[] = [];
  const bookingRow = {
    final_payment_intent_id: 'pi_f',
    stripe_payment_intent_remaining_id: null,
    stripe_payment_intent_deposit_id: 'pi_d',
    deposit_payment_intent_id: null,
    payment_intent_id: null,
    payout_released: false,
    deposit_amount_cents: 1000,
    amount_deposit: 1000,
    final_amount_cents: 9000,
    remaining_amount_cents: 9000,
    subtotal_cents: 10000,
    total_amount_cents: 10200,
    amount_total: 10200,
    amount_platform_fee: 200,
    pricing_version: 'v1',
    stripe_transfer_id: null,
    payout_transfer_id: null,
  };

  const admin = {
    from(table: string) {
      if (table === 'bookings') {
        return {
          select() {
            return {
              eq() {
                return {
                  async maybeSingle() {
                    return { data: bookingRow, error: null };
                  },
                };
              },
            };
          },
          update() {
            return {
              eq() {
                return Promise.resolve({ error: null });
              },
            };
          },
        };
      }
      if (table === 'booking_payment_events') {
        const dedupe = {
          eq() {
            return dedupe;
          },
          filter() {
            return dedupe;
          },
          async maybeSingle() {
            return { data: null, error: null };
          },
        };
        return {
          select() {
            return dedupe;
          },
          insert(row: unknown) {
            paymentEvents.push(row);
            return Promise.resolve({ error: null });
          },
        };
      }
      if (table === 'booking_refund_remediation_events') {
        return {
          insert(row: unknown) {
            remediationEvents.push(row);
            return Promise.resolve({ error: null });
          },
        };
      }
      if (table === 'booking_refund_events') {
        return {
          insert() {
            return {
              select() {
                return {
                  async maybeSingle() {
                    return { data: { id: 'r1' }, error: null };
                  },
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
      throw new Error(`unexpected ${table}`);
    },
  } as unknown as SupabaseClient;

  let n = 0;
  const stubRefund = async () => {
    n += 1;
    return `re_${n}`;
  };

  const out = await runAdminFullRefundRouteFlow(admin, {
    bookingId: 'b-full',
    actorUserId: 'a1',
    refundPaymentIntent: stubRefund as never,
  });
  assert.equal(out.ok, true);
  const batchStarted = paymentEvents.filter(
    (e) => (e as { event_type?: string }).event_type === 'refund_batch_started'
  );
  assert.ok(batchStarted.length >= 1);
  const legOk = paymentEvents.filter(
    (e) => (e as { event_type?: string }).event_type === 'refund_leg_succeeded'
  );
  assert.equal(legOk.length, 2);
  assert.ok(remediationEvents.some((e) => (e as { event_type?: string }).event_type === 'refund_batch_started'));
});

test('admin partial_refund route failure logs leg failed + batch failure', async () => {
  const paymentEvents: unknown[] = [];
  const bookingRow = {
    final_payment_intent_id: 'pi_f',
    stripe_payment_intent_remaining_id: null,
    payment_intent_id: null,
    stripe_payment_intent_deposit_id: null,
    deposit_payment_intent_id: null,
    amount_refunded_cents: 0,
    refunded_total_cents: 0,
    payout_released: false,
    subtotal_cents: 10000,
    total_amount_cents: 10200,
    amount_total: 10200,
    amount_platform_fee: 200,
    deposit_amount_cents: 0,
    amount_deposit: 0,
    final_amount_cents: 10000,
    remaining_amount_cents: 10000,
    pricing_version: 'v1',
    stripe_transfer_id: null,
    payout_transfer_id: null,
  };

  const admin = {
    from(table: string) {
      if (table === 'bookings') {
        return {
          select() {
            return {
              eq() {
                return {
                  async maybeSingle() {
                    return { data: bookingRow, error: null };
                  },
                };
              },
            };
          },
          update() {
            return {
              eq() {
                return Promise.resolve({ error: null });
              },
            };
          },
        };
      }
      if (table === 'booking_payment_events') {
        const dedupe = {
          eq() {
            return dedupe;
          },
          filter() {
            return dedupe;
          },
          async maybeSingle() {
            return { data: null, error: null };
          },
        };
        return {
          select() {
            return dedupe;
          },
          insert(row: unknown) {
            paymentEvents.push(row);
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
      if (table === 'booking_payment_summary') {
        return {
          upsert() {
            return Promise.resolve({ error: null });
          },
        };
      }
      throw new Error(`unexpected ${table}`);
    },
  } as unknown as SupabaseClient;

  const out = await runAdminPartialRefundRouteFlow(admin, {
    bookingId: 'b-partial',
    actorUserId: 'a1',
    partialRefundCents: 500,
    refundPaymentIntentPartial: async () => null,
  });
  assert.equal(out.ok, false);
  assert.ok(
    paymentEvents.some((e) => (e as { event_type?: string }).event_type === 'refund_leg_failed')
  );
  assert.ok(
    paymentEvents.some((e) => (e as { event_type?: string }).event_type === 'refund_batch_partial_failure')
  );
});
