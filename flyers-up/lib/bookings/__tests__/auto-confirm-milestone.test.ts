import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isMilestoneAutoConfirmAllowed } from '@/lib/bookings/auto-confirm';

test('isMilestoneAutoConfirmAllowed blocks dispute', () => {
  const r = isMilestoneAutoConfirmAllowed({
    booking: { dispute_open: true, category_slug: null },
    proReliability: { reliability_score: 100 },
    hasLatenessIncidentOnBooking: false,
    jobCompletion: null,
  });
  assert.equal(r.allowed, false);
});

test('isMilestoneAutoConfirmAllowed allows without job_completions photos', () => {
  const r = isMilestoneAutoConfirmAllowed({
    booking: {
      dispute_open: false,
      cancellation_reason: null,
      suspicious_completion: false,
      arrived_at: '2025-01-01T10:00:00Z',
      started_at: '2025-01-01T10:05:00Z',
      completed_at: null,
      category_slug: 'cleaning',
    },
    proReliability: { reliability_score: 80 },
    hasLatenessIncidentOnBooking: false,
    jobCompletion: null,
  });
  assert.equal(r.allowed, true);
});
