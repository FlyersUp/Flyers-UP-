/**
 * Pure copy for block/unblock menu items (testable without React).
 */
export function blockMenuItemLabel(viewerHasBlockedTarget: boolean): 'Block user' | 'Unblock user' {
  return viewerHasBlockedTarget ? 'Unblock user' : 'Block user';
}

export function blockMenuItemPendingLabel(viewerHasBlockedTarget: boolean): 'Blocking…' | 'Unblocking…' {
  return viewerHasBlockedTarget ? 'Unblocking…' : 'Blocking…';
}
