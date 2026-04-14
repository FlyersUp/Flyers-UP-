import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';
import {
  MIN_BOOKING_SUBTOTAL_CENTS,
  applyMinimumBookingSubtotal,
  minimumBookingAdjustedNotice,
  minimumBookingNoticeFromBookingRow,
  resolveMinBookingSubtotalMode,
} from '@/lib/pricing/config';
import { computeMarketplaceFees } from '@/lib/pricing/fees';
import { getMinimumBookingCents } from '@/lib/pricing/minimums';

describe('applyMinimumBookingSubtotal', () => {
  let prevMode: string | undefined;

  beforeEach(() => {
    prevMode = process.env.MIN_BOOKING_SUBTOTAL_MODE;
  });

  afterEach(() => {
    if (prevMode === undefined) delete process.env.MIN_BOOKING_SUBTOTAL_MODE;
    else process.env.MIN_BOOKING_SUBTOTAL_MODE = prevMode;
  });

  it('subtotal below minimum passes in adjust mode with bump', () => {
    process.env.MIN_BOOKING_SUBTOTAL_MODE = 'adjust';
    const r = applyMinimumBookingSubtotal({ rawSubtotalCents: 1000 });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.originalSubtotalCents, 1000);
    assert.equal(r.enforcedSubtotalCents, MIN_BOOKING_SUBTOTAL_CENTS);
    assert.equal(r.adjusted, true);
  });

  it('subtotal below minimum rejected in strict mode', () => {
    process.env.MIN_BOOKING_SUBTOTAL_MODE = 'strict';
    const r = applyMinimumBookingSubtotal({ rawSubtotalCents: 1000 });
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.ok(r.error.toLowerCase().includes('minimum for this service'));
  });

  it('occupation plumbing uses higher floor in adjust mode', () => {
    process.env.MIN_BOOKING_SUBTOTAL_MODE = 'adjust';
    const r = applyMinimumBookingSubtotal({ rawSubtotalCents: 1000, occupationSlug: 'plumbing' });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.enforcedSubtotalCents, 4000);
    assert.equal(r.adjusted, true);
  });

  it('cleaner uses max of legacy and category-config minimum', () => {
    process.env.MIN_BOOKING_SUBTOTAL_MODE = 'adjust';
    const r = applyMinimumBookingSubtotal({ rawSubtotalCents: 1000, occupationSlug: 'cleaner' });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.enforcedSubtotalCents, 8000);
    assert.equal(r.adjusted, true);
  });

  it('subtotal exactly minimum unchanged', () => {
    process.env.MIN_BOOKING_SUBTOTAL_MODE = 'adjust';
    const r = applyMinimumBookingSubtotal({ rawSubtotalCents: MIN_BOOKING_SUBTOTAL_CENTS });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.adjusted, false);
    assert.equal(r.enforcedSubtotalCents, MIN_BOOKING_SUBTOTAL_CENTS);
  });

  it('subtotal above minimum unchanged', () => {
    process.env.MIN_BOOKING_SUBTOTAL_MODE = 'adjust';
    const r = applyMinimumBookingSubtotal({ rawSubtotalCents: 5000 });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.adjusted, false);
    assert.equal(r.enforcedSubtotalCents, 5000);
  });
});

describe('computeMarketplaceFees after minimum', () => {
  it('receives enforced subtotal >= MIN', () => {
    process.env.MIN_BOOKING_SUBTOTAL_MODE = 'adjust';
    const minApp = applyMinimumBookingSubtotal({ rawSubtotalCents: 500 });
    assert.equal(minApp.ok, true);
    if (!minApp.ok) return;
    const fees = computeMarketplaceFees(minApp.enforcedSubtotalCents, 'v1_2026_04');
    assert.ok(fees.subtotalCents >= MIN_BOOKING_SUBTOTAL_CENTS);
  });
});

describe('booking row notice', () => {
  it('snapshot: original < subtotal shows notice with enforced amount', () => {
    const msg = minimumBookingNoticeFromBookingRow({
      original_subtotal_cents: 1000,
      subtotal_cents: 1500,
    });
    assert.ok(msg);
    assert.equal(msg, minimumBookingAdjustedNotice(1500));
  });

  it('legacy null original shows no notice', () => {
    assert.equal(
      minimumBookingNoticeFromBookingRow({ original_subtotal_cents: null, subtotal_cents: 1500 }),
      null
    );
  });

  it('no adjustment when equal', () => {
    assert.equal(
      minimumBookingNoticeFromBookingRow({
        original_subtotal_cents: 2000,
        subtotal_cents: 2000,
      }),
      null
    );
  });
});

describe('getMinimumBookingCents', () => {
  it('returns occupation-specific floors and aliases', () => {
    assert.equal(getMinimumBookingCents('moving'), 5000);
    assert.equal(getMinimumBookingCents('dog-walker'), 1500);
    assert.equal(getMinimumBookingCents(undefined), MIN_BOOKING_SUBTOTAL_CENTS);
  });
});

describe('resolveMinBookingSubtotalMode', () => {
  it('defaults to adjust', () => {
    const prev = process.env.MIN_BOOKING_SUBTOTAL_MODE;
    delete process.env.MIN_BOOKING_SUBTOTAL_MODE;
    try {
      assert.equal(resolveMinBookingSubtotalMode(), 'adjust');
    } finally {
      if (prev === undefined) delete process.env.MIN_BOOKING_SUBTOTAL_MODE;
      else process.env.MIN_BOOKING_SUBTOTAL_MODE = prev;
    }
  });
});
