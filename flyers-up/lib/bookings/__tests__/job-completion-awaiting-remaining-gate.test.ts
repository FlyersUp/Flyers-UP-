/**
 * Run: npx tsx --test lib/bookings/__tests__/job-completion-awaiting-remaining-gate.test.ts
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hasJobCompletionRowForAwaitingRemaining } from '@/lib/bookings/job-completion-awaiting-remaining-gate';

describe('hasJobCompletionRowForAwaitingRemaining', () => {
  it('false when null', () => assert.equal(hasJobCompletionRowForAwaitingRemaining(null), false));
  it('true when row object present', () =>
    assert.equal(hasJobCompletionRowForAwaitingRemaining({ id: 'jc-1' }), true));
});
