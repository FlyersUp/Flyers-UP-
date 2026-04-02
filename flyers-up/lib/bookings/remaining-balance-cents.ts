/**
 * Single source for "how much does the customer still owe?" (integer cents).
 * total_booking_cents − confirmed_successful_payments (deposit when split, only after deposit is recorded paid).
 *
 * Do not trust `amount_remaining` alone: it can be 0/null while `total_amount_cents` and deposit are correct.
 */

export type BookingMoneySnapshot = {
  total_amount_cents?: number | null;
  amount_total?: number | null;
  amount_deposit?: number | null;
  amount_remaining?: number | null;
  price?: number | null;
  payment_status?: string | null;
  final_payment_status?: string | null;
  paid_deposit_at?: string | null;
  paid_remaining_at?: string | null;
  fully_paid_at?: string | null;
  status?: string | null;
};

function safeInt(n: unknown): number {
  const x = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.round(x);
}

/** Legacy `price` / small `amount_total` often stored in dollars. */
function priceToCentsIfDollars(price: unknown): number {
  const raw = safeInt(price);
  if (raw <= 0) return 0;
  if (raw > 0 && raw < 10000) return raw * 100;
  return raw;
}

/**
 * Locked booking total in cents: prefer `total_amount_cents`, then normalize `amount_total` / sum / `price`.
 */
export function resolveTotalBookingCentsFromRow(s: BookingMoneySnapshot): number {
  const tac = safeInt(s.total_amount_cents);
  if (tac > 0) return tac;

  const at = safeInt(s.amount_total);
  if (at > 0) {
    if (at < 10000) return at * 100;
    return at;
  }

  const dep = safeInt(s.amount_deposit);
  const rem = safeInt(s.amount_remaining);
  if (dep > 0 || rem > 0) {
    return dep + rem;
  }

  return priceToCentsIfDollars(s.price);
}

export function isBookingFullyPaidForRemaining(s: BookingMoneySnapshot): boolean {
  const st = String(s.status ?? '').toLowerCase();
  if (st === 'fully_paid' || st === 'paid') return true;
  if (s.fully_paid_at) return true;
  if (s.paid_remaining_at) return true;
  const fs = String(s.final_payment_status ?? '').toUpperCase();
  if (fs === 'PAID') return true;
  return false;
}

function isDepositRecordedPaid(s: BookingMoneySnapshot): boolean {
  if (s.paid_deposit_at) return true;
  const ps = String(s.payment_status ?? '').toUpperCase();
  return ps === 'PAID';
}

/**
 * Amount the customer still owes (cents). When not fully paid: total − deposit (if split and deposit paid), else total.
 */
export function computeCustomerRemainingDueCents(s: BookingMoneySnapshot): number {
  if (isBookingFullyPaidForRemaining(s)) return 0;

  const total = resolveTotalBookingCentsFromRow(s);
  if (total <= 0) return 0;

  const depositCents = safeInt(s.amount_deposit);
  const split = depositCents > 0;

  // Legacy / single-charge bookings: no scheduled deposit split; PAID means full customer total settled.
  if (!split && String(s.payment_status ?? '').toUpperCase() === 'PAID') return 0;

  let paidCents = 0;
  if (split && isDepositRecordedPaid(s)) {
    paidCents = Math.min(depositCents, total);
  }

  return Math.max(0, total - paidCents);
}
