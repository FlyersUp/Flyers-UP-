/**
 * Service packages validation & snapshot helpers.
 * Run: npx tsx --test lib/service-packages/__tests__/service-packages.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  parseCreateServicePackageInput,
  parseUpdateServicePackageInput,
  normalizeDeliverables,
} from '../validation';
import { buildSelectedPackageSnapshot, formatPackageScopeNotes } from '../snapshot';
import { computeReorderUpdates } from '../reorder';

describe('service-packages validation', () => {
  it('accepts valid create payload', () => {
    const p = parseCreateServicePackageInput({
      title: '  Lawn care  ',
      short_description: ' Weekly ',
      base_price_cents: 15000,
      estimated_duration_minutes: 90,
      deliverables: [' Mow ', 'Edge', '  Bag clippings  '],
      is_active: true,
    });
    assert.strictEqual(p.title, 'Lawn care');
    assert.strictEqual(p.short_description, 'Weekly');
    assert.strictEqual(p.base_price_cents, 15000);
    assert.strictEqual(p.deliverables.length, 3);
  });

  it('rejects non-positive base price', () => {
    assert.throws(() =>
      parseCreateServicePackageInput({
        title: 'X',
        base_price_cents: 0,
        deliverables: ['a'],
      })
    );
  });

  it('rejects empty deliverables after normalize', () => {
    assert.throws(() =>
      parseCreateServicePackageInput({
        title: 'X',
        base_price_cents: 100,
        deliverables: ['   ', ''],
      })
    );
  });

  it('rejects more than 5 deliverables', () => {
    assert.throws(() =>
      parseCreateServicePackageInput({
        title: 'X',
        base_price_cents: 100,
        deliverables: ['1', '2', '3', '4', '5', '6'],
      })
    );
  });

  it('normalizeDeliverables trims and caps', () => {
    const d = normalizeDeliverables([' a ', 'b', '', 'c', 'd', 'e', 'f']);
    assert.strictEqual(d.length, 5);
    assert.strictEqual(d[0], 'a');
  });

  it('update allows partial is_active only', () => {
    const u = parseUpdateServicePackageInput({ is_active: false });
    assert.strictEqual(u.is_active, false);
    assert.strictEqual(u.title, undefined);
  });
});

describe('service-packages snapshot', () => {
  it('buildSelectedPackageSnapshot preserves deliverables', () => {
    const s = buildSelectedPackageSnapshot({
      title: 'T',
      short_description: null,
      base_price_cents: 5000,
      estimated_duration_minutes: 60,
      deliverables: ['One', 'Two'],
    });
    assert.strictEqual(s.title, 'T');
    assert.deepStrictEqual(s.deliverables, ['One', 'Two']);
  });

  it('formatPackageScopeNotes merges customer notes', () => {
    const s = buildSelectedPackageSnapshot({
      title: 'Deep clean',
      short_description: 'Kitchen focus',
      base_price_cents: 20000,
      estimated_duration_minutes: 120,
      deliverables: ['Oven', 'Fridge'],
    });
    const n = formatPackageScopeNotes(s, 'Please use eco products');
    assert.ok(n.includes('Package: Deep clean'));
    assert.ok(n.includes('Kitchen focus'));
    assert.ok(n.includes('Oven'));
    assert.ok(n.includes('Customer notes:'));
    assert.ok(n.includes('eco products'));
  });

  it('formatPackageScopeNotes includes selected add-ons before customer notes', () => {
    const s = buildSelectedPackageSnapshot({
      title: 'Walk',
      short_description: null,
      base_price_cents: 2200,
      estimated_duration_minutes: 60,
      deliverables: ['Dog'],
    });
    const n = formatPackageScopeNotes(s, 'Gate code 123', [
      { title: 'Extra pet', price_cents: 500 },
    ]);
    assert.ok(n.includes('Add-ons:'));
    assert.ok(n.includes('Extra pet'));
    assert.ok(n.includes('+$5.00'));
    assert.ok(n.indexOf("What's included") < n.indexOf('Add-ons:'));
    assert.ok(n.indexOf('Add-ons:') < n.indexOf('Customer notes:'));
  });
});

describe('service-packages reorder', () => {
  it('swaps adjacent sort_order', () => {
    const ordered = [
      { id: 'a', sort_order: 0 },
      { id: 'b', sort_order: 1 },
      { id: 'c', sort_order: 2 },
    ];
    const u = computeReorderUpdates(ordered, 'b', 'up');
    assert.ok(u);
    assert.deepStrictEqual(u, [
      { id: 'b', sort_order: 0 },
      { id: 'a', sort_order: 1 },
    ]);
  });

  it('returns null at boundary', () => {
    const ordered = [{ id: 'a', sort_order: 0 }];
    assert.strictEqual(computeReorderUpdates(ordered, 'a', 'up'), null);
  });
});
