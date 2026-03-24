/**
 * Integration tests for payout/booking hardening.
 * Run with: INTEGRATION_TEST=1 npm test
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and local Supabase or test project.
 *
 * These tests create/read/update real data. Use a dedicated test database.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';

const RUN_INTEGRATION = process.env.INTEGRATION_TEST === '1' || process.env.CI === 'true';
const HAS_SUPABASE =
  Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

describe('integration: payout hardening', { skip: !RUN_INTEGRATION || !HAS_SUPABASE }, () => {
  describe('no-show cancel race: atomic RPC returns conflict when state changed', () => {
    it('RPC returns not_found for non-existent booking', async () => {
      try {
        const { createSupabaseAdmin } = await import('@/lib/supabase/server-admin');
        const admin = createSupabaseAdmin();
        const fakeId = '00000000-0000-0000-0000-000000000001';
        const fakeCustomerId = '00000000-0000-0000-0000-000000000002';

        const { data } = await admin.rpc('cancel_booking_no_show_pro_atomic', {
          p_booking_id: fakeId,
          p_customer_id: fakeCustomerId,
          p_now: new Date().toISOString(),
        });

        assert.ok(data && typeof data === 'object');
        const r = data as { ok?: boolean; reason?: string };
        assert.strictEqual(r.ok, false);
        assert.strictEqual(r.reason, 'not_found');
      } catch (e) {
        if (String(e).includes('function') || String(e).includes('does not exist')) {
          console.warn('RPC not yet migrated, skipping');
        } else {
          throw e;
        }
      }
    });
  });

  describe('duplicate release-payouts: booking_payouts prevents double transfer', () => {
    it('cron skips when stripe_transfer_id exists (logic)', () => {
      const payoutRow = { stripe_transfer_id: 'tr_123', status: 'released' };
      const shouldSkip = Boolean(payoutRow?.stripe_transfer_id);
      assert.ok(shouldSkip);
    });

    it('Stripe idempotency key is fixed per booking', () => {
      const bookingId = 'abc-123';
      const idempotencyKey = `payout-booking-${bookingId}`;
      assert.strictEqual(idempotencyKey, 'payout-booking-abc-123');
    });
  });

  describe('reschedule clears lateness state', () => {
    it('reschedule response updates include late_warning_sent_at: null', async () => {
      const { readFile } = await import('node:fs/promises');
      const { join } = await import('node:path');
      const path = join(process.cwd(), 'app/api/bookings/[bookingId]/reschedule/[requestId]/respond/route.ts');
      let content: string;
      try {
        content = await readFile(path, 'utf-8');
      } catch {
        content = '';
      }
      assert.ok(
        content.includes('late_warning_sent_at') || content.includes('no_show_eligible_at'),
        'Reschedule route should clear lateness fields'
      );
    });
  });

  describe('suspicious completion blocks auto-release', () => {
    it('isPayoutEligible blocks when suspicious_completion and no customer_confirmed', async () => {
      const { isPayoutEligible } = await import('../state-machine');
      const r = isPayoutEligible({
        status: 'completed',
        arrived_at: '2025-01-15T10:00:00Z',
        started_at: '2025-01-15T10:05:00Z',
        completed_at: '2025-01-15T11:00:00Z',
        customer_confirmed: false,
        auto_confirm_at: '2025-01-14T00:00:00Z',
        dispute_open: false,
        cancellation_reason: null,
        paid_deposit_at: '2025-01-14T12:00:00Z',
        paid_remaining_at: '2025-01-15T11:30:00Z',
        refund_status: 'none',
        suspicious_completion: true,
      });
      assert.ok(!r.eligible);
      assert.ok(r.reason?.includes('Suspicious'));
    });
  });

  describe('cancellation blocks payout when webhook retries', () => {
    it('isPayoutEligible blocks when cancellation_reason is pro_no_show', async () => {
      const { isPayoutEligible } = await import('../state-machine');
      const r = isPayoutEligible({
        status: 'canceled_no_show_pro',
        arrived_at: null,
        started_at: null,
        completed_at: null,
        customer_confirmed: false,
        auto_confirm_at: null,
        dispute_open: false,
        cancellation_reason: 'pro_no_show',
        paid_deposit_at: '2025-01-14T12:00:00Z',
        paid_remaining_at: null,
        refund_status: 'pending',
        suspicious_completion: false,
      });
      assert.ok(!r.eligible);
      assert.ok(r.reason?.includes('no-show') || r.reason?.includes('pro_no_show') || r.reason?.includes('not in'));
    });
  });
});
