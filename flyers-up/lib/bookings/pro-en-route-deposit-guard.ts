/**
 * Single source of truth: pro may not mark a booking "en route" until any required
 * customer deposit is recorded. Aligns PATCH /api/jobs/.../status, POST .../on-the-way,
 * and pro UI (JobNextAction).
 */

export const DEPOSIT_REQUIRED_BEFORE_EN_ROUTE_CODE = 'DEPOSIT_REQUIRED_BEFORE_EN_ROUTE' as const;

export type ProEnRouteDepositGateInput = {
  status: string;
  paid_deposit_at?: string | null;
  payment_status?: string | null;
  /** Deposit portion in cents when split pricing applies */
  amount_deposit?: number | null;
};

const DEPOSIT_PIPELINE_STATUSES = new Set([
  'awaiting_deposit_payment',
  'payment_required',
  'accepted_pending_payment',
]);

function depositRecorded(input: ProEnRouteDepositGateInput): boolean {
  if (input.paid_deposit_at) return true;
  const st = String(input.status || '').toLowerCase();
  if (st === 'deposit_paid') return true;
  const ps = String(input.payment_status ?? '').toUpperCase();
  if (ps === 'PAID' || ps === 'DEPOSIT_PAID') return true;
  return false;
}

/**
 * True when this booking is in a state where the customer still owes the deposit
 * before the pro should travel.
 */
export function bookingRequiresCustomerDepositBeforeEnRoute(input: ProEnRouteDepositGateInput): boolean {
  const st = String(input.status || '').toLowerCase();
  if (DEPOSIT_PIPELINE_STATUSES.has(st)) return true;
  if (st === 'accepted') {
    const cents = Number(input.amount_deposit ?? 0);
    if (Number.isFinite(cents) && cents > 0) return true;
  }
  return false;
}

/**
 * True when the pro is allowed to move the booking to pro_en_route (deposit gate passed
 * or no deposit required for this path).
 */
export function canProMarkBookingEnRoute(input: ProEnRouteDepositGateInput): boolean {
  if (!bookingRequiresCustomerDepositBeforeEnRoute(input)) return true;
  return depositRecorded(input);
}

export function proEnRouteDepositBlockedResponse(): {
  error: string;
  code: typeof DEPOSIT_REQUIRED_BEFORE_EN_ROUTE_CODE;
  hint: string;
} {
  return {
    error: 'Customer deposit must be paid before you can head to the job.',
    code: DEPOSIT_REQUIRED_BEFORE_EN_ROUTE_CODE,
    hint: 'Wait until the customer completes deposit payment, then refresh.',
  };
}
