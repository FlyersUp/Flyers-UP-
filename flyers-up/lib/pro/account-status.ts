/**
 * Pro / profile account lifecycle for marketplace and operations.
 * Canonical values: active | deactivated | deleted (migration 106).
 */

import {
  isProfileInactiveForMarketplace,
  type ProfileAccountLifecycleStatus,
} from '@/lib/account/lifecycle';

export const ACCOUNT_STATUSES: readonly ProfileAccountLifecycleStatus[] = [
  'active',
  'deactivated',
  'deleted',
] as const;
export type ProfileAccountStatus = ProfileAccountLifecycleStatus;

export function parseProfileAccountStatus(raw: string | null | undefined): ProfileAccountStatus {
  if (raw === 'active' || raw === 'deactivated' || raw === 'deleted') return raw;
  return 'active';
}

/** True when the user must not appear in marketplace or accept bookings (deactivated or deleted). */
export function isProfileAccountClosed(status: string | null | undefined): boolean {
  return isProfileInactiveForMarketplace(status);
}

