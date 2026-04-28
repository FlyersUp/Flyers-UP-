import type { SupabaseClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe';

type BookingCandidate = {
  id: string;
  pro_id: string;
  status: string | null;
  service_status: string | null;
  paid_deposit_at: string | null;
  paid_remaining_at: string | null;
  final_payment_status: string | null;
  pro_earnings_cents: number | null;
  stripe_transfer_id: string | null;
  payout_status: string | null;
  dispute_open: boolean | null;
  dispute_status: string | null;
  refund_status: string | null;
  payout_blocked: boolean | null;
  fraud_review: boolean | null;
  admin_hold: boolean | null;
  currency: string | null;
  final_charge_id?: string | null;
  service_pros?: { stripe_account_id?: string | null } | { stripe_account_id?: string | null }[] | null;
};

export type PayoutReleaseCronResult = {
  checked: number;
  released: number;
  skipped: number;
  failed: number;
  errors: Array<{ bookingId: string; error: string }>;
  // Backward-compatible keys for older dashboards/routes
  total: number;
  flagged: number;
  skipped_immediate_grace: number;
  skipped_already_released: number;
  skipped_ineligible: number;
  stuck_payout_count: number;
  stuck_payout_sample: string[];
};

function asBookingCandidate(row: unknown): BookingCandidate {
  return row as BookingCandidate;
}

function getConnectedAccountId(row: BookingCandidate): string | null {
  const sp = row.service_pros;
  const raw = Array.isArray(sp) ? sp[0]?.stripe_account_id : sp?.stripe_account_id;
  const accountId = String(raw ?? '').trim();
  return accountId.length > 0 ? accountId : null;
}

function hasCompletedStatus(row: BookingCandidate): boolean {
  return row.status === 'completed' || row.service_status === 'completed';
}

function hasFinalPaid(row: BookingCandidate): boolean {
  return Boolean(row.paid_remaining_at) || String(row.final_payment_status ?? '').toUpperCase() === 'PAID';
}

function hasNoDispute(row: BookingCandidate): boolean {
  const disputeStatus = String(row.dispute_status ?? '').toLowerCase();
  return row.dispute_open !== true && !['open', 'pending', 'under_review'].includes(disputeStatus);
}

function hasNoRefundPending(row: BookingCandidate): boolean {
  const refund = String(row.refund_status ?? '').toLowerCase();
  return !['pending', 'refund_pending'].includes(refund);
}

function hasNoHolds(row: BookingCandidate): boolean {
  return row.payout_blocked !== true && row.fraud_review !== true && row.admin_hold !== true;
}

export async function runPayoutReleaseCron(admin: SupabaseClient): Promise<PayoutReleaseCronResult> {
  if (!stripe) {
    throw new Error('STRIPE_SECRET_KEY is not configured.');
  }

  const { data, error } = await admin
    .from('bookings')
    .select(
      'id, pro_id, status, service_status, paid_deposit_at, paid_remaining_at, final_payment_status, pro_earnings_cents, stripe_transfer_id, payout_status, dispute_open, dispute_status, refund_status, payout_blocked, fraud_review, admin_hold, currency, final_charge_id, service_pros!inner(stripe_account_id)'
    )
    .or('status.eq.completed,service_status.eq.completed')
    .not('paid_deposit_at', 'is', null)
    .not('paid_remaining_at', 'is', null)
    .gt('pro_earnings_cents', 0)
    .is('stripe_transfer_id', null)
    .or('payout_status.is.null,payout_status.neq.payout_processing')
    .or('dispute_open.is.false,dispute_open.is.null')
    .or('admin_hold.is.false,admin_hold.is.null')
    .or('fraud_review.is.false,fraud_review.is.null')
    .not('currency', 'is', null);

  if (error) {
    throw new Error(`Failed to fetch payout candidates: ${error.message}`);
  }

  let released = 0;
  let skipped = 0;
  let failed = 0;
  const errors: Array<{ bookingId: string; error: string }> = [];
  const candidates = (data ?? []).map(asBookingCandidate);

  for (const booking of candidates) {
    const bookingId = booking.id;
    const connectedAccountId = getConnectedAccountId(booking);
    const currency = String(booking.currency ?? '').trim().toLowerCase();
    const payoutStatus = String(booking.payout_status ?? '').trim();
    const finalChargeId = String(booking.final_charge_id ?? '').trim();

    // Guard against stale candidate rows in race-heavy systems.
    const eligible =
      hasCompletedStatus(booking) &&
      Boolean(booking.paid_deposit_at) &&
      hasFinalPaid(booking) &&
      Number(booking.pro_earnings_cents ?? 0) > 0 &&
      !String(booking.stripe_transfer_id ?? '').trim() &&
      payoutStatus !== 'payout_processing' &&
      hasNoDispute(booking) &&
      hasNoRefundPending(booking) &&
      hasNoHolds(booking) &&
      connectedAccountId &&
      currency;

    if (!eligible) {
      skipped++;
      continue;
    }

    const { data: locked, error: lockError } = await admin
      .from('bookings')
      .update({
        payout_status: 'payout_processing',
        payout_failure_reason: null,
      })
      .eq('id', bookingId)
      .is('stripe_transfer_id', null)
      .or('payout_status.is.null,payout_status.neq.payout_processing')
      .select('id')
      .maybeSingle();

    if (lockError || !locked) {
      skipped++;
      if (lockError) {
        errors.push({ bookingId, error: `Lock failed: ${lockError.message}` });
      }
      continue;
    }

    try {
      const transfer = await stripe.transfers.create(
        {
          amount: Number(booking.pro_earnings_cents),
          currency,
          destination: connectedAccountId,
          ...(finalChargeId ? { source_transaction: finalChargeId } : {}),
          transfer_group: `booking_${bookingId}`,
          metadata: {
            booking_id: bookingId,
            pro_id: booking.pro_id,
            payout_type: 'booking_release',
          },
        },
        { idempotencyKey: `booking_payout_${bookingId}` }
      );

      const now = new Date().toISOString();
      const { error: updateSuccessError } = await admin
        .from('bookings')
        .update({
          stripe_transfer_id: transfer.id,
          payout_transfer_id: transfer.id,
          payout_status: 'paid',
          payout_released_at: now,
          payout_failure_reason: null,
        })
        .eq('id', bookingId);

      if (updateSuccessError) {
        failed++;
        errors.push({
          bookingId,
          error: `Transfer created (${transfer.id}) but DB update failed: ${updateSuccessError.message}`,
        });
        continue;
      }

      released++;
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : 'Unknown transfer error';
      errors.push({ bookingId, error: message });
      await admin
        .from('bookings')
        .update({
          payout_status: 'payout_failed',
          payout_failure_reason: message.slice(0, 500),
        })
        .eq('id', bookingId);
    }
  }

  return {
    checked: candidates.length,
    released,
    skipped,
    failed,
    errors,
    total: candidates.length,
    flagged: failed,
    skipped_immediate_grace: 0,
    skipped_already_released: 0,
    skipped_ineligible: skipped,
    stuck_payout_count: 0,
    stuck_payout_sample: [],
  };
}
