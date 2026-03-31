/**
 * Pro / profile account lifecycle for marketplace and operations.
 */

export const ACCOUNT_STATUSES = ['active', 'closure_requested', 'closed'] as const;
export type ProfileAccountStatus = (typeof ACCOUNT_STATUSES)[number];

export function parseProfileAccountStatus(raw: string | null | undefined): ProfileAccountStatus {
  if (raw === 'closed' || raw === 'closure_requested' || raw === 'active') return raw;
  return 'active';
}

export function isProfileAccountClosed(status: string | null | undefined): boolean {
  return status === 'closed';
}
