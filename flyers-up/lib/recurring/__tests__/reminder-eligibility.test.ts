import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OCCURRENCE_REMINDER_ELIGIBLE_STATUSES } from '@/lib/recurring/constants';

test('reminder eligible excludes terminal occurrence states', () => {
  const list = OCCURRENCE_REMINDER_ELIGIBLE_STATUSES as readonly string[];
  assert.equal(list.includes('canceled'), false);
  assert.equal(list.includes('skipped'), false);
  assert.equal(list.includes('completed'), false);
  assert.equal(list.includes('scheduled'), true);
});
