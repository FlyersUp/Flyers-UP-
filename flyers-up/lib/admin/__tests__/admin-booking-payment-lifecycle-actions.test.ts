/**
 * Route-level behavior is exercised through {@link runAdminBookingPaymentLifecycleAction} so auth,
 * HTTP status mapping, and JSON shape stay covered even when service helpers already have unit tests.
 *
 * Run: npx tsx --test lib/admin/__tests__/admin-booking-payment-lifecycle-actions.test.ts
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';

import { runAdminBookingPaymentLifecycleAction } from '@/lib/admin/admin-booking-payment-lifecycle-actions';

test('mark_manual_review_required returns 404 when booking does not exist', async () => {
  const admin = {
    from(table: string) {
      if (table !== 'bookings') throw new Error(`unexpected table ${table}`);
      return {
        select() {
          return {
            eq() {
              return {
                async maybeSingle() {
                  return { data: null, error: null };
                },
              };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;

  const r = await runAdminBookingPaymentLifecycleAction({
    admin,
    bookingId: '00000000-0000-4000-8000-000000000001',
    userId: 'admin-1',
    body: { action: 'mark_manual_review_required' },
    stripeClient: null,
  });
  assert.equal(r.status, 404);
  assert.equal(r.json.ok, false);
});

test('mark_manual_review_required returns accurate payload on success', async () => {
  let updateCalled = false;
  const admin = {
    from(table: string) {
      if (table === 'bookings') {
        return {
          select() {
            return {
              eq() {
                return {
                  async maybeSingle() {
                    return { data: { id: 'b1' }, error: null };
                  },
                };
              },
            };
          },
          update() {
            updateCalled = true;
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

  const r = await runAdminBookingPaymentLifecycleAction({
    admin,
    bookingId: 'b1',
    userId: 'admin-1',
    body: { action: 'mark_manual_review_required', internalNote: 'unit' },
    stripeClient: null,
  });
  assert.equal(r.status, 200);
  assert.equal(r.json.ok, true);
  assert.equal(r.json.requiresAdminReview, true);
  assert.equal(r.json.payoutBlocked, true);
  assert.equal(r.json.payoutHoldReason, 'admin_review_required');
  assert.equal(updateCalled, true);
});

test('retry_refund_customer maps retry_not_needed to 409 and includes retry snapshot', async () => {
  const admin = {
    from(table: string) {
      if (table === 'bookings') {
        return {
          select() {
            return {
              eq() {
                return {
                  async maybeSingle() {
                    return {
                      data: {
                        id: 'b1',
                        payout_released: false,
                        payment_lifecycle_status: 'partially_refunded',
                        refund_status: 'partially_failed',
                        final_payment_intent_id: 'pi_f',
                        stripe_payment_intent_remaining_id: null,
                        stripe_payment_intent_deposit_id: 'pi_d',
                        deposit_payment_intent_id: null,
                        payment_intent_id: null,
                        pro_clawback_remediation_status: 'none',
                      },
                      error: null,
                    };
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
                        return Promise.resolve({
                          data: [
                            { payment_intent_id: 'pi_f', stripe_refund_id: 're_1' },
                            { payment_intent_id: 'pi_d', stripe_refund_id: 're_2' },
                          ],
                          error: null,
                        });
                      },
                    };
                  },
                };
              },
            };
          },
          insert() {
            return {
              select() {
                return {
                  async maybeSingle() {
                    return { data: { id: 'ledger-1' }, error: null };
                  },
                };
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
      throw new Error(`unexpected table ${table}`);
    },
  } as unknown as SupabaseClient;

  const r = await runAdminBookingPaymentLifecycleAction({
    admin,
    bookingId: 'b1',
    userId: 'admin-1',
    body: { action: 'retry_refund_customer' },
    stripeClient: {} as import('stripe').default,
    /** Satisfies stripe guard in {@link runAdminRefundCustomer}; preflight exits before Stripe. */
    testOverrides: { refundPaymentIntent: async () => 're_should_not_run' as never },
  });
  assert.equal(r.status, 409);
  assert.equal(r.json.ok, false);
  assert.equal(r.json.error, 'retry_not_needed');
  assert.ok(r.json.retry && typeof r.json.retry === 'object');
});

test('retry_refund_customer returns 502 on stripe_refund_partial_failure without ok:true', async () => {
  const bookingRow = {
    id: 'b1',
    payout_released: false,
    payment_lifecycle_status: 'partially_refunded',
    refund_status: 'partially_failed',
    final_payment_intent_id: 'pi_final',
    stripe_payment_intent_remaining_id: null,
    stripe_payment_intent_deposit_id: 'pi_dep',
    deposit_payment_intent_id: null,
    payment_intent_id: null,
    deposit_amount_cents: 2000,
    amount_deposit: 2000,
    final_amount_cents: 8000,
    remaining_amount_cents: 8000,
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
      if (table === 'booking_refund_events') {
        return {
          select() {
            return {
              eq() {
                return {
                  order() {
                    return {
                      limit() {
                        return Promise.resolve({ data: [], error: null });
                      },
                    };
                  },
                };
              },
            };
          },
          insert() {
            return {
              select() {
                return {
                  async maybeSingle() {
                    return { data: { id: 'ledger-partial' }, error: null };
                  },
                };
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
      if (table === 'payout_review_queue') {
        return {
          select() {
            return {
              eq() {
                return {
                  in() {
                    return Promise.resolve({ data: [], error: null });
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
      throw new Error(`unexpected table ${table}`);
    },
  } as unknown as SupabaseClient;

  let call = 0;
  const stubRefund = async (pi: string) => {
    call += 1;
    if (pi === 'pi_final') return 're_1';
    return null;
  };

  const r = await runAdminBookingPaymentLifecycleAction({
    admin,
    bookingId: 'b1',
    userId: 'admin-1',
    body: { action: 'retry_refund_customer' },
    stripeClient: {} as import('stripe').default,
    testOverrides: { refundPaymentIntent: stubRefund as never },
  });
  assert.equal(r.status, 502);
  assert.notEqual(r.json.ok, true);
  assert.equal(r.json.error, 'stripe_refund_partial_failure');
  assert.ok(call >= 1);
});
