/** Statuses where pro may replace the full milestone plan (all milestones still `pending`). */
export const MILESTONE_PLAN_EDIT_STATUSES = new Set([
  'accepted',
  'awaiting_deposit_payment',
  'deposit_due',
  'payment_required',
  'deposit_paid',
  'awaiting_pro_arrival',
  'pro_en_route',
  'on_the_way',
  'arrived',
]);

export function canProEditMilestonePlan(status: string): boolean {
  return MILESTONE_PLAN_EDIT_STATUSES.has(status);
}
