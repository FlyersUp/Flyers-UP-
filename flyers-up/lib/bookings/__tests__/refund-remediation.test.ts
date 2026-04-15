/**
 * Run: npx tsx --test lib/bookings/__tests__/refund-remediation.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import { recordRefundAfterPayoutRemediation } from '@/lib/bookings/refund-remediation';

const bookingId = '00000000-0000-4000-8000-000000000001';

test('recordRefundAfterPayoutRemediation: skips when payout not released', async () => {
  const admin = {} as SupabaseClient;
  const r = await recordRefundAfterPayoutRemediation(admin, {
    bookingId,
    idempotencyKey: 'k1',
    source: 'cron_auto_refund',
    refundScope: 'full',
    payoutReleased: false,
  });
  assert.equal(r.ok, true);
  assert.equal(r.skipped, true);
});

test('recordRefundAfterPayoutRemediation: idempotent on duplicate session (23505)', async () => {
  let insertCalls = 0;
  const admin = {
    from(table: string) {
      if (table === 'booking_refund_remediation_events') {
        return {
          insert: async () => {
            insertCalls += 1;
            if (insertCalls === 1) {
              return { error: { code: '23505', message: 'duplicate' } };
            }
            return { error: null };
          },
        };
      }
      if (table === 'bookings') {
        return { update: async () => ({ error: null }) };
      }
      if (table === 'payout_review_queue') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null }),
            }),
          }),
          insert: async () => ({ error: null }),
        };
      }
      return { insert: async () => ({ error: null }) };
    },
  } as unknown as SupabaseClient;

  const r = await recordRefundAfterPayoutRemediation(admin, {
    bookingId,
    idempotencyKey: 'idem-dup',
    source: 'webhook_charge_refunded',
    refundScope: 'partial',
    amountCents: 500,
    payoutReleased: true,
    stripeTransferId: 'tr_123',
    actorType: 'system',
  });
  assert.equal(r.ok, true);
  assert.equal(r.skipped, true);
  assert.equal(insertCalls, 1);
});

test('recordRefundAfterPayoutRemediation: full path inserts session + chain + booking update', async () => {
  const inserted: { table: string; row: Record<string, unknown> }[] = [];
  let bookingPatch: Record<string, unknown> | null = null;

  const admin = {
    from(table: string) {
      if (table === 'booking_refund_remediation_events') {
        return {
          insert: async (row: Record<string, unknown>) => {
            inserted.push({ table, row });
            return { error: null };
          },
        };
      }
      if (table === 'bookings') {
        return {
          update: (patch: Record<string, unknown>) => {
            bookingPatch = patch;
            return {
              eq: () => ({ error: null }),
            };
          },
        };
      }
      if (table === 'payout_review_queue') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null }),
            }),
          }),
          insert: async () => ({ error: null }),
        };
      }
      return {};
    },
  } as unknown as SupabaseClient;

  const r = await recordRefundAfterPayoutRemediation(admin, {
    bookingId,
    idempotencyKey: 'full-path',
    source: 'admin_full_refund_route',
    refundScope: 'full',
    stripeRefundIds: ['re_1'],
    payoutReleased: true,
    stripeTransferId: 'tr_abc',
    actorUserId: '00000000-0000-4000-8000-000000000099',
    actorType: 'admin',
  });

  assert.equal(r.ok, true);
  assert.equal(r.skipped, false);
  assert.ok(bookingPatch);
  const patch = bookingPatch as Record<string, unknown>;
  assert.equal(patch.pro_clawback_remediation_status, 'open');
  assert.equal(patch.stripe_outbound_recovery_status, 'pending_review');
  assert.equal(patch.refund_after_payout, true);
  assert.equal(patch.requires_admin_review, true);

  const types = inserted.map((x) => x.row.event_type);
  assert.ok(types.includes('remediation_session'));
  assert.ok(types.includes('refund_succeeded'));
  assert.ok(types.includes('payout_already_sent'));
  assert.ok(types.includes('clawback_required'));
  assert.ok(types.includes('stripe_connect_recovery_pending'));
});

test('recordRefundAfterPayoutRemediation: no transfer id uses not_applicable recovery', async () => {
  let bookingPatch: Record<string, unknown> | null = null;
  const admin = {
    from(table: string) {
      if (table === 'booking_refund_remediation_events') {
        return {
          insert: async () => ({ error: null }),
        };
      }
      if (table === 'bookings') {
        return {
          update: (patch: Record<string, unknown>) => {
            bookingPatch = patch;
            return {
              eq: () => ({ error: null }),
            };
          },
        };
      }
      if (table === 'payout_review_queue') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null }),
            }),
          }),
          insert: async () => ({ error: null }),
        };
      }
      return {};
    },
  } as unknown as SupabaseClient;

  await recordRefundAfterPayoutRemediation(admin, {
    bookingId,
    idempotencyKey: 'no-tr',
    source: 'no_show_cancel',
    refundScope: 'full',
    payoutReleased: true,
    stripeTransferId: null,
    actorType: 'system',
  });

  assert.equal((bookingPatch as Record<string, unknown> | null)?.stripe_outbound_recovery_status, 'not_applicable');
});
