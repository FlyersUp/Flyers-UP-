import type { SupabaseClient } from '@supabase/supabase-js';
import { multiDayScheduleAllowsPayout, type MilestoneRowLike } from '@/lib/bookings/milestone-workflow';

export type MilestonePayoutGateResult = {
  /** When true, isPayoutEligible must receive is_multi_day: true and multi_day_schedule_ok: scheduleOk */
  enforceMilestoneGate: boolean;
  /** Required true when enforceMilestoneGate is true */
  scheduleOk: boolean;
  /** Skip payout this run (DB error); retry on next cron */
  fetchError: boolean;
};

/**
 * Pure helper: any milestone rows OR is_multi_day flag forces milestone payout gate.
 * Orphan rows with is_multi_day=false still enforce (prevents payout if flag drift).
 */
export function resolveMilestonePayoutGateFromRows(
  rows: MilestoneRowLike[],
  isMultiDayFlag: boolean
): Pick<MilestonePayoutGateResult, 'enforceMilestoneGate' | 'scheduleOk'> {
  if (rows.length === 0) {
    return {
      enforceMilestoneGate: isMultiDayFlag,
      scheduleOk: !isMultiDayFlag,
    };
  }
  return {
    enforceMilestoneGate: true,
    scheduleOk: multiDayScheduleAllowsPayout(rows, true),
  };
}

export async function resolveMilestonePayoutGate(
  admin: SupabaseClient,
  bookingId: string,
  isMultiDayFlag: boolean
): Promise<MilestonePayoutGateResult> {
  const { data, error } = await admin
    .from('booking_milestones')
    .select('milestone_index, status, dispute_open')
    .eq('booking_id', bookingId);

  if (error) {
    console.warn('[milestone-payout-gate] query failed', bookingId, error.message);
    return {
      enforceMilestoneGate: isMultiDayFlag,
      scheduleOk: false,
      fetchError: true,
    };
  }

  const base = resolveMilestonePayoutGateFromRows((data ?? []) as MilestoneRowLike[], isMultiDayFlag);
  return { ...base, fetchError: false };
}

