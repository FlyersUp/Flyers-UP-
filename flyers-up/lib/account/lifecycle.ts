/**
 * Canonical account lifecycle for profiles.account_status (migration 106).
 * Values: active | deactivated | deleted
 */

export type ProfileAccountLifecycleStatus = 'active' | 'deactivated' | 'deleted';

export const DEACTIVATION_GRACE_DAYS = 30;

export function isProfileActiveForOperations(status: string | null | undefined): boolean {
  return status === 'active' || status == null || status === '';
}

export function isProfileDeactivated(status: string | null | undefined): boolean {
  return status === 'deactivated';
}

export function isProfileDeleted(status: string | null | undefined): boolean {
  return status === 'deleted';
}

/** Hidden from marketplace / cannot be booked */
export function isProfileInactiveForMarketplace(status: string | null | undefined): boolean {
  return isProfileDeactivated(status) || isProfileDeleted(status);
}

export function scheduledDeletionIsInFuture(scheduledDeletionAt: string | null | undefined): boolean {
  if (!scheduledDeletionAt) return false;
  return new Date(scheduledDeletionAt).getTime() > Date.now();
}
