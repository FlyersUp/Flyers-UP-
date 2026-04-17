/**
 * When a job is complete but the customer never pays the remainder, pros are blocked even though the
 * system is “correct”. This is a lightweight nudge layer: notify after a fixed delay; it does not
 * decide payout timing (that stays in lifecycle + {@link attemptFinalCharge}).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createNotificationEvent } from '@/lib/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';

export const STALE_FINAL_PAYMENT_REMINDER_HOURS = 24;

function staleAnchorMs(row: {
  completed_at?: string | null | undefined;
  customer_review_deadline_at?: string | null | undefined;
}): number | null {
  const c = row.completed_at ? new Date(String(row.completed_at)).getTime() : NaN;
  if (Number.isFinite(c)) return c;
  const r = row.customer_review_deadline_at
    ? new Date(String(row.customer_review_deadline_at)).getTime()
    : NaN;
  return Number.isFinite(r) ? r : null;
}

/**
 * Sends {@link NOTIFICATION_TYPES.PAYMENT_BALANCE_DUE} to the customer when final payment is still
 * outstanding long after completion. Deduped per booking so cron can run frequently without spam.
 */
export async function runStaleFinalPaymentCustomerReminders(
  admin: SupabaseClient
): Promise<{ notified: number; scanned: number }> {
  const horizonMs = STALE_FINAL_PAYMENT_REMINDER_HOURS * 60 * 60 * 1000;
  const cutoff = Date.now() - horizonMs;

  const { data, error } = await admin
    .from('bookings')
    .select('id, customer_id, completed_at, customer_review_deadline_at, amount_remaining')
    .eq('payment_lifecycle_status', 'final_pending')
    .eq('service_status', 'completed')
    .eq('dispute_status', 'none')
    .or('admin_hold.is.null,admin_hold.eq.false')
    .eq('payment_status', 'PAID')
    .not('final_payment_status', 'ilike', 'paid')
    .not('final_payment_status', 'ilike', 'cancelled')
    .not('customer_id', 'is', null)
    .limit(250);

  if (error) {
    console.error('[stale-final-payment-reminder] query failed', error);
    throw new Error('Stale final reminder query failed');
  }

  let notified = 0;
  for (const row of data ?? []) {
    const anchor = staleAnchorMs(row);
    if (anchor == null || anchor > cutoff) continue;
    const rem = Math.round(Number((row as { amount_remaining?: unknown }).amount_remaining ?? 0) || 0);
    if (rem <= 0) continue;

    const customerId = String((row as { customer_id: string }).customer_id);
    const bookingId = String((row as { id: string }).id);

    const created = await createNotificationEvent({
      userId: customerId,
      type: NOTIFICATION_TYPES.PAYMENT_BALANCE_DUE,
      bookingId,
      basePath: 'customer',
      titleOverride: 'Pay remaining balance',
      bodyOverride:
        'Your booking is complete. Pay the remaining balance so your pro can be paid. If this stays open, we may follow up.',
      dedupeKey: `payment.balance_due:stale_final:${bookingId}`,
      dedupeWindowSeconds: 36 * 3600,
    });
    if (created) notified++;
  }

  return { notified, scanned: data?.length ?? 0 };
}
