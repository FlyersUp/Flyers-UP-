/**
 * Tests for second-pass payout hardening.
 * Run: npx tsx --test lib/bookings/__tests__/hardening.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isPayoutEligible } from '../state-machine';
import { isAutoConfirmAllowed } from '../auto-confirm';
import { getMinimumDurationMinutes, getCategoryRule } from '../category-rules';

describe('hardening', () => {
  describe('suspicious_completion blocks auto-confirm path', () => {
    const base = {
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
    };

    it('suspicious_completion + no customer_confirmed blocks payout', () => {
      const r = isPayoutEligible({ ...base, suspicious_completion: true });
      assert.ok(!r.eligible);
      assert.ok(r.reason?.includes('Suspicious'));
    });

    it('suspicious_completion + customer_confirmed allows payout', () => {
      const r = isPayoutEligible({
        ...base,
        suspicious_completion: true,
        customer_confirmed: true,
      });
      assert.ok(r.eligible, r.reason);
    });
  });

  describe('isAutoConfirmAllowed', () => {
    it('blocks when suspicious_completion', () => {
      const r = isAutoConfirmAllowed({
        booking: { suspicious_completion: true },
      });
      assert.ok(!r.allowed);
      assert.ok(r.reason?.includes('Suspicious'));
    });

    it('blocks when dispute_open', () => {
      const r = isAutoConfirmAllowed({
        booking: { dispute_open: true },
      });
      assert.ok(!r.allowed);
    });

    it('blocks when physical category missing 2+ after photos', () => {
      const r = isAutoConfirmAllowed({
        booking: { category_slug: 'cleaning', arrived_at: '2025-01-15T10:00:00Z' },
        jobCompletion: { after_photo_urls: ['one'] },
      });
      assert.ok(!r.allowed);
      assert.ok(r.reason?.includes('photo'));
    });

    it('allows when physical category has 2+ valid photos', () => {
      const r = isAutoConfirmAllowed({
        booking: {
          category_slug: 'cleaning',
          arrived_at: '2025-01-15T10:00:00Z',
          arrival_verified: true,
        },
        proReliability: { reliability_score: 80 },
        jobCompletion: { after_photo_urls: ['https://example.com/1.jpg', 'https://example.com/2.jpg'] },
      });
      assert.ok(r.allowed, r.reason);
    });

    it('blocks when pro reliability below threshold', () => {
      const r = isAutoConfirmAllowed({
        booking: { category_slug: 'barber', arrived_at: '2025-01-15T10:00:00Z' },
        proReliability: { reliability_score: 30 },
        jobCompletion: { after_photo_urls: [] },
      });
      assert.ok(!r.allowed);
      assert.ok(r.reason?.includes('reliability'));
    });
  });

  describe('category rules', () => {
    it('cleaning has 60 min minimum', () => {
      assert.strictEqual(getMinimumDurationMinutes('cleaning'), 60);
    });

    it('physical categories require before/after photos', () => {
      const rule = getCategoryRule('cleaning');
      assert.strictEqual(rule.requiresBeforeAfterPhotos, true);
    });

    it('virtual categories have 15 min minimum', () => {
      assert.strictEqual(getMinimumDurationMinutes('tutor'), 15);
    });

    it('default has 30 min minimum', () => {
      assert.strictEqual(getMinimumDurationMinutes(null), 30);
    });
  });

  describe('missing evidence blocks payout for physical categories', () => {
    it('isAutoConfirmAllowed blocks physical without 2+ after photos', () => {
      const r = isAutoConfirmAllowed({
        booking: { category_slug: 'cleaning', arrived_at: '2025-01-15T10:00:00Z', arrival_verified: true },
        proReliability: { reliability_score: 85 },
        jobCompletion: { after_photo_urls: [] },
      });
      assert.ok(!r.allowed);
      assert.ok(r.reason?.includes('photo'));
    });

    it('isAutoConfirmAllowed allows virtual without photos', () => {
      const r = isAutoConfirmAllowed({
        booking: { category_slug: 'tutor', arrived_at: null },
        proReliability: { reliability_score: 85 },
        jobCompletion: { after_photo_urls: [] },
      });
      assert.ok(r.allowed, r.reason);
    });
  });
});
