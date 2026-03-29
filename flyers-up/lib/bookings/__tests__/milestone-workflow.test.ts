/**
 * Multi-day milestone workflow helpers.
 * Run: npx tsx --test lib/bookings/__tests__/milestone-workflow.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  allMilestonesReadyForProFinalCompletion,
  canProStartMilestone,
  computeConfirmationDueIso,
  isMilestoneAutoConfirmDue,
  isMilestoneConfirmationSatisfied,
  multiDayScheduleAllowsPayout,
  parseProofPhotos,
} from '../milestone-workflow';

describe('milestone-workflow', () => {
  it('multiDayScheduleAllowsPayout false when no milestones on multi-day', () => {
    assert.equal(multiDayScheduleAllowsPayout([], true), false);
  });

  it('multiDayScheduleAllowsPayout true when single-day', () => {
    assert.equal(multiDayScheduleAllowsPayout([], false), true);
  });

  it('multiDayScheduleAllowsPayout requires confirmed milestones', () => {
    assert.equal(
      multiDayScheduleAllowsPayout(
        [
          { milestone_index: 0, status: 'confirmed', dispute_open: false },
          { milestone_index: 1, status: 'pending', dispute_open: false },
        ],
        true
      ),
      false
    );
    assert.equal(
      multiDayScheduleAllowsPayout(
        [
          { milestone_index: 0, status: 'confirmed', dispute_open: false },
          { milestone_index: 1, status: 'auto_confirmed', dispute_open: false },
        ],
        true
      ),
      true
    );
  });

  it('disputed milestone blocks payout', () => {
    assert.equal(
      multiDayScheduleAllowsPayout(
        [{ milestone_index: 0, status: 'confirmed', dispute_open: true }],
        true
      ),
      false
    );
  });

  it('allMilestonesReadyForProFinalCompletion', () => {
    assert.equal(allMilestonesReadyForProFinalCompletion([]), true);
    assert.equal(
      allMilestonesReadyForProFinalCompletion([
        { milestone_index: 0, status: 'confirmed', dispute_open: false },
      ]),
      true
    );
    assert.equal(
      allMilestonesReadyForProFinalCompletion([
        { milestone_index: 0, status: 'completed_pending_confirmation', dispute_open: false },
      ]),
      false
    );
  });

  it('canProStartMilestone enforces order', () => {
    const sorted = [
      { milestone_index: 0, status: 'pending', dispute_open: false },
      { milestone_index: 1, status: 'pending', dispute_open: false },
    ];
    assert.equal(canProStartMilestone(sorted, 0), true);
    assert.equal(canProStartMilestone(sorted, 1), false);
    assert.equal(
      canProStartMilestone(
        [
          { milestone_index: 0, status: 'confirmed', dispute_open: false },
          { milestone_index: 1, status: 'pending', dispute_open: false },
        ],
        1
      ),
      true
    );
  });

  it('isMilestoneConfirmationSatisfied', () => {
    assert.equal(
      isMilestoneConfirmationSatisfied({
        milestone_index: 0,
        status: 'confirmed',
        dispute_open: false,
      }),
      true
    );
    assert.equal(
      isMilestoneConfirmationSatisfied({
        milestone_index: 0,
        status: 'completed_pending_confirmation',
        dispute_open: false,
      }),
      false
    );
  });

  it('isMilestoneAutoConfirmDue', () => {
    const past = '2020-01-01T00:00:00.000Z';
    const future = '2035-01-01T00:00:00.000Z';
    assert.equal(
      isMilestoneAutoConfirmDue(
        {
          milestone_index: 0,
          status: 'completed_pending_confirmation',
          dispute_open: false,
          confirmation_due_at: past,
        },
        '2025-06-01T00:00:00.000Z'
      ),
      true
    );
    assert.equal(
      isMilestoneAutoConfirmDue(
        {
          milestone_index: 0,
          status: 'completed_pending_confirmation',
          dispute_open: false,
          confirmation_due_at: future,
        },
        '2025-06-01T00:00:00.000Z'
      ),
      false
    );
  });

  it('computeConfirmationDueIso clamps hours', () => {
    const t = Date.parse('2025-01-01T12:00:00.000Z');
    const out = computeConfirmationDueIso(t, 24);
    assert.ok(out > '2025-01-01T12:00:00.000Z');
  });

  it('parseProofPhotos', () => {
    assert.deepEqual(parseProofPhotos(['https://a.com/x.jpg', 1, '']), ['https://a.com/x.jpg']);
  });
});
