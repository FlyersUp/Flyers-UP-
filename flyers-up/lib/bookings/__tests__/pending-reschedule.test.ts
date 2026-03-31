import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calendarWallTimesWithPending,
  formatWallDateLong,
  mapRescheduleRowToPending,
  pendingRescheduleLine,
} from '../pending-reschedule';

describe('pending-reschedule helpers', () => {
  it('mapRescheduleRowToPending maps snake_case row', () => {
    const p = mapRescheduleRowToPending({
      id: 'r1',
      proposed_service_date: '2026-04-01',
      proposed_service_time: '14:00',
      proposed_start_at: '2026-04-01T18:00:00.000Z',
      requested_by_role: 'customer',
      message: 'hi',
      expires_at: null,
    });
    assert.ok(p);
    assert.equal(p!.proposedServiceDate, '2026-04-01');
    assert.equal(p!.requestedByRole, 'customer');
  });

  it('calendarWallTimesWithPending prefers proposed wall clock', () => {
    const pending = mapRescheduleRowToPending({
      id: 'r1',
      proposed_service_date: '2026-04-02',
      proposed_service_time: '09:30',
      proposed_start_at: null,
      requested_by_role: 'customer',
      message: null,
      expires_at: null,
    })!;
    const w = calendarWallTimesWithPending('2026-03-31', '10:00', pending);
    assert.deepEqual(w, { serviceDate: '2026-04-02', serviceTime: '09:30' });
    assert.deepEqual(calendarWallTimesWithPending('2026-03-31', '10:00', null), {
      serviceDate: '2026-03-31',
      serviceTime: '10:00',
    });
  });

  it('formatWallDateLong parses YYYY-MM-DD in local calendar', () => {
    const s = formatWallDateLong('2026-03-31');
    assert.ok(s && s.includes('2026'));
  });

  it('pendingRescheduleLine formats date and time', () => {
    const p = mapRescheduleRowToPending({
      id: 'r1',
      proposed_service_date: '2026-04-01',
      proposed_service_time: '15:00',
      proposed_start_at: null,
      requested_by_role: 'pro',
      message: null,
      expires_at: null,
    })!;
    assert.equal(pendingRescheduleLine(p), '2026-04-01 at 15:00');
  });
});
