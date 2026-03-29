import type { SupabaseClient } from '@supabase/supabase-js';

export async function insertBookingProgressEvent(
  admin: SupabaseClient,
  row: {
    booking_id: string;
    milestone_id?: string | null;
    actor_user_id?: string | null;
    event_type: string;
    event_payload?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    await admin.from('booking_progress_events').insert({
      booking_id: row.booking_id,
      milestone_id: row.milestone_id ?? null,
      actor_user_id: row.actor_user_id ?? null,
      event_type: row.event_type,
      event_payload: row.event_payload ?? {},
    });
  } catch (e) {
    console.warn('[booking_progress_events] insert failed', e);
  }
}
