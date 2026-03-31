import type { RelationshipSignals } from './types';

export type EligibilityInput = {
  signals: RelationshipSignals;
  proRecurringEnabled: boolean;
  occupationEnabledForRecurring: boolean;
  onlyPreferredClientsCanRequest: boolean;
  allowAutoApprovalForMutualPreference: boolean;
  requireMutualPreferenceForAutoApproval: boolean;
  slotFitsRecurringWindows: boolean;
  hasScheduleConflicts: boolean;
  atRecurringCustomerCapacity: boolean;
  /** True if this customer already has an approved series with the pro (does not consume extra slot). */
  customerAlreadyApprovedWithPro: boolean;
  /** When requesting recurring with a package that has a per-package cap. */
  atPackageRecurringCustomerCapacity?: boolean;
  /** Customer already has an approved series for this same package (does not consume another package slot). */
  customerAlreadyApprovedForThisPackage?: boolean;
};

export type EligibilityResult = {
  mutualPreference: boolean;
  recurringRequestAllowed: boolean;
  autoApprovalAllowed: boolean;
  reasonsBlocked: string[];
};

export function computeMutualPreference(signals: RelationshipSignals): boolean {
  return signals.customerFavoritedPro && signals.proMarkedPreferred && !signals.proBlockedRecurring;
}

export function evaluateRecurringEligibility(input: EligibilityInput): EligibilityResult {
  const reasonsBlocked: string[] = [];
  const mutualPreference = computeMutualPreference(input.signals);

  if (input.signals.proBlockedRecurring) {
    reasonsBlocked.push('pro_blocked_recurring');
  }
  if (!input.proRecurringEnabled) {
    reasonsBlocked.push('recurring_disabled');
  }
  if (!input.occupationEnabledForRecurring) {
    reasonsBlocked.push('occupation_not_enabled');
  }
  if (input.onlyPreferredClientsCanRequest && !input.signals.proMarkedPreferred) {
    reasonsBlocked.push('preferred_only');
  }
  const capacityBlocks =
    input.atRecurringCustomerCapacity && !input.customerAlreadyApprovedWithPro;
  if (capacityBlocks) {
    reasonsBlocked.push('recurring_customer_capacity_full');
  }

  const packageCapacityBlocks =
    input.atPackageRecurringCustomerCapacity === true && !input.customerAlreadyApprovedForThisPackage;
  if (packageCapacityBlocks) {
    reasonsBlocked.push('package_recurring_capacity_full');
  }

  const recurringRequestAllowed =
    !input.signals.proBlockedRecurring &&
    input.proRecurringEnabled &&
    input.occupationEnabledForRecurring &&
    (!input.onlyPreferredClientsCanRequest || input.signals.proMarkedPreferred) &&
    !capacityBlocks &&
    !packageCapacityBlocks;

  const autoApprovalAllowed =
    recurringRequestAllowed &&
    mutualPreference &&
    input.allowAutoApprovalForMutualPreference &&
    (!input.requireMutualPreferenceForAutoApproval || mutualPreference) &&
    input.slotFitsRecurringWindows &&
    !input.hasScheduleConflicts;

  return {
    mutualPreference,
    recurringRequestAllowed,
    autoApprovalAllowed,
    reasonsBlocked,
  };
}
