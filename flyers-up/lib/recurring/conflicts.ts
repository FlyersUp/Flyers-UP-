import type { SupabaseClient } from '@supabase/supabase-js';
import { BOOKING_SCHEDULE_OVERLAP_STATUSES, OCCURRENCE_BLOCKING_STATUSES } from './constants';

export type ConflictCheckParams = {
  proServiceId: string;
  proUserId: string;
  startUtcIso: string;
  endUtcIso: string;
  excludeOccurrenceId?: string;
  excludeBookingId?: string;
};

/**
 * Returns first conflict reason or null if slot is free.
 */
export async function findScheduleConflict(
  admin: SupabaseClient,
  p: ConflictCheckParams
): Promise<{ code: string; message: string } | null> {
  const { data: blocked } = await admin
    .from('pro_blocked_times')
    .select('id')
    .eq('pro_user_id', p.proUserId)
    .lt('start_at', p.endUtcIso)
    .gt('end_at', p.startUtcIso)
    .limit(1);

  if ((blocked?.length ?? 0) > 0) {
    return { code: 'blocked_time', message: 'Pro has blocked this time' };
  }

  let bq = admin
    .from('bookings')
    .select('id')
    .eq('pro_id', p.proServiceId)
    .in('status', [...BOOKING_SCHEDULE_OVERLAP_STATUSES])
    .not('scheduled_start_at', 'is', null)
    .not('scheduled_end_at', 'is', null)
    .lt('scheduled_start_at', p.endUtcIso)
    .gt('scheduled_end_at', p.startUtcIso)
    .limit(5);

  if (p.excludeBookingId) bq = bq.neq('id', p.excludeBookingId);
  const { data: bookings } = await bq;
  if ((bookings?.length ?? 0) > 0) {
    return { code: 'booking_overlap', message: 'Overlaps an existing booking' };
  }

  let oq = admin
    .from('recurring_occurrences')
    .select('id')
    .eq('pro_user_id', p.proUserId)
    .in('status', [...OCCURRENCE_BLOCKING_STATUSES])
    .lt('scheduled_start_at', p.endUtcIso)
    .gt('scheduled_end_at', p.startUtcIso)
    .limit(5);

  if (p.excludeOccurrenceId) oq = oq.neq('id', p.excludeOccurrenceId);
  const { data: occ } = await oq;
  if ((occ?.length ?? 0) > 0) {
    return { code: 'recurring_occurrence_overlap', message: 'Overlaps another recurring slot' };
  }

  return null;
}
