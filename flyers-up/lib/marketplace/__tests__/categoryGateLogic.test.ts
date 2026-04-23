import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveCategoryBoroughGate, showDirectBookingList } from '@/lib/marketplace/categoryGateLogic';

test('resolveCategoryBoroughGate: strong at threshold', () => {
  const r = resolveCategoryBoroughGate({
    activeProCount: 3,
    forceHidden: false,
    forceVisible: false,
    thresholdStrong: 3,
  });
  assert.equal(r.visibleState, 'strong');
  assert.equal(r.isCustomerVisible, true);
});

test('resolveCategoryBoroughGate: weak between 1 and threshold-1', () => {
  const r = resolveCategoryBoroughGate({
    activeProCount: 1,
    forceHidden: false,
    forceVisible: false,
    thresholdStrong: 3,
  });
  assert.equal(r.visibleState, 'weak');
  assert.equal(r.isCustomerVisible, true);
});

test('resolveCategoryBoroughGate: inactive at zero', () => {
  const r = resolveCategoryBoroughGate({
    activeProCount: 0,
    forceHidden: false,
    forceVisible: false,
    thresholdStrong: 3,
  });
  assert.equal(r.visibleState, 'inactive');
  assert.equal(r.isCustomerVisible, false);
});

test('resolveCategoryBoroughGate: force_hidden wins', () => {
  const r = resolveCategoryBoroughGate({
    activeProCount: 10,
    forceHidden: true,
    forceVisible: true,
    thresholdStrong: 3,
  });
  assert.equal(r.visibleState, 'inactive');
  assert.equal(r.isCustomerVisible, false);
});

test('resolveCategoryBoroughGate: force_visible exposes zero-supply as weak', () => {
  const r = resolveCategoryBoroughGate({
    activeProCount: 0,
    forceHidden: false,
    forceVisible: true,
    thresholdStrong: 3,
  });
  assert.equal(r.visibleState, 'weak');
  assert.equal(r.isCustomerVisible, true);
});

test('showDirectBookingList', () => {
  assert.equal(showDirectBookingList('strong'), true);
  assert.equal(showDirectBookingList('weak'), true);
  assert.equal(showDirectBookingList('inactive'), false);
});

test('resolveCategoryBoroughGate: null or negative count is inactive', () => {
  const a = resolveCategoryBoroughGate({
    activeProCount: null,
    forceHidden: false,
    forceVisible: false,
    thresholdStrong: 3,
  });
  assert.equal(a.visibleState, 'inactive');
  const b = resolveCategoryBoroughGate({
    activeProCount: -1,
    forceHidden: false,
    forceVisible: false,
    thresholdStrong: 3,
  });
  assert.equal(b.visibleState, 'inactive');
});
