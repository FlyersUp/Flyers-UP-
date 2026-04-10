import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blockMenuItemLabel, blockMenuItemPendingLabel } from '@/lib/messaging/block-relationship-ui';

test('menu shows Block user when viewer has not blocked target', () => {
  assert.equal(blockMenuItemLabel(false), 'Block user');
});

test('menu shows Unblock user when viewer has blocked target', () => {
  assert.equal(blockMenuItemLabel(true), 'Unblock user');
});

test('pending label while blocking', () => {
  assert.equal(blockMenuItemPendingLabel(false), 'Blocking…');
});

test('pending label while unblocking', () => {
  assert.equal(blockMenuItemPendingLabel(true), 'Unblocking…');
});

/**
 * ReportUserBlockUser behavior (integration):
 * - Initial state comes from useYouBlockedOtherUser → blocked_users (blocker_id = viewer, blocked_user_id = target).
 * - Successful block: POST /api/users/block, refetch, router.refresh; menu label becomes Unblock user.
 * - Successful unblock: DELETE /api/users/block, refetch, router.refresh; menu label becomes Block user.
 * - Failed mutation: optimistic override cleared, refetch restores server truth (rollback).
 */
