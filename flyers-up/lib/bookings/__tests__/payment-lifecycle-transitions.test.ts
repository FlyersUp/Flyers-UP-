import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  auditPaymentLifecycleTransition,
  isDocumentedPaymentLifecycleTransition,
  isForbiddenPaymentLifecycleTransition,
  PAYMENT_LIFECYCLE_DOCUMENTED_TRANSITIONS,
  PAYMENT_LIFECYCLE_FORBIDDEN_TRANSITION_KEYS,
} from '@/lib/bookings/payment-lifecycle-transition-rules';

test('primary marketplace path edges are documented and not forbidden', () => {
  const golden: [string, string][] = [
    ['deposit_pending', 'deposit_paid'],
    ['deposit_paid', 'final_pending'],
    ['final_pending', 'final_processing'],
    ['final_processing', 'final_paid'],
    ['final_processing', 'payout_ready'],
    ['final_paid', 'payout_ready'],
    ['final_paid', 'payout_on_hold'],
    ['payout_ready', 'payout_sent'],
  ];
  for (const [from, to] of golden) {
    assert.equal(isForbiddenPaymentLifecycleTransition(from, to), false, `${from}→${to}`);
    const a = auditPaymentLifecycleTransition(from, to);
    assert.equal(a.ok, true, `${from}→${to}: ${!a.ok && 'reason' in a ? a.reason : ''}`);
  }
});

test('explicitly forbidden jumps (regression guard)', () => {
  const bad: [string, string][] = [
    ['deposit_pending', 'payout_sent'],
    ['deposit_pending', 'payout_ready'],
    ['final_pending', 'payout_sent'],
    ['final_processing', 'payout_sent'],
    ['refunded', 'payout_sent'],
    ['payout_sent', 'final_processing'],
    ['final_paid', 'payout_sent'],
  ];
  for (const [from, to] of bad) {
    assert.equal(isForbiddenPaymentLifecycleTransition(from, to), true, `expected forbidden: ${from}→${to}`);
    const a = auditPaymentLifecycleTransition(from, to, { allowUndocumented: true });
    assert.equal(a.ok, false);
    assert.equal(a.kind, 'forbidden');
  }
});

test('every forbidden key is rejected by isForbiddenPaymentLifecycleTransition', () => {
  for (const key of PAYMENT_LIFECYCLE_FORBIDDEN_TRANSITION_KEYS) {
    const m = /^(.+)→(.+)$/.exec(key);
    assert.ok(m, `malformed forbidden key: ${key}`);
    assert.equal(isForbiddenPaymentLifecycleTransition(m[1], m[2]), true, key);
  }
});

test('every documented transition is not forbidden and passes strict audit', () => {
  for (const [from, to] of PAYMENT_LIFECYCLE_DOCUMENTED_TRANSITIONS) {
    assert.equal(
      isForbiddenPaymentLifecycleTransition(from, to),
      false,
      `documented edge must not be forbidden: ${from}→${to}`
    );
    const a = auditPaymentLifecycleTransition(from, to);
    assert.equal(a.ok, true, `${from}→${to}: ${!a.ok && 'reason' in a ? a.reason : ''}`);
  }
});

test('isDocumentedPaymentLifecycleTransition matches DOCUMENTED list', () => {
  for (const [from, to] of PAYMENT_LIFECYCLE_DOCUMENTED_TRANSITIONS) {
    assert.equal(isDocumentedPaymentLifecycleTransition(from, to), true, `${from}→${to}`);
  }
  assert.equal(isDocumentedPaymentLifecycleTransition('deposit_pending', 'final_pending'), false);
});

test('noop same-state is allowed and not forbidden', () => {
  assert.equal(isForbiddenPaymentLifecycleTransition('payout_ready', 'payout_ready'), false);
  assert.equal(auditPaymentLifecycleTransition('payout_ready', 'payout_ready').ok, true);
});

test('unknown transition is undocumented under strict audit', () => {
  const a = auditPaymentLifecycleTransition('refunded', 'deposit_pending');
  assert.equal(a.ok, false);
  assert.equal(a.kind, 'undocumented');
  assert.equal(auditPaymentLifecycleTransition('refunded', 'deposit_pending', { allowUndocumented: true }).ok, true);
});
