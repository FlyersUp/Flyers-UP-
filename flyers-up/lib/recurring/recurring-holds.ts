import type { SupabaseClient } from '@supabase/supabase-js';
import { OCCURRENCE_BLOCKING_STATUSES } from '@/lib/recurring/constants';
import { bookingStatusBlocksCustomerSlots } from '@/lib/availability/booking-occupancy';

export type RecurringHoldUtc = {
  scheduled_start_at: string;
  scheduled_end_at: string;
};

/**
 * Approved recurring series occurrences that should block one-off slot selection for this pro.
 * When an occurrence already has a booking row, we skip the hold if that booking is counted in
 * the normal booking occupancy (firm statuses); otherwise the hold still applies (e.g. requested).
 */
export async function loadRecurringHoldsForAvailability(
  admin: SupabaseClient,
  proUserId: string,
  rangeStartUtcIso: string,
  rangeEndUtcIso: string
): Promise<RecurringHoldUtc[]> {
  const statuses = [...OCCURRENCE_BLOCKING_STATUSES];
  const { data: rows, error } = await admin
    .from('recurring_occurrences')
    .select(
      `
      id,
      scheduled_start_at,
      scheduled_end_at,
      booking_id,
      recurring_series!inner ( status )
    `
    )
    .eq('pro_user_id', proUserId)
    .eq('recurring_series.status', 'approved')
    .in('status', statuses)
    .lt('scheduled_start_at', rangeEndUtcIso)
    .gt('scheduled_end_at', rangeStartUtcIso);

  if (error || !rows?.length) return [];

  const withBookingIds = rows
    .map((r) => (r as { booking_id?: string | null }).booking_id)
    .filter((id): id is string => Boolean(id));

  let blockingByBookingId = new Map<string, boolean>();
  if (withBookingIds.length > 0) {
    const { data: bookings } = await admin
      .from('bookings')
      .select('id, status')
      .in('id', withBookingIds);
    blockingByBookingId = new Map(
      (bookings ?? []).map((b) => [String((b as { id: string }).id), bookingStatusBlocksCustomerSlots((b as { status: string }).status)])
    );
  }

  const out: RecurringHoldUtc[] = [];
  for (const r of rows) {
    const row = r as {
      scheduled_start_at: string;
      scheduled_end_at: string;
      booking_id?: string | null;
    };
    const bid = row.booking_id;
    if (bid && blockingByBookingId.get(bid) === true) continue;
    out.push({
      scheduled_start_at: row.scheduled_start_at,
      scheduled_end_at: row.scheduled_end_at,
    });
  }
  return out;
}

/** Widen UTC range so timezone edge cases on service_date still load overlapping holds. */
export async function loadRecurringHoldRangesForProAroundServiceDate(
  admin: SupabaseClient,
  proUserId: string,
  serviceDate: string
): Promise<{ startAt: Date; endAt: Date }[]> {
  const mid = new Date(`${serviceDate}T12:00:00.000Z`).getTime();
  const from = new Date(mid - 36 * 60 * 60 * 1000).toISOString();
  const to = new Date(mid + 36 * 60 * 60 * 1000).toISOString();
  const holds = await loadRecurringHoldsForAvailability(admin, proUserId, from, to);
  return holds.map((h) => ({
    startAt: new Date(h.scheduled_start_at),
    endAt: new Date(h.scheduled_end_at),
  }));
}
