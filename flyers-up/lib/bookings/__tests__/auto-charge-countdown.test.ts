import test from 'node:test';
import assert from 'node:assert/strict';
import { formatAutoChargeCountdown } from '@/lib/bookings/auto-charge-countdown';

test('formatAutoChargeCountdown: expired shows due now + secondary', () => {
  const r = formatAutoChargeCountdown(1000, 2000);
  assert.equal(r.primary, 'Auto-charge due now');
  assert.equal(r.secondary, 'Awaiting payment processing');
});

test('formatAutoChargeCountdown: hours and minutes when >= 1h', () => {
  const deadline = 10_000 + 19 * 60 * 60_000 + 13 * 60_000;
  const r = formatAutoChargeCountdown(deadline, 10_000);
  assert.equal(r.primary, 'Auto-charging in 19h 13m');
});

test('formatAutoChargeCountdown: whole hours uses hour wording', () => {
  const deadline = 10_000 + 3 * 60 * 60_000;
  const r = formatAutoChargeCountdown(deadline, 10_000);
  assert.equal(r.primary, 'Auto-charging in 3 hours');
});

test('formatAutoChargeCountdown: minutes only under 1h', () => {
  const deadline = 0 + 45 * 60_000;
  const r = formatAutoChargeCountdown(deadline, 0);
  assert.equal(r.primary, 'Auto-charging in 45 min');
});

test('formatAutoChargeCountdown: very soon uses available soon', () => {
  const deadline = 60_000;
  const r = formatAutoChargeCountdown(deadline, 0);
  assert.equal(r.primary, 'Auto-charge available soon');
});

test('formatAutoChargeCountdown: invalid deadline', () => {
  const r = formatAutoChargeCountdown(Number.NaN, 0);
  assert.equal(r.primary, 'Auto-charge available soon');
});
