/**
 * Run: npx tsx --test lib/bookings/__tests__/payment-intent-read-audit.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { join } from 'path';
import { runPaymentIntentReadAudit } from '../payment-intent-read-audit';

describe('payment-intent-read-audit', () => {
  it('repo has no unsafe final/remaining/deposit PI nullish chains in lib/ and app/', () => {
    const root = join(process.cwd());
    const v = runPaymentIntentReadAudit(root);
    if (v.length) {
      // eslint-disable-next-line no-console
      console.error(v);
    }
    assert.deepStrictEqual(
      v,
      [],
      'Use getBookingFinalPaymentIntentIdOrNull / getBookingDepositPaymentIntentIdOrNull (or coalesce* from money-state). See payment-intent-read-audit.ts header for exceptions.'
    );
  });
});
