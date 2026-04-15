/**
 * Eligible bookings for automated off-session final charges (24h after completion review window).
 * Primary path: payment_lifecycle_status = final_pending + service_status completed.
 * Legacy path: pro completed via job PATCH without lifecycle sync — deposit_paid + remaining_due_at passed.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

type Admin = SupabaseClient;

function finalCentsFromRow(row: Record<string, unknown>): number {
  return (
    Number(row.final_amount_cents ?? row.remaining_amount_cents ?? row.amount_remaining ?? 0) || 0
  );
}

/** True when cron / {@link attemptFinalCharge} must never treat the row as an auto-final candidate. */
export function isBookingExcludedFromScheduledFinalCharge(row: Record<string, unknown>): boolean {
  return (
    String(row.payment_lifecycle_status ?? '').trim() === 'cancelled_during_review' ||
    String(row.final_payment_status ?? '').toUpperCase() === 'CANCELLED'
  );
}

function isLifecycleBackfillCandidate(lc: string | null | undefined): boolean {
  const s = String(lc ?? '').trim();
  return !s || s === 'deposit_paid' || s === 'unpaid' || s === 'deposit_pending';
}

/**
 * Ensures service_status + payment_lifecycle + customer_review_deadline_at match the scheduler
 * so attemptFinalCharge eligibility aligns with remaining_due_at.
 */
export async function reconcileBookingForFinalAutoCharge(
  admin: Admin,
  bookingId: string
): Promise<boolean> {
  const { data: row, error } = await admin
    .from('bookings')
    .select(
      [
        'id',
        'status',
        'payment_status',
        'payment_lifecycle_status',
        'service_status',
        'remaining_due_at',
        'customer_review_deadline_at',
        'final_amount_cents',
        'remaining_amount_cents',
        'amount_remaining',
        'final_payment_status',
        'dispute_status',
        'admin_hold',
      ].join(', ')
    )
    .eq('id', bookingId)
    .maybeSingle();

  if (error || !row) return false;

  const r = row as unknown as Record<string, unknown>;
  if (isBookingExcludedFromScheduledFinalCharge(r)) return false;
  if (r.admin_hold === true) return false;
  if (String(r.dispute_status ?? 'none') !== 'none') return false;
  if (String(r.payment_status ?? '').toUpperCase() !== 'PAID') return false;
  if (String(r.final_payment_status ?? '').toUpperCase() === 'PAID') return false;

  const finalCents = finalCentsFromRow(r);
  if (finalCents <= 0) return false;

  const lc = String(r.payment_lifecycle_status ?? '');
  const ss = String(r.service_status ?? '');
  const st = String(r.status ?? '');

  const workCompleteStatus = [
    'awaiting_remaining_payment',
    'awaiting_customer_confirmation',
    'completed_pending_payment',
    'awaiting_payment',
  ].includes(st);

  if (!workCompleteStatus) return false;

  const nowMs = Date.now();
  const remainingDue = r.remaining_due_at ? new Date(String(r.remaining_due_at)).getTime() : NaN;
  const reviewDue = r.customer_review_deadline_at
    ? new Date(String(r.customer_review_deadline_at)).getTime()
    : NaN;
  const dueOk =
    (Number.isFinite(remainingDue) && remainingDue <= nowMs) ||
    (Number.isFinite(reviewDue) && reviewDue <= nowMs);

  if (!dueOk) return false;

  const needsLifecycle =
    ss !== 'completed' ||
    lc !== 'final_pending' ||
    (!r.customer_review_deadline_at && r.remaining_due_at);

  if (!needsLifecycle && lc === 'final_pending' && ss === 'completed') {
    return true;
  }

  if (!isLifecycleBackfillCandidate(lc) && lc !== 'final_pending') {
    return false;
  }

  const deadlineIso =
    (Number.isFinite(reviewDue) ? String(r.customer_review_deadline_at) : null) ||
    (Number.isFinite(remainingDue) ? String(r.remaining_due_at) : null) ||
    new Date(nowMs).toISOString();

  const { error: upErr } = await admin
    .from('bookings')
    .update({
      service_status: 'completed',
      payment_lifecycle_status: 'final_pending',
      customer_review_deadline_at: deadlineIso,
    })
    .eq('id', bookingId);

  return !upErr;
}

