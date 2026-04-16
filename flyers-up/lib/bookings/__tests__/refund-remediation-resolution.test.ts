/**
 * Run: npx tsx --test lib/bookings/__tests__/refund-remediation-resolution.test.ts
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';

import { recordClawbackRemediationResolution } from '@/lib/bookings/refund-remediation';

test('recordClawbackRemediationResolution writes remediation + legacy clawback events and updates booking', async () => {
  const remediationInserts: unknown[] = [];
  const bookingPatches: unknown[] = [];

  const admin = {
    from(table: string) {
      if (table === 'booking_refund_remediation_events') {
        return {
          insert(rows: unknown) {
            remediationInserts.push(rows);
            return Promise.resolve({ error: null });
          },
        };
      }
      if (table === 'bookings') {
        return {
          update(payload: unknown) {
            bookingPatches.push(payload);
            return {
              eq() {
                return Promise.resolve({ error: null });
              },
            };
          },
        };
      }
      throw new Error(`unexpected ${table}`);
    },
  } as unknown as SupabaseClient;

  const out = await recordClawbackRemediationResolution(admin, {
    bookingId: 'b-remed-test',
    action: 'resolve',
    actorUserId: 'admin-1',
    internalNote: 'ok',
  });
  assert.equal(out.ok, true);
  assert.equal(remediationInserts.length, 1);
  const batch = remediationInserts[0] as Array<{ event_type: string }>;
  assert.equal(batch.length, 2);
  assert.ok(batch.some((r) => r.event_type === 'remediation_resolved'));
  assert.ok(batch.some((r) => r.event_type === 'clawback_resolved'));
  assert.equal(bookingPatches.length, 1);
  const patch = bookingPatches[0] as Record<string, unknown>;
  assert.equal(patch.pro_clawback_remediation_status, 'resolved');
  assert.equal(patch.requires_admin_review, false);
});
