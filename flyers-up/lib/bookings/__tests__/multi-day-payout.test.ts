/**
 * Milestone payout gate resolution (orphan rows, flag drift).
 * Run: npx tsx --test lib/bookings/__tests__/multi-day-payout.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { resolveMilestonePayoutGateFromRows } from '@/lib/bookings/multi-day-payout';

describe('resolveMilestonePayoutGateFromRows', () => {
  it('single-day empty: no gate', () => {
    const r = resolveMilestonePayoutGateFromRows([], false);
    assert.equal(r.enforceMilestoneGate, false);
    assert.equal(r.scheduleOk, true);
  });

  it('multi-day flag with no rows: block (incomplete setup)', () => {
    const r = resolveMilestonePayoutGateFromRows([], true);
    assert.equal(r.enforceMilestoneGate, true);
    assert.equal(r.scheduleOk, false);
  });

  it('orphan rows when flag false: still enforce gate', () => {
    const r = resolveMilestonePayoutGateFromRows(
      [{ milestone_index: 0, status: 'pending', dispute_open: false }],
      false
    );
    assert.equal(r.enforceMilestoneGate, true);
    assert.equal(r.scheduleOk, false);
  });

  it('orphan rows when flag false but all confirmed: allow', () => {
    const r = resolveMilestonePayoutGateFromRows(
      [{ milestone_index: 0, status: 'confirmed', dispute_open: false }],
      false
    );
    assert.equal(r.enforceMilestoneGate, true);
    assert.equal(r.scheduleOk, true);
  });

  it('milestone dispute blocks even when flag false', () => {
    const r = resolveMilestonePayoutGateFromRows(
      [{ milestone_index: 0, status: 'disputed', dispute_open: true }],
      false
    );
    assert.equal(r.enforceMilestoneGate, true);
    assert.equal(r.scheduleOk, false);
  });
});
