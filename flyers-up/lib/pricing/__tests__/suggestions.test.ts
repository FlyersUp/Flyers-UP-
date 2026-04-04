import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getMinimumBookingCents } from '@/lib/pricing/minimums';
import { getSuggestedPriceCents, isFarBelowSuggestedPriceCents } from '@/lib/pricing/suggestions';

describe('getSuggestedPriceCents', () => {
  it('never returns below occupation minimum', () => {
    const plumbingMin = getMinimumBookingCents('plumbing');
    const short = getSuggestedPriceCents({
      occupationSlug: 'plumbing',
      estimatedDurationMinutes: 15,
    });
    assert.ok(short >= plumbingMin);
  });

  it('scales with duration (hourly × hours)', () => {
    const oneHr = getSuggestedPriceCents({ occupationSlug: 'cleaning', estimatedDurationMinutes: 60 });
    const twoHr = getSuggestedPriceCents({ occupationSlug: 'cleaning', estimatedDurationMinutes: 120 });
    assert.equal(twoHr, oneHr * 2);
  });

  it('uses default duration 60 minutes when omitted', () => {
    const a = getSuggestedPriceCents({ occupationSlug: 'cleaning' });
    const b = getSuggestedPriceCents({ occupationSlug: 'cleaning', estimatedDurationMinutes: 60 });
    assert.equal(a, b);
  });

  it('applies urgency multiplier when urgency is set', () => {
    const base = getSuggestedPriceCents({ occupationSlug: 'handyman', estimatedDurationMinutes: 60 });
    const asap = getSuggestedPriceCents({
      occupationSlug: 'handyman',
      estimatedDurationMinutes: 60,
      urgency: 'asap',
    });
    assert.ok(asap > base);
    assert.equal(asap, Math.round(base * 1.15));
  });

  it('applies demand when set', () => {
    const med = getSuggestedPriceCents({ occupationSlug: 'tutoring', estimatedDurationMinutes: 60, demandLevel: 'medium' });
    const high = getSuggestedPriceCents({ occupationSlug: 'tutoring', estimatedDurationMinutes: 60, demandLevel: 'high' });
    assert.ok(high > med);
  });
});

describe('isFarBelowSuggestedPriceCents', () => {
  it('true when listed is under threshold of suggested', () => {
    assert.equal(
      isFarBelowSuggestedPriceCents({ listedPriceCents: 1000, suggestedPriceCents: 5000, threshold: 0.85 }),
      true
    );
  });

  it('false when listed is near suggested', () => {
    assert.equal(
      isFarBelowSuggestedPriceCents({ listedPriceCents: 4500, suggestedPriceCents: 5000, threshold: 0.85 }),
      false
    );
  });
});