export async function fetchPrimaryFinalChargeCandidateIds(
  admin: Admin,
  nowIso: string
): Promise<string[]> {
  const nowMs = new Date(nowIso).getTime();
  const { data, error } = await admin
    .from('bookings')
    .select(
      'id, customer_review_deadline_at, remaining_due_at, final_amount_cents, remaining_amount_cents, amount_remaining, final_payment_status'
    )
    .eq('service_status', 'completed')
    .eq('payment_lifecycle_status', 'final_pending')
    .eq('dispute_status', 'none')
    .or('admin_hold.is.null,admin_hold.eq.false')
    .eq('payment_status', 'PAID')
    .not('final_payment_status', 'ilike', 'paid')
    .not('final_payment_status', 'ilike', 'cancelled');

  if (error) {
    console.error('[final-charge-candidates] primary query failed', error);
    return [];
  }

  const out: string[] = [];
  for (const raw of data ?? []) {
    const r = raw as unknown as Record<string, unknown>;
    if (String(r.final_payment_status ?? '').toUpperCase() === 'CANCELLED') continue;
    if (finalCentsFromRow(r) <= 0) continue;
    const cr = r.customer_review_deadline_at
      ? new Date(String(r.customer_review_deadline_at)).getTime()
      : NaN;
    const rem = r.remaining_due_at ? new Date(String(r.remaining_due_at)).getTime() : NaN;
    const deadlinePassed =
      (Number.isFinite(cr) && cr <= nowMs) ||
      (!Number.isFinite(cr) && Number.isFinite(rem) && rem <= nowMs);
    if (!deadlinePassed) continue;
    out.push(String(r.id));
  }
  return out;
}

export async function fetchLegacyFinalChargeCandidateIds(
  admin: Admin,
  nowIso: string
): Promise<string[]> {
  const { data, error } = await admin
    .from('bookings')
    .select(
      'id, status, payment_lifecycle_status, service_status, remaining_due_at, customer_review_deadline_at, final_amount_cents, remaining_amount_cents, amount_remaining, final_payment_status, payment_status, dispute_status, admin_hold'
    )
    .in('status', [
      'awaiting_remaining_payment',
      'awaiting_customer_confirmation',
      'completed_pending_payment',
      'awaiting_payment',
    ])
    .eq('payment_status', 'PAID')
    .lte('remaining_due_at', nowIso)
    .eq('dispute_status', 'none')
    .or('admin_hold.is.null,admin_hold.eq.false')
    .not('final_payment_status', 'ilike', 'paid')
    .not('final_payment_status', 'ilike', 'cancelled')
    .neq('payment_lifecycle_status', 'cancelled_during_review');

  if (error) {
    console.error('[final-charge-candidates] legacy query failed', error);
    return [];
  }

  const out: string[] = [];
  for (const raw of data ?? []) {
    const r = raw as unknown as Record<string, unknown>;
    if (r.admin_hold === true) continue;
    if (isBookingExcludedFromScheduledFinalCharge(r)) continue;
    if (finalCentsFromRow(r) <= 0) continue;
    const lc = String(r.payment_lifecycle_status ?? '');
    const ss = String(r.service_status ?? '');
    if (ss === 'completed' && lc === 'final_pending') continue;
    if (!isLifecycleBackfillCandidate(lc) && lc !== 'final_pending') continue;
    out.push(String(r.id));
  }
  return out;
}

export async function resetStaleFinalProcessingBookings(
  admin: Admin,
  staleBeforeIso: string
): Promise<number> {
  const { data, error } = await admin
    .from('bookings')
    .update({ payment_lifecycle_status: 'final_pending' })
    .eq('payment_lifecycle_status', 'final_processing')
    .lt('final_charge_attempted_at', staleBeforeIso)
    .select('id');

  if (error) {
    console.error('[final-charge-candidates] reset stale final_processing failed', error);
    return 0;
  }
  return (data ?? []).length;
}
