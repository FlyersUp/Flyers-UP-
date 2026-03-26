/**
 * Successful payment signals from booking_events (preferred over heuristics for PI alignment).
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type BookingPaymentLedger = {
  latestDepositPaidPaymentIntentId: string | null;
  latestRemainingPaidPaymentIntentId: string | null;
  latestDepositPaidAt: string | null;
  latestRemainingPaidAt: string | null;
};

function piFromEventData(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const id = (data as { payment_intent_id?: string }).payment_intent_id;
  return typeof id === 'string' && id.trim() ? id.trim() : null;
}

/**
 * Last DEPOSIT_PAID / REMAINING_PAID rows (by created_at) define which PIs were recorded as successful.
 */
export async function loadBookingPaymentLedger(
  admin: SupabaseClient,
  bookingId: string
): Promise<BookingPaymentLedger> {
  const { data, error } = await admin
    .from('booking_events')
    .select('type, data, created_at')
    .eq('booking_id', bookingId)
    .in('type', ['DEPOSIT_PAID', 'REMAINING_PAID'])
    .order('created_at', { ascending: true });

  if (error || !data?.length) {
    return {
      latestDepositPaidPaymentIntentId: null,
      latestRemainingPaidPaymentIntentId: null,
      latestDepositPaidAt: null,
      latestRemainingPaidAt: null,
    };
  }

  let depPi: string | null = null;
  let depAt: string | null = null;
  let remPi: string | null = null;
  let remAt: string | null = null;

  for (const row of data) {
    const t = String((row as { type?: string }).type);
    const created = (row as { created_at?: string }).created_at ?? null;
    const pi = piFromEventData((row as { data?: unknown }).data);
    if (t === 'DEPOSIT_PAID' && pi) {
      depPi = pi;
      depAt = created;
    }
    if (t === 'REMAINING_PAID' && pi) {
      remPi = pi;
      remAt = created;
    }
  }

  return {
    latestDepositPaidPaymentIntentId: depPi,
    latestRemainingPaidPaymentIntentId: remPi,
    latestDepositPaidAt: depAt,
    latestRemainingPaidAt: remAt,
  };
}
