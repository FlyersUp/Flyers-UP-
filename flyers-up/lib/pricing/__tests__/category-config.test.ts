/**
 * Run: npx tsx --test lib/pricing/__tests__/category-config.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getCategoryPricingConfigForOccupationSlug,
  getSuggestedPriceRange,
} from '@/lib/pricing/category-config';

describe('category-config', () => {
  it('resolves config by DB slug and legacy aliases', () => {
    assert.equal(getCategoryPricingConfigForOccupationSlug('cleaner')?.minPriceCents, 8000);
    assert.equal(getCategoryPricingConfigForOccupationSlug('cleaning')?.occupationSlug, 'cleaner');
  });

  it('getSuggestedPriceRange matches slug or display name', () => {
    assert.deepEqual(getSuggestedPriceRange('tutor'), [4000, 12000]);
    assert.deepEqual(getSuggestedPriceRange('Tutor'), [4000, 12000]);
  });
});
