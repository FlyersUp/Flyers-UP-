/**
 * Customer-facing copy explaining how the work subtotal was derived (hourly, flat, hybrid).
 * Used by unified receipt + payment summary so hourly jobs don't look arbitrary vs $/hr on profiles.
 */

export type ReceiptSubtotalExplanationInput = {
  serviceSubtotalCents: number;
  chargeModel?: string | null;
  hourlySelected?: boolean | null;
  flatFeeSelected?: boolean | null;
  durationHours?: number | null;
  /** Booking snapshot — cents */
  hourlyRateCents?: number | null;
  minimumJobCents?: number | null;
  flatFeeCents?: number | null;
  baseFeeCents?: number | null;
  includedHours?: number | null;
  overageHourlyRateCents?: number | null;
  /** Pro profile `min_hours` when hourly path */
  proMinHours?: number | null;
  /** Fallback booked quantity when duration_hours missing */
  actualHoursEstimate?: number | null;
};

function fmtCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function hoursBooked(p: ReceiptSubtotalExplanationInput): number {
  const d = Number(p.durationHours ?? NaN);
  const e = Number(p.actualHoursEstimate ?? NaN);
  const raw = Number.isFinite(d) && d > 0 ? d : Number.isFinite(e) && e > 0 ? e : 0;
  return raw;
}

/**
 * Returns a single sentence/line for UI + HTML receipt, or null if we cannot say anything useful.
 */
export function computeReceiptSubtotalExplanation(
  p: ReceiptSubtotalExplanationInput
): string | null {
  const sub = Math.max(0, Math.round(p.serviceSubtotalCents));
  if (sub <= 0) return null;

  const model = String(p.chargeModel ?? '').toLowerCase();
  const hourlyOn = model === 'hourly' || (model === 'hybrid' && p.hourlySelected === true);
  const flatOn =
    model === 'flat' ||
    (model === 'hybrid' && p.flatFeeSelected === true && p.hourlySelected !== true);

  if (hourlyOn && p.hourlyRateCents != null && p.hourlyRateCents > 0) {
    const dur = hoursBooked(p);
    const minH = Math.max(0, Math.round(Number(p.proMinHours ?? 0)));
    const billedHours = dur > 0 ? Math.max(dur, minH > 0 ? minH : 0) : minH > 0 ? minH : 0;
    if (billedHours > 0) {
      const implied = Math.round(p.hourlyRateCents * billedHours);
      const rateLabel = `${fmtCents(p.hourlyRateCents)}/hr`;
      const qty = `${billedHours} ${billedHours === 1 ? 'hr' : 'hrs'} booked`;
      const minNote =
        minH > 0 && dur > 0 && dur < minH ? ` · minimum ${minH} hrs applies` : minH > 0 && dur <= 0 ? ` · minimum ${minH} hrs` : '';
      if (Math.abs(implied - sub) <= 200) {
        return `${rateLabel} × ${qty}${minNote} → ${fmtCents(sub)} work subtotal (before Flyers Up fees).`;
      }
      return `${rateLabel} × ${qty}${minNote}. Work subtotal on this booking: ${fmtCents(sub)} (before fees).`;
    }
  }

  if (model === 'flat_hourly') {
    const base = Math.max(0, Math.round(Number(p.baseFeeCents ?? 0)));
    const inc = Math.max(0, Number(p.includedHours ?? 0));
    const over = Math.max(0, Math.round(Number(p.overageHourlyRateCents ?? 0)));
    const dur = hoursBooked(p);
    if (base > 0 && inc > 0 && over > 0 && dur > inc) {
      const extra = dur - inc;
      return `Base ${fmtCents(base)} includes ${inc} hrs; ${extra.toFixed(1)} hrs overage at ${fmtCents(over)}/hr → ${fmtCents(sub)} work subtotal (before fees).`;
    }
    if (base > 0 && Math.abs(base - sub) <= 150) {
      return `Hybrid flat + hourly: base package ${fmtCents(sub)} work subtotal (before fees).`;
    }
  }

  if (p.minimumJobCents != null && p.minimumJobCents > 0 && sub === p.minimumJobCents) {
    return `Work subtotal is the ${fmtCents(p.minimumJobCents)} minimum job amount (before Flyers Up fees).`;
  }

  if (flatOn && p.flatFeeCents != null && p.flatFeeCents > 0 && Math.abs(p.flatFeeCents - sub) <= 150) {
    return `Flat work total ${fmtCents(sub)} (before Flyers Up fees).`;
  }

  return `Work subtotal ${fmtCents(sub)} is the locked booking labor amount before Flyers Up marketplace fees.`;
}

/** Balance still due on the final installment (split bookings), never the full-job aggregate. */
export function splitFinalScheduledDueCents(receipt: {
  remainingScheduledCents: number;
  remainingPaidCents: number;
}): number {
  return Math.max(0, receipt.remainingScheduledCents - receipt.remainingPaidCents);
}

/** Deposit not yet settled toward split schedule. */
export function splitDepositDueNowCents(receipt: {
  depositScheduledCents: number;
  depositPaidCents: number;
}): number {
  return Math.max(0, receipt.depositScheduledCents - receipt.depositPaidCents);
}
