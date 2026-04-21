/**
 * Run: npx tsx --test lib/bookings/__tests__/payout-evidence-category.test.ts
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolvePayoutEvidenceCategorySlug } from '@/lib/bookings/payout-evidence-category';

describe('resolvePayoutEvidenceCategorySlug', () => {
  it('prefers pricing_category_slug on the booking row', () => {
    assert.equal(
      resolvePayoutEvidenceCategorySlug({
        pricing_category_slug: 'cleaning',
        service_pros: { service_categories: { slug: 'tutor' } },
      }),
      'cleaning'
    );
  });

  it('falls back to embedded service_categories.slug', () => {
    assert.equal(
      resolvePayoutEvidenceCategorySlug({
        pricing_category_slug: null,
        service_pros: { service_categories: { slug: 'landscaping' } },
      }),
      'landscaping'
    );
  });

  it('supports service_categories as a singleton array', () => {
    assert.equal(
      resolvePayoutEvidenceCategorySlug({
        service_pros: { service_categories: [{ slug: 'painting' }] },
      }),
      'painting'
    );
  });
});
