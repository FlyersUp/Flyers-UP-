/**
 * Run: npx tsx --test lib/stripe/__tests__/refund-metadata-guard.test.ts
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  REFUND_METADATA_LEGACY_ALLOW_ENV,
  validateRefundCreateMetadata,
} from '@/lib/stripe/server';

function withEnv(
  patch: Record<string, string | undefined>,
  fn: () => void
): void {
  const prev: Record<string, string | undefined> = {};
  for (const k of Object.keys(patch)) {
    prev[k] = process.env[k];
    const v = patch[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    fn();
  } finally {
    for (const k of Object.keys(patch)) {
      const v = prev[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

test('validateRefundCreateMetadata: empty object throws in dev/test (strict)', () => {
  withEnv(
    {
      NODE_ENV: 'test',
      CI: undefined,
      VITEST: undefined,
      [REFUND_METADATA_LEGACY_ALLOW_ENV]: undefined,
    },
    () => {
      assert.throws(() => validateRefundCreateMetadata({}, 'unit'), /empty/);
    }
  );
});

test('validateRefundCreateMetadata: missing booking_id throws in strict', () => {
  withEnv(
    {
      NODE_ENV: 'development',
      CI: undefined,
      VITEST: undefined,
      [REFUND_METADATA_LEGACY_ALLOW_ENV]: undefined,
    },
    () => {
      assert.throws(
        () =>
          validateRefundCreateMetadata(
            {
              payment_phase: 'refund',
              subtotal_cents: '0',
              total_amount_cents: '0',
              platform_fee_cents: '0',
              deposit_amount_cents: '0',
              final_amount_cents: '0',
              pricing_version: 'unknown',
              refunded_amount_cents: '100',
              refund_type: 'before_payout',
            },
            'unit'
          ),
        /booking_id/
      );
    }
  );
});

test('validateRefundCreateMetadata: production without allow returns ok: false for empty', () => {
  withEnv(
    {
      NODE_ENV: 'production',
      CI: undefined,
      VITEST: undefined,
      [REFUND_METADATA_LEGACY_ALLOW_ENV]: undefined,
    },
    () => {
      const r = validateRefundCreateMetadata({}, 'unit');
      assert.equal(r.ok, false);
      if (!r.ok) assert.equal(r.reason, 'empty_metadata');
    }
  );
});

test('validateRefundCreateMetadata: legacy allow env skips throw for empty', () => {
  withEnv(
    {
      NODE_ENV: 'test',
      CI: undefined,
      VITEST: undefined,
      [REFUND_METADATA_LEGACY_ALLOW_ENV]: '1',
    },
    () => {
      const r = validateRefundCreateMetadata({}, 'unit');
      assert.equal(r.ok, true);
    }
  );
});
