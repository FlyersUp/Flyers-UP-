/**
 * Webhook idempotency via stripe_events table.
 * Race-safe: insert with unique stripe_event_id; conflict = already processed.
 */

import { createSupabaseAdmin } from '@/lib/supabase/server-admin';

export async function isStripeEventProcessed(stripeEventId: string): Promise<boolean> {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from('stripe_events')
    .select('id')
    .eq('stripe_event_id', stripeEventId)
    .maybeSingle();
  return !!data;
}

/**
 * Mark event as processed. Uses insert; on conflict (unique) treat as success.
 * Returns true if we inserted, false if already existed.
 */
export async function markStripeEventProcessed(
  stripeEventId: string,
  type: string
): Promise<boolean> {
  const admin = createSupabaseAdmin();
  const { error } = await admin.from('stripe_events').insert({
    stripe_event_id: stripeEventId,
    type,
  });
  if (error) {
    if (error.code === '23505') {
      // unique violation = already processed
      return false;
    }
    console.error('[webhook-idempotency] insert failed', error);
    throw error;
  }
  return true;
}
