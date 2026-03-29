/**
 * Recurring domain unit tests.
 * Run: npx tsx --test lib/recurring/__tests__/recurring.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { computeMutualPreference, evaluateRecurringEligibility } from '../eligibility';
import { generateOccurrenceWindows } from '../occurrence-generator';
import { slotFitsRecurringWindows } from '../windows';
import { DateTime } from 'luxon';

describe('recurring eligibility', () => {
  it('mutual preference requires favorite + preferred + not blocked', () => {
    assert.equal(
      computeMutualPreference({
        customerFavoritedPro: true,
        proMarkedPreferred: true,
        proBlockedRecurring: false,
      }),
      true
    );
    assert.equal(
      computeMutualPreference({
        customerFavoritedPro: true,
        proMarkedPreferred: false,
        proBlockedRecurring: false,
      }),
      false
    );
  });

  it('blocks recurring when pro blocked', () => {
    const r = evaluateRecurringEligibility({
      signals: { customerFavoritedPro: true, proMarkedPreferred: true, proBlockedRecurring: true },
      proRecurringEnabled: true,
      occupationEnabledForRecurring: true,
      onlyPreferredClientsCanRequest: false,
      allowAutoApprovalForMutualPreference: true,
      requireMutualPreferenceForAutoApproval: true,
      slotFitsRecurringWindows: true,
      hasScheduleConflicts: false,
      atRecurringCustomerCapacity: false,
      customerAlreadyApprovedWithPro: false,
    });
    assert.equal(r.recurringRequestAllowed, false);
    assert.ok(r.reasonsBlocked.includes('pro_blocked_recurring'));
  });

  it('auto approval requires mutual + flag + slot + no conflicts', () => {
    const ok = evaluateRecurringEligibility({
      signals: { customerFavoritedPro: true, proMarkedPreferred: true, proBlockedRecurring: false },
      proRecurringEnabled: true,
      occupationEnabledForRecurring: true,
      onlyPreferredClientsCanRequest: false,
      allowAutoApprovalForMutualPreference: true,
      requireMutualPreferenceForAutoApproval: true,
      slotFitsRecurringWindows: true,
      hasScheduleConflicts: false,
      atRecurringCustomerCapacity: false,
      customerAlreadyApprovedWithPro: false,
    });
    assert.equal(ok.autoApprovalAllowed, true);

    const bad = evaluateRecurringEligibility({
      signals: { customerFavoritedPro: true, proMarkedPreferred: true, proBlockedRecurring: false },
      proRecurringEnabled: true,
      occupationEnabledForRecurring: true,
      onlyPreferredClientsCanRequest: false,
      allowAutoApprovalForMutualPreference: true,
      requireMutualPreferenceForAutoApproval: true,
      slotFitsRecurringWindows: true,
      hasScheduleConflicts: true,
      atRecurringCustomerCapacity: false,
      customerAlreadyApprovedWithPro: false,
    });
    assert.equal(bad.autoApprovalAllowed, false);
  });

  it('capacity blocks new customer but not existing', () => {
    const blocked = evaluateRecurringEligibility({
      signals: { customerFavoritedPro: true, proMarkedPreferred: true, proBlockedRecurring: false },
      proRecurringEnabled: true,
      occupationEnabledForRecurring: true,
      onlyPreferredClientsCanRequest: false,
      allowAutoApprovalForMutualPreference: false,
      requireMutualPreferenceForAutoApproval: true,
      slotFitsRecurringWindows: true,
      hasScheduleConflicts: false,
      atRecurringCustomerCapacity: true,
      customerAlreadyApprovedWithPro: false,
    });
    assert.equal(blocked.recurringRequestAllowed, false);

    const same = evaluateRecurringEligibility({
      signals: { customerFavoritedPro: true, proMarkedPreferred: true, proBlockedRecurring: false },
      proRecurringEnabled: true,
      occupationEnabledForRecurring: true,
      onlyPreferredClientsCanRequest: false,
      allowAutoApprovalForMutualPreference: false,
      requireMutualPreferenceForAutoApproval: true,
      slotFitsRecurringWindows: true,
      hasScheduleConflicts: false,
      atRecurringCustomerCapacity: true,
      customerAlreadyApprovedWithPro: true,
    });
    assert.equal(same.recurringRequestAllowed, true);
  });
});

describe('occurrence generator', () => {
  it('weekly emits slots for selected weekdays', () => {
    const rows = generateOccurrenceWindows({
      timezone: 'America/New_York',
      startDate: '2026-04-06',
      endDate: null,
      preferredStartTime: '10:00:00',
      durationMinutes: 60,
      daysOfWeek: [1],
      frequency: 'weekly',
      intervalCount: 1,
      horizonDays: 14,
      anchorFrom: DateTime.fromISO('2026-04-06', { zone: 'America/New_York' }),
    });
    assert.ok(rows.length >= 1);
    assert.ok(rows[0]!.scheduled_start_at.includes('T'));
  });
});

describe('recurring windows', () => {
  it('flexible series bypasses window enforcement', () => {
    const local = DateTime.fromObject({ year: 2026, month: 4, day: 7, hour: 3, minute: 0 }, { zone: 'America/New_York' });
    const ok = slotFitsRecurringWindows({
      windowsEnabled: true,
      seriesRecurringSlotLocked: true,
      seriesFlexible: true,
      windows: [],
      occupationSlug: 'cleaning',
      localStart: local,
      durationMinutes: 60,
    });
    assert.equal(ok, true);
  });
});
