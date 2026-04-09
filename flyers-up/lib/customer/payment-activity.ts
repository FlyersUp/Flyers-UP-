/**
 * Derive customer-facing payment activity from booking rows (best-effort across schema variants).
 */

export type PaymentActivityStatus = 'paid' | 'pending' | 'failed' | 'refunded';

export type PaymentActivityItem = {
  bookingId: string;
  serviceName: string;
  proName: string;
  serviceDate: string;
  amountLabel: string;
  amountCents: number;
  /** Short label for the payment row, e.g. "FINAL PAYMENT" or "DEPOSIT" */
  phase: string;
  status: PaymentActivityStatus;
  statusLabel: string;
};

function centsFromMaybeDollarsOrCents(n: number | null | undefined): number {
  if (n == null || !Number.isFinite(Number(n))) return 0;
  const x = Math.round(Number(n));
  if (x > 0 && x < 5000) return x * 100;
  return x;
}

function formatUsd(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function norm(s: string | null | undefined): string {
  return String(s ?? '')
    .trim()
    .toLowerCase();
}

/** One summary row per booking for activity / history lists. */
export function bookingToPaymentActivityItem(b: {
  id: string;
  service_date: string;
  status: string;
  price: number | null;
  pro_id: string;
  amount_deposit?: number | null;
  final_payment_status?: string | null;
  payment_status?: string | null;
  paid_deposit_at?: string | null;
  fully_paid_at?: string | null;
  refund_type?: string | null;
  refunded_total_cents?: number | null;
  total_amount_cents?: number | null;
  pro: { displayName: string | null; serviceName?: string | null } | null;
}): PaymentActivityItem {
  const serviceName = b.pro?.serviceName ?? 'Service';
  const proName = b.pro?.displayName ?? 'Professional';
  const st = norm(b.status);
  const refundCents = Math.max(0, Math.round(Number(b.refunded_total_cents ?? 0)));
  const hasRefund = (b.refund_type && b.refund_type !== 'none') || refundCents > 0;

  if (hasRefund && refundCents > 0) {
    return {
      bookingId: b.id,
      serviceName,
      proName,
      serviceDate: b.service_date,
      amountLabel: formatUsd(refundCents),
      amountCents: refundCents,
      phase: 'REFUND',
      status: 'refunded',
      statusLabel: 'Refunded',
    };
  }

  const totalCents =
    b.total_amount_cents != null && b.total_amount_cents > 0
      ? Math.round(Number(b.total_amount_cents))
      : centsFromMaybeDollarsOrCents(b.price);

  const depositCents =
    b.amount_deposit != null && b.amount_deposit > 0
      ? Math.round(Number(b.amount_deposit))
      : totalCents > 0
        ? Math.round(totalCents * 0.5)
        : 0;

  const depositPaid =
    Boolean(b.paid_deposit_at) ||
    ['deposit_paid', 'fully_paid', 'completed', 'in_progress', 'on_the_way', 'pro_en_route'].includes(st);
  const finalSt = norm(b.final_payment_status);
  const finalPaid =
    Boolean(b.fully_paid_at) || finalSt === 'paid' || st === 'fully_paid' || st === 'completed';
  const finalFailed = finalSt === 'failed';

  let phase = 'PAYMENT';
  if (depositPaid && finalPaid && totalCents > 0) phase = 'DEPOSIT + FINAL';
  else if (finalPaid && totalCents > 0) phase = 'FINAL PAYMENT';
  else if (depositPaid && !finalPaid) phase = 'DEPOSIT';
  else if (['payment_required', 'awaiting_deposit_payment'].includes(st)) phase = 'DEPOSIT';
  else if (['deposit_paid'].includes(st) && !finalPaid) phase = 'FINAL PAYMENT';

  let status: PaymentActivityStatus = 'pending';
  let statusLabel = 'Pending';
  if (st === 'cancelled' && !hasRefund) {
    statusLabel = 'Closed';
  }
  if (finalFailed) {
    status = 'failed';
    statusLabel = 'Failed';
  } else if (finalPaid || st === 'fully_paid' || st === 'completed') {
    status = 'paid';
    statusLabel = 'Paid';
  } else if (depositPaid && !finalPaid) {
    status = 'pending';
    statusLabel = 'Balance due';
  }

  const displayCents =
    totalCents > 0
      ? totalCents
      : depositCents > 0
        ? depositCents
        : centsFromMaybeDollarsOrCents(b.price);

  return {
    bookingId: b.id,
    serviceName,
    proName,
    serviceDate: b.service_date,
    amountLabel: displayCents > 0 ? formatUsd(displayCents) : '—',
    amountCents: displayCents,
    phase,
    status,
    statusLabel,
  };
}

export function bookingsToPaymentActivities(
  rows: Parameters<typeof bookingToPaymentActivityItem>[0][]
): PaymentActivityItem[] {
  return rows.map((r) => bookingToPaymentActivityItem(r));
}

export function sumPaidActivitiesForMonth(
  activities: PaymentActivityItem[],
  yearMonth: string
): { cents: number; label: string } {
  const [y, m] = yearMonth.split('-').map((x) => parseInt(x, 10));
  let cents = 0;
  for (const a of activities) {
    if (!a.serviceDate.startsWith(yearMonth)) continue;
    if (a.status !== 'paid') continue;
    cents += a.amountCents;
  }
  const monthName = Number.isFinite(m) ? new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long' }) : '';
  return {
    cents,
    label: monthName && Number.isFinite(y) ? `${monthName} ${y}` : yearMonth,
  };
}

export function countUniqueProsInMonth(
  rows: Array<{ service_date: string; pro_id: string }>,
  yearMonth: string
): number {
  const set = new Set<string>();
  for (const r of rows) {
    if (!r.service_date.startsWith(yearMonth)) continue;
    set.add(r.pro_id);
  }
  return set.size;
}

export type RefundRow = {
  bookingId: string;
  serviceName: string;
  proName: string;
  serviceDate: string;
  originalCents: number;
  refundedCents: number;
  reason: string | null;
  status: 'requested' | 'under_review' | 'approved' | 'processed' | 'denied';
  statusLabel: string;
  updatedAt: string | null;
};

export function bookingToRefundRow(b: {
  id: string;
  service_date: string;
  status: string;
  price: number | null;
  refund_type?: string | null;
  refund_amount_cents?: number | null;
  refunded_total_cents?: number | null;
  total_amount_cents?: number | null;
  pro: { displayName: string | null; serviceName?: string | null } | null;
}): RefundRow | null {
  const refundCents = Math.max(0, Math.round(Number(b.refunded_total_cents ?? b.refund_amount_cents ?? 0)));
  const hasRefund = Boolean(b.refund_type && b.refund_type !== 'none') || refundCents > 0;
  if (!hasRefund || refundCents <= 0) return null;

  const st = norm(b.status);
  let status: RefundRow['status'] = 'processed';
  let statusLabel = 'Processed';
  if (st === 'refund_pending') {
    status = 'under_review';
    statusLabel = 'Under review';
  } else if (st === 'disputed') {
    status = 'under_review';
    statusLabel = 'Under review';
  } else if (st === 'cancelled') {
    status = 'processed';
    statusLabel = 'Processed';
  }

  const totalCents =
    b.total_amount_cents != null && b.total_amount_cents > 0
      ? Math.round(Number(b.total_amount_cents))
      : centsFromMaybeDollarsOrCents(b.price);

  return {
    bookingId: b.id,
    serviceName: b.pro?.serviceName ?? 'Service',
    proName: b.pro?.displayName ?? 'Professional',
    serviceDate: b.service_date,
    originalCents: totalCents,
    refundedCents: refundCents,
    reason: b.refund_type ? String(b.refund_type).replace(/_/g, ' ') : null,
    status,
    statusLabel,
    updatedAt: null,
  };
}
