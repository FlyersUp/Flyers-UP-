import { describe, it } from 'node:test';
import assert from 'node:assert';
import { resolveUrgency } from '../urgency';

describe('resolveUrgency', () => {
  it('returns scheduled for future day', () => {
    const out = resolveUrgency({
      requestedAt: '2026-03-27T10:00:00Z',
      scheduledStartAt: '2026-03-28T09:00:00Z',
      now: new Date('2026-03-27T10:00:00Z'),
    });
    assert.strictEqual(out, 'scheduled');
  });

  it('returns same_day when later today', () => {
    const out = resolveUrgency({
      requestedAt: '2026-03-27T10:00:00Z',
      scheduledStartAt: '2026-03-27T16:00:00Z',
      now: new Date('2026-03-27T10:00:00Z'),
    });
    assert.strictEqual(out, 'same_day');
  });

  it('returns asap when within 2 hours', () => {
    const out = resolveUrgency({
      requestedAt: '2026-03-27T10:00:00Z',
      scheduledStartAt: '2026-03-27T11:00:00Z',
      now: new Date('2026-03-27T10:00:00Z'),
    });
    assert.strictEqual(out, 'asap');
  });
});
