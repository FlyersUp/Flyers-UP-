/**
 * Contract: invalid refund metadata must throw in strict (dev/CI/test) and return
 * `{ ok: false }` in production so `refundPaymentIntent*` returns `null` without Stripe calls.
 *
 * Run: npx tsx --test lib/stripe/__tests__/validate-refund-metadata-env.test.ts
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { validateRefundCreateMetadata } from '@/lib/stripe/server';

/** `@types/node` marks `NODE_ENV` read-only; tests need to flip modes. */
const env = process.env as Record<string, string | undefined>;

function saveRefundEnv() {
  return {
    NODE_ENV: env.NODE_ENV,
    CI: env.CI,
    VITEST: env.VITEST,
    ALLOW_EMPTY_STRIPE_REFUND_METADATA: env.ALLOW_EMPTY_STRIPE_REFUND_METADATA,
  };
}

function restoreRefundEnv(saved: ReturnType<typeof saveRefundEnv>) {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete env[k];
    else env[k] = v;
  }
}

test('strict (default test env): empty metadata throws', () => {
  const saved = saveRefundEnv();
  try {
    env.NODE_ENV = 'test';
    delete env.CI;
    delete env.VITEST;
    delete env.ALLOW_EMPTY_STRIPE_REFUND_METADATA;
    assert.throws(() => validateRefundCreateMetadata({}, 'refundPaymentIntent'), /empty/);
  } finally {
    restoreRefundEnv(saved);
  }
});

test('production mode: empty metadata returns ok false (caller gets null refund)', () => {
  const saved = saveRefundEnv();
  try {
    env.NODE_ENV = 'production';
    delete env.CI;
    delete env.VITEST;
    delete env.ALLOW_EMPTY_STRIPE_REFUND_METADATA;
    const r = validateRefundCreateMetadata({}, 'refundPaymentIntent');
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.reason, 'empty_metadata');
  } finally {
    restoreRefundEnv(saved);
  }
});

test('production mode: missing booking_id returns ok false', () => {
  const saved = saveRefundEnv();
  try {
    env.NODE_ENV = 'production';
    delete env.CI;
    delete env.VITEST;
    delete env.ALLOW_EMPTY_STRIPE_REFUND_METADATA;
    const r = validateRefundCreateMetadata({ foo: 'bar' }, 'refundPaymentIntentPartial');
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.reason, 'missing_booking_id');
  } finally {
    restoreRefundEnv(saved);
  }
});
